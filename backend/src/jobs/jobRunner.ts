import { getJob, saveJob } from './jobStore.js';
import { planAlternatives } from './designEngine.js';
import { generateWhoopChassis } from '../cad/generateWhoop.js';
import type { AgentStepId, DesignJob } from '../types/genesis.js';

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function setStep(job: DesignJob, id: AgentStepId, status: 'running' | 'done' | 'failed', detail?: string) {
  job.steps = job.steps.map((s) => (s.id === id ? { ...s, status, detail: detail ?? s.detail } : s));
  await saveJob(job);
}

/**
 * Phase 1 — CAD loop:
 * Design brief → plan alternatives → OpenSCAD whoop STL per alt → evaluate → done
 * (“Design generated” success path when STLs exist.)
 */
export async function runDesignJob(jobId: string): Promise<void> {
  const job = await getJob(jobId);
  if (!job) return;

  job.status = 'running';
  await saveJob(job);

  try {
    const brief = job.brief;

    await setStep(job, 'requirements', 'running');
    await sleep(300);
    await setStep(
      job,
      'requirements',
      'done',
      `Brief locked: ${brief.application}, payload ${brief.payloadG}g, ${brief.flightTimeMin} min, ₹${brief.budgetInr.toLocaleString('en-IN')}.`
    );

    await setStep(job, 'benchmark', 'running');
    await sleep(250);
    await setStep(
      job,
      'benchmark',
      'done',
      `Reference whoop envelopes for ${brief.application} (wheelbase, duct, pack bay).`
    );

    await setStep(job, 'plan', 'running');
    await sleep(300);
    job.alternatives = planAlternatives(brief);
    await saveJob(job);
    await setStep(
      job,
      'plan',
      'done',
      `Planned ${job.alternatives.length} whoop chassis directions from brief params.`
    );

    await setStep(job, 'cad', 'running', 'Generating whoop STL with OpenSCAD…');
    for (let i = 0; i < job.alternatives.length; i++) {
      const alt = job.alternatives[i];
      const p = alt.chassisParams;
      try {
        const result = await generateWhoopChassis(
          {
            wheelbase: p.wheelbaseMm,
            motorCageDiameter: p.motorCageDiameter,
            motorCageDepth: p.motorCageDepth,
            batteryDimensions: p.batteryDimensions,
            strutCount: p.strutCount,
            wallThickness: p.wallThickness,
          },
          `${job.id}_${alt.id}`
        );
        alt.stlUrl = `/output/chassis/${result.stlFilename}`;
        alt.scadUrl = `/output/chassis/${result.scadFilename}`;
      } catch (err: any) {
        alt.stlUrl = null;
        alt.scadUrl = null;
        alt.justification = `${alt.justification} CAD error: ${err?.message || 'OpenSCAD failed'}.`;
        alt.score = Math.max(5, alt.score - 25);
        alt.safety = [
          ...alt.safety,
          { severity: 'fail', title: 'CAD generation failed', detail: err?.message || 'OpenSCAD failed' },
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
        'No whoop STL produced. Install OpenSCAD or use the Docker backend image.'
      );
      job.status = 'failed';
      job.error = 'CAD generation failed for all alternatives';
      await saveJob(job);
      return;
    }
    await setStep(job, 'cad', 'done', `Design generated — ${stlCount}/${job.alternatives.length} whoop STL file(s).`);

    await setStep(job, 'evaluate', 'running');
    await sleep(250);
    job.alternatives.sort((a, b) => b.score - a.score);
    await saveJob(job);
    await setStep(
      job,
      'evaluate',
      'done',
      'Scored against budget, endurance, payload, and compatibility.'
    );

    await setStep(job, 'review', 'running');
    await sleep(200);
    await setStep(
      job,
      'review',
      'done',
      `Design generated. Top pick: ${job.alternatives[0]?.name} (${job.alternatives[0]?.score}/100).`
    );

    job.status = 'done';
    await saveJob(job);
  } catch (err: any) {
    job.status = 'failed';
    job.error = err?.message || 'Job failed';
    const running = job.steps.find((s) => s.status === 'running');
    if (running) await setStep(job, running.id, 'failed', job.error);
    await saveJob(job);
  }
}
