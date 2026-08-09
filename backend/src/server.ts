import express, { Express, NextFunction, Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { droneFrames, motors, batteries, propellers, escs } from './shared/database.js';
import { calculateDroneSpecs, generateBOM } from './shared/calculator.js';
import type { DroneConfig } from './shared/types.js';
import { generateWhoopChassis, PRESETS, OUTPUT_DIR, PROJECT_ROOT } from './cad/generateWhoop.js';
import { createJobRecord, getJob, listMemory } from './jobs/jobStore.js';
import { runDesignJob } from './jobs/jobRunner.js';
import type { DesignBrief } from './types/genesis.js';

dotenv.config();

const app: Express = express();
const PORT = process.env.PORT || 5000;

// Middleware — allow hangar Vite ports (5173/5174) + forge
const corsOrigins = (process.env.CORS_ORIGIN || 'http://localhost:5173,http://localhost:5174')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);
app.use(cors({
  origin: (origin, cb) => {
    if (!origin || corsOrigins.includes(origin) || corsOrigins.includes('*')) return cb(null, true);
    return cb(null, corsOrigins[0]);
  },
  credentials: true,
}));
app.use(express.json());

// Handle malformed JSON bodies from clients.
// Without this, `express.json()` throws and logs a stack trace.
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  if (err?.type === 'entity.parse.failed' || err instanceof SyntaxError) {
    console.warn('Bad JSON request body', {
      method: req.method,
      url: req.originalUrl,
      ip: req.ip,
    });
    return res.status(400).json({ error: 'Invalid JSON body' });
  }
  return next(err);
});

// Initialize Gemini client
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
const modelName = process.env.GEMINI_MODEL || 'gemini-2.5-pro';
const model = genAI.getGenerativeModel({ model: modelName });
console.log(`Using Gemini model: ${modelName}`);

// Health check
app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', message: 'DroneForge API is running' });
});

// Get all available parts
app.get('/api/parts', (req: Request, res: Response) => {
  res.json({
    frames: droneFrames,
    motors,
    batteries,
    propellers,
    escs,
  });
});

// Calculate drone specs
app.post('/api/calculate-specs', (req: Request, res: Response) => {
  try {
    const config: DroneConfig = req.body;
    const specs = calculateDroneSpecs(config);
    res.json(specs);
  } catch (error) {
    res.status(400).json({ error: 'Invalid configuration' });
  }
});

// Generate BOM
app.post('/api/generate-bom', (req: Request, res: Response) => {
  try {
    const config: DroneConfig = req.body;
    const bom = generateBOM(config);
    res.json({ bom });
  } catch (error) {
    res.status(400).json({ error: 'Failed to generate BOM' });
  }
});

// AI Chat endpoint
app.post('/api/chat', async (req: Request, res: Response) => {
  try {
    const { messages, droneConfig } = req.body;

    // Build system prompt with parts catalog context
    const partsContext = `You are DroneForge AI, an expert drone builder assistant. You have knowledge of these available drone components:

FRAMES:
${droneFrames.map((f: any) => `- ${f.name} (${f.type}, ${f.motorMounts} motors, ${f.weight}g, ₹${f.price})`).join('\n')}

MOTORS:
${motors.map((m: any) => `- ${m.name} (${m.kv}KV, ${m.thrustMax}g thrust, ₹${m.price})`).join('\n')}

BATTERIES:
${batteries.map((b: any) => `- ${b.name} (${b.capacity}mAh ${b.cells}S, ₹${b.price})`).join('\n')}

PROPELLERS:
${propellers.map((p: any) => `- ${p.name} (${p.diameter}x${p.pitch}, ₹${p.price})`).join('\n')}

ESCs:
${escs.map((e: any) => `- ${e.name} (${e.ampRating}A, ${e.protocol}, ₹${e.price})`).join('\n')}

When users describe a drone they want:
1. Suggest specific parts from the catalog above
2. Explain your choices
3. Focus on balance between performance, weight, cost, and the user's use case
4. Always recommend parts that actually exist in the catalog

Current drone config: ${JSON.stringify(droneConfig, null, 2)}`;

    // Format conversation for Gemini
    let conversationHistory = partsContext;
    messages.forEach((msg: any) => {
      conversationHistory += `\n\n${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`;
    });

    const result = await model.generateContent(conversationHistory);
    const aiResponse = result.response.text();

    res.json({
      message: aiResponse,
      suggestions: extractSuggestions(aiResponse),
    });
  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({ error: 'Failed to process chat request' });
  }
});

