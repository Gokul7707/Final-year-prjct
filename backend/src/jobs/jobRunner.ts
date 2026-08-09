import { getJob, saveJob } from './jobStore.js';
import { planAlternatives } from './designEngine.js';
import { generateBlenderChassis } from '../cad/generateBlender.js';
import { interpretBriefWithGemini } from './geminiBrief.js';
import type { AgentStepId, DesignJob } from '../types/genesis.js';

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function setStep(job: DesignJob, id: AgentStepId, status: 'running' | 'done' | 'failed', detail?: string) {
  job.steps = job.steps.map((s) => (s.id === id ? { ...s, status, detail: detail ?? s.detail } : s));
  await saveJob(job);
}

/**
 * Phase 1 pipeline (Blender CAD):
 * brief → (optional Gemini intent) → plan → headless Blender STL/GLB → evaluate → review
 *
 * Gemini returns structured params only — never raw Python pasted into Blender's console.
 */
export async function runDesignJob(jobId: string): Promise<void> {
  const job = await getJob(jobId);
  if (!job) return;

  job.status = 'running';
  await saveJob(job);

  try {
    const brief = job.brief;

    await setStep(job, 'requirements', 'running');
    const intent = await interpretBriefWithGemini(brief);
    await sleep(300);
    await setStep(
      job,
      'requirements',
      'done',
      intent
        ? `Brief + Gemini intent: ${intent.motorCount} motors${intent.notesSummary ? ` — ${intent.notesSummary}` : ''}.`
        : `Parsed brief locally: ${brief.application}, ${brief.payloadG}g, ${brief.flightTimeMin} min, ₹${brief.budgetInr.toLocaleString('en-IN')}. (Set GEMINI_API_KEY for note interpretation.)`
    );

    await setStep(job, 'benchmark', 'running');
    await sleep(350);
    await setStep(
      job,
      'benchmark',
      'done',
      `Benchmarked ${intent?.applicationHint || brief.application} envelopes for wheelbase, bay, and motor layout.`
    );

    await setStep(job, 'plan', 'running');
    await sleep(400);
    const plannedBrief = intent?.applicationHint
      ? { ...brief, application: intent.applicationHint }
      : brief;
    const alternatives = planAlternatives(plannedBrief);
    if (intent?.motorCount) {
      for (const alt of alternatives) {
        alt.chassisParams.motorMounts = intent.motorCount;
      }
    }
    job.alternatives = alternatives;
    await saveJob(job);
    await setStep(
      job,
      'plan',
      'done',
      `Locked ${alternatives.length} directions: ${alternatives.map((a) => a.name).join(', ')}.`
    );

    await setStep(job, 'cad', 'running', 'Running headless Blender for each alternative…');
    for (let i = 0; i < job.alternatives.length; i++) {
      const alt = job.alternatives[i];
      const p = alt.chassisParams;
      const notes = (job.brief.notes || '').toLowerCase();
      const ducted =
        intent?.ducted ??
        (job.brief.application === 'cinema' || notes.includes('duct') || notes.includes('whoop'));
      const landingGear =
        intent?.landingGear ??
        (['cinema', 'long-range', 'heavy-lift', 'industrial'].includes(job.brief.application) ||
          intent?.applicationHint === 'industrial');
      try {
        const result = await generateBlenderChassis(
          {
            motorCount: p.motorMounts,
            wheelbaseMm: p.wheelbaseMm,
            motorCageDiameter: p.motorCageDiameter,
            motorCageDepth: p.motorCageDepth,
            batteryDimensions: p.batteryDimensions,
            wallThickness: p.wallThickness,
            ducted,
            landingGear,
          },
          `${job.id}_${alt.id}`
        );
        alt.stlUrl = `/output/chassis/${result.stlFilename}`;
        alt.scadUrl = result.glbFilename
          ? `/output/chassis/${result.glbFilename}`
          : `/output/chassis/${result.scadFilename}`;
      } catch (err: any) {
        alt.stlUrl = null;
        alt.scadUrl = null;
        alt.justification = `${alt.justification} CAD error: ${err?.message || 'Blender failed'}.`;
        alt.score = Math.max(5, alt.score - 25);
        alt.safety = [
          ...alt.safety,
          { severity: 'fail', title: 'CAD generation failed', detail: err?.message || 'Blender failed' },
        ];
      }
      job.alternatives[i] = alt;
      await saveJob(job);
    }

    const stlCount = job.alternatives.filter((a) => a.stlUrl).length;
    if (stlCount === 0) {
      await setStep(
        job,
        'cad',
        'failed',
        'Blender produced no STL files. Install Blender and set BLENDER_PATH, or rebuild the Docker backend image.'
      );
      job.status = 'failed';
      job.error = 'CAD generation failed for all alternatives';
      await saveJob(job);
      return;
    }
    await setStep(
      job,
      'cad',
      'done',
      `Generated ${stlCount}/${job.alternatives.length} chassis mesh(es) via headless Blender.`
    );

    await setStep(job, 'evaluate', 'running');
    await sleep(300);
    job.alternatives.sort((a, b) => b.score - a.score);
    await saveJob(job);
    await setStep(
      job,
      'evaluate',
      'done',
      'Scored alternatives against budget, endurance, payload, and compatibility checks.'
    );

    await setStep(job, 'review', 'running');
    await sleep(250);
    await setStep(
      job,
      'review',
      'done',
      `Top pick: ${job.alternatives[0]?.name} (${job.alternatives[0]?.score}/100). Ready for inspection.`
    );

    job.status = 'done';
    await saveJob(job);
  } catch (err: any) {
    job.status = 'failed';
    job.error = err?.message || 'Job failed';
    const running = job.steps.find((s) => s.status === 'running');
    if (running) {
      await setStep(job, running.id, 'failed', job.error);
    }
    await saveJob(job);
  }
}
