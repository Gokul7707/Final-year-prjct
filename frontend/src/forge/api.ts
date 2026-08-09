import type { DesignBrief, DesignJob, MemoryProject } from './types';

export async function createJob(brief: DesignBrief): Promise<{ id: string }> {
  const res = await fetch('/api/jobs', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(brief),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to create job');
  }
  return res.json();
}

export async function getJob(id: string): Promise<DesignJob> {
  const res = await fetch(`/api/jobs/${id}`);
  if (!res.ok) throw new Error('Job not found');
  return res.json();
}

export async function exportJob(id: string, alternativeId: string) {
  const res = await fetch(`/api/jobs/${id}/export`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ alternativeId }),
  });
  if (!res.ok) throw new Error('Export failed');
  return res.json() as Promise<{
    stlUrl: string | null;
    scadUrl: string | null;
    reportMarkdown: string;
    bom: { label: string; detail: string; price: number }[];
    specs: Record<string, number>;
  }>;
}

export async function getMemory(): Promise<MemoryProject[]> {
  const res = await fetch('/api/memory');
  if (!res.ok) return [];
  return res.json();
}