// AI Drone builder endpoint - full build from prompt
app.post('/api/ai-build-drone', async (req: Request, res: Response) => {
  try {
    const { prompt } = req.body;

    const systemPrompt = `You are an expert drone builder AI. Given a user's description of what drone they want to build, suggest a complete drone configuration.

Available components:
${JSON.stringify({
  frames: droneFrames.map((f: any) => ({ id: f.id, name: f.name, type: f.type, price: f.price })),
  motors: motors.map((m: any) => ({ id: m.id, name: m.name, kv: m.kv, price: m.price })),
  batteries: batteries.map((b: any) => ({ id: b.id, name: b.name, capacity: b.capacity, price: b.price })),
  propellers: propellers.map((p: any) => ({ id: p.id, name: p.name, size: `${p.diameter}x${p.pitch}`, price: p.price })),
  escs: escs.map((e: any) => ({ id: e.id, name: e.name, ampRating: e.ampRating, price: e.price })),

}, null, 2)}

IMPORTANT: Always respond with a JSON object containing your recommendations like this:
{
  "analysis": "Your explanation of why these components work well together",
  "recommendations": {
    "frame": "frame-id",
    "motors": ["motor-id"],
    "battery": "battery-id",
    "propellers": ["propeller-id"],
    "escs": ["esc-id"]
  },
  "reasoning": "Detailed reasoning for each component"
}`;

    const userPrompt = `${systemPrompt}\n\nBuild me a drone with these specs: ${prompt}`;
    const result = await model.generateContent(userPrompt);
    const responseText = result.response.text();

    // Parse JSON response
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    const droneConfig = jsonMatch ? JSON.parse(jsonMatch[0]) : null;

    res.json({
      success: !!droneConfig,
      config: droneConfig,
      rawResponse: responseText,
    });
  } catch (error) {
    console.error('AI build drone error:', error);
    res.status(500).json({ error: 'Failed to build drone configuration' });
  }
});

// Extract suggestions from AI response
function extractSuggestions(response: string): string[] {
  const suggestions: string[] = [];
  
  // Look for common patterns
  const patterns = [
    /(?:suggest|recommend|improve|upgrade|change|replace).*?(?:to|with).*?\$?([\w\s\-\.]+)/gi,
    /(?:suggest|recommend|upgrade|change|improve)\s+(?:the\s+)?(\w+)/gi,
  ];

  patterns.forEach(pattern => {
    let match;
    while ((match = pattern.exec(response)) !== null) {
      suggestions.push(match[1].trim());
    }
  });

  return suggestions.slice(0, 5); // Return top 5 suggestions
}

