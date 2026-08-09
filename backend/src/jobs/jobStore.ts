import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import type { DesignBrief, DesignJob, MemoryProject } from '../types/genesis.js';

const DATA_DIR = process.env.JOBS_DATA_DIR || path.resolve(process.cwd(), 'data/jobs');
const INDEX_FILE = path.join(DATA_DIR, 'index.json');

async function ensureDir() {
  await mkdir(DATA_DIR, { recursive: true });
}

async function readIndex(): Promise<string[]> {
  try {
    const raw = await readFile(INDEX_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function writeIndex(ids: string[]) {
  await ensureDir();
  await writeFile(INDEX_FILE, JSON.stringify(ids.slice(0, 50), null, 2), 'utf-8');
}

function jobPath(id: string) {
  return path.join(DATA_DIR, `${id}.json`);
}

export async function createJobRecord(brief: DesignBrief): Promise<DesignJob> {
  await ensureDir();
  const id = `JOB-${Date.now().toString(36).toUpperCase()}-${randomUUID().slice(0, 4).toUpperCase()}`;
  const now = new Date().toISOString();
  const job: DesignJob = {
    id,
    status: 'queued',
    createdAt: now,
    updatedAt: now,
    brief,
    steps: [
      { id: 'requirements', label: 'Requirements agent', status: 'queued' },
      { id: 'benchmark', label: 'Benchmark agent', status: 'queued' },
      { id: 'plan', label: 'Planning agent', status: 'queued' },
      { id: 'cad', label: 'CAD agent', status: 'queued' },
      { id: 'evaluate', label: 'Evaluation agent', status: 'queued' },
      { id: 'review', label: 'Review agent', status: 'queued' },
    ],
    alternatives: [],
  };
  await writeFile(jobPath(id), JSON.stringify(job, null, 2), 'utf-8');
  const ids = await readIndex();
  ids.unshift(id);
  await writeIndex(ids);
  return job;
}

export async function getJob(id: string): Promise<DesignJob | null> {
  try {
    const raw = await readFile(jobPath(id), 'utf-8');
    return JSON.parse(raw) as DesignJob;
  } catch {
    return null;
  }
}

export async function saveJob(job: DesignJob): Promise<void> {
  job.updatedAt = new Date().toISOString();
  await ensureDir();
  await writeFile(jobPath(job.id), JSON.stringify(job, null, 2), 'utf-8');
}

export async function listMemory(): Promise<MemoryProject[]> {
  const ids = await readIndex();
  const projects: MemoryProject[] = [];
  for (const id of ids) {
    const job = await getJob(id);
    if (!job || job.status !== 'done') continue;
    projects.push({
      jobId: job.id,
      createdAt: job.createdAt,
      application: job.brief.application,
      bestScore: job.alternatives[0]?.score ?? 0,
      alternativeCount: job.alternatives.length,
      hasStl: job.alternatives.some((a) => !!a.stlUrl),
    });
  }
  return projects;
}
