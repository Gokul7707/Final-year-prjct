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
 * Brief → plan/score alternatives → OpenSCAD STL for top pick → “Design generated”
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
    job.alternatives = await planAlternatives(brief);
    job.alternatives.sort((a, b) => b.score - a.score);
    await saveJob(job);
    await setStep(
      job,
      'plan',
      'done',
      `Planned ${job.alternatives.length} whoop chassis directions; ranked by brief fit.`
    );

    await setStep(job, 'evaluate', 'running');
    await sleep(250);
    await setStep(
      job,
      'evaluate',
      'done',
      `Top pick: ${job.alternatives[0]?.name} (${job.alternatives[0]?.score}/100). Generating CAD for that frame.`
    );

    await setStep(job, 'cad', 'running', 'OpenSCAD generating whoop STL for top pick (~20–60s)…');
    const top = job.alternatives[0];
    if (!top) {
      await setStep(job, 'cad', 'failed', 'No alternatives planned.');
      job.status = 'failed';
      job.error = 'No design alternatives';
      await saveJob(job);
      return;
    }

    const p = top.chassisParams;
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
        `${job.id}_${top.id}`
      );
      top.stlUrl = `/output/chassis/${result.stlFilename}`;
      top.scadUrl = `/output/chassis/${result.scadFilename}`;
      job.alternatives[0] = top;
      await saveJob(job);
      await setStep(job, 'cad', 'done', `Design generated — whoop STL for ${top.name}.`);
    } catch (err: any) {
      top.stlUrl = null;
      top.scadUrl = null;
      top.justification = `${top.justification} CAD error: ${err?.message || 'OpenSCAD failed'}.`;
      top.score = Math.max(5, top.score - 25);
      top.safety = [
        ...top.safety,
        { severity: 'fail', title: 'CAD generation failed', detail: err?.message || 'OpenSCAD failed' },
      ];
      job.alternatives[0] = top;
      await setStep(
        job,
        'cad',
        'failed',
        'No whoop STL produced. Install OpenSCAD or use Docker Compose (backend image).'
      );
      job.status = 'failed';
      job.error = err?.message || 'CAD generation failed';
      await saveJob(job);
      return;
    }

    await setStep(job, 'review', 'running');
    await sleep(200);
    await setStep(
      job,
      'review',
      'done',
      `Design generated. Inspect ${top.name} STL · ${job.alternatives.length - 1} scored alternative(s) listed.`
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