// Compare drone with market alternatives
app.post('/api/compare-drone', (req: Request, res: Response) => {
  try {
    const { specs } = req.body;

    // Simulated market drones data
    const marketDrones = [
      {
        id: 'market-dji-mini4',
        name: 'DJI Mini 4 Pro',
        manufacturer: 'DJI',
        type: 'quad' as const,
        weight: 249,
        maxFlightTime: 34,
        maxSpeed: 57.6,
        price: 299000,
        maxPayload: 200,
      },
      {
        id: 'market-dji-air3',
        name: 'DJI Air 3',
        manufacturer: 'DJI',
        type: 'quad' as const,
        weight: 907,
        maxFlightTime: 46,
        maxSpeed: 75.6,
        price: 749000,
        maxPayload: 900,
      },
      {
        id: 'market-auterion-skyway',
        name: 'Auterion Skyway',
        manufacturer: 'Auterion',
        type: 'quad' as const,
        weight: 1800,
        maxFlightTime: 55,
        maxSpeed: 80,
        price: 2500000,
        maxPayload: 5000,
      },
    ];

    // Calculate efficiency score
    const efficiencyScore = (specs.thrustToWeight * 0.3 + (specs.estimatedFlightTime / 60) * 0.3 + (specs.maxSpeed / 100) * 0.2) * 100;

    const comparison = {
      userDrone: specs,
      marketDrones: marketDrones.map(drone => ({
        ...drone,
        comparisonScore: calculateComparisonScore(specs, drone),
      })),
      efficiency: {
        score: Math.round(efficiencyScore),
        rating: efficiencyScore > 80 ? 'excellent' : efficiencyScore > 60 ? 'good' : efficiencyScore > 40 ? 'average' : 'poor',
        recommendations: generateRecommendations(specs, efficiencyScore),
      },
    };

    res.json(comparison);
  } catch (error) {
    console.error('Comparison error:', error);
    res.status(500).json({ error: 'Failed to compare drone' });
  }
});

function calculateComparisonScore(userSpecs: any, marketDrone: any): number {
  const weightRatio = Math.min(userSpecs.totalWeight / marketDrone.weight, 1) * 25;
  const thrustRatio = Math.min(userSpecs.maxThrust / (marketDrone.weight * 3), 1) * 25;
  const flightTimeRatio = Math.min(userSpecs.estimatedFlightTime / marketDrone.maxFlightTime, 1) * 25;
  const speedRatio = Math.min(userSpecs.maxSpeed / marketDrone.maxSpeed, 1) * 25;

  return Math.round((weightRatio + thrustRatio + flightTimeRatio + speedRatio) / 4);
}

function generateRecommendations(specs: any, score: number): string[] {
  const recommendations: string[] = [];

  if (specs.thrustToWeight < 3) {
    recommendations.push('Upgrade motors or reduce weight for better acceleration');
  }
  if (specs.estimatedFlightTime < 10) {
    recommendations.push('Consider a larger battery for extended flight time');
  }
  if (specs.maxSpeed < 40) {
    recommendations.push('Upgrade motors for higher speed performance');
  }
  if (specs.buildCost > 50000) {
    recommendations.push('Consider balancing features to reduce overall cost');
  }

  return recommendations;
}

// Generate parametric whoop chassis via OpenSCAD
app.post('/api/generate-chassis', async (req: Request, res: Response) => {
  try {
    const { preset, wheelbase, motorCageDiameter, motorCageDepth, batteryDimensions, strutCount, wallThickness } =
      req.body;

    const params =
      preset && PRESETS[preset]
        ? preset
        : {
            wheelbase,
            motorCageDiameter,
            motorCageDepth,
            batteryDimensions,
            strutCount,
            wallThickness,
          };

    const result = await generateWhoopChassis(params);
    const stlFilename = path.basename(result.stlPath);

    res.json({
      message: 'Chassis generated successfully',
      preset: typeof params === 'string' ? params : undefined,
      params: result.params,
      stlUrl: `/output/chassis/${stlFilename}`,
      scadPath: result.scadPath,
      stlPath: result.stlPath,
    });
  } catch (error: any) {
    console.error('Chassis generation error:', error);
    res.status(500).json({
      error: 'Failed to generate chassis',
      details: error?.message ?? 'Unknown error',
    });
  }
});

// —— Phase 1 job API (brief → CAD → alternatives)
app.get('/api/catalog', (_req: Request, res: Response) => {
  res.json({ frames: droneFrames, motors, batteries, propellers, escs });
});

app.post('/api/jobs', async (req: Request, res: Response) => {
  try {
    const brief = req.body as DesignBrief;
    if (!brief?.application) {
      return res.status(400).json({ error: 'DesignBrief.application is required' });
    }
    const job = await createJobRecord({
      application: brief.application,
      payloadG: Number(brief.payloadG) || 0,
      flightTimeMin: Number(brief.flightTimeMin) || 5,
      budgetInr: Number(brief.budgetInr) || 30000,
      material: brief.material || 'carbon',
      manufacturing: brief.manufacturing || '3d-print',
      notes: brief.notes || '',
    });
    // Fire-and-forget runner — client polls GET /api/jobs/:id
    void runDesignJob(job.id);
    return res.status(201).json({ id: job.id });
  } catch (error: any) {
    console.error('Create job error:', error);
    return res.status(500).json({ error: 'Failed to create job', details: error?.message });
  }
});

app.get('/api/jobs/:id', async (req: Request, res: Response) => {
  const job = await getJob(req.params.id);
  if (!job) return res.status(404).json({ error: 'Job not found' });
  return res.json(job);
});

app.post('/api/jobs/:id/export', async (req: Request, res: Response) => {
  const job = await getJob(req.params.id);
  if (!job) return res.status(404).json({ error: 'Job not found' });
  const altId = req.body?.alternativeId || job.alternatives[0]?.id;
  const alt = job.alternatives.find((a) => a.id === altId) || job.alternatives[0];
  if (!alt) return res.status(400).json({ error: 'No alternatives on this job' });

  const report = `# GenesisAI Design Report — ${alt.name}

Job: ${job.id}
Generated: ${new Date().toISOString()}
Application: ${job.brief.application}

## Justification
${alt.justification}

## Chassis parameters
- Wheelbase: ${alt.chassisParams.wheelbaseMm} mm
- Motor cage Ø: ${alt.chassisParams.motorCageDiameter} mm
- Wall thickness: ${alt.chassisParams.wallThickness} mm
- Material: ${alt.chassisParams.material}
- Manufacturing: ${alt.chassisParams.manufacturing}

## Specifications
- Weight: ${alt.specs.totalWeight} g
- Max thrust: ${alt.specs.maxThrust} g
- T/W: ${alt.specs.thrustToWeight}
- Hover time: ${alt.specs.estimatedFlightTime} min
- Max speed: ${alt.specs.maxSpeed} km/h
- Build cost: ₹${alt.specs.buildCost}

## Bill of materials
${alt.bom.map((l) => `- ${l.label}: ${l.detail} — ₹${l.price}`).join('\n')}

## Safety
${alt.safety.map((s) => `- [${s.severity.toUpperCase()}] ${s.title} — ${s.detail}`).join('\n')}

## Artifacts
- STL: ${alt.stlUrl || 'not generated'}
- SCAD: ${alt.scadUrl || 'not generated'}
`;

  return res.json({
    alternativeId: alt.id,
    stlUrl: alt.stlUrl,
    scadUrl: alt.scadUrl,
    reportMarkdown: report,
    bom: alt.bom,
    specs: alt.specs,
  });
});

app.get('/api/memory', async (_req: Request, res: Response) => {
  const projects = await listMemory();
  res.json(projects);
});

// Serve generated STL/SCAD (project output/)
app.use('/output', express.static(path.resolve(PROJECT_ROOT, 'output')));

// Start server
app.listen(PORT, () => {
  console.log(`\n🚁 GenesisAI API on http://localhost:${PORT}`);
  console.log(`   PROJECT_ROOT=${PROJECT_ROOT}`);
  console.log(`   OUTPUT_DIR=${OUTPUT_DIR}`);
  console.log(`   GET  /health`);
  console.log(`   GET  /api/catalog`);
  console.log(`   POST /api/jobs`);
  console.log(`   GET  /api/jobs/:id`);
  console.log(`   POST /api/jobs/:id/export`);
  console.log(`   GET  /api/memory`);
  console.log(`   POST /api/generate-chassis`);
  console.log(`   Phase 1 CAD: OpenSCAD whoop STL (OPENSCAD_PATH / WHOOP_SCAD)`);
  console.log('');
});
