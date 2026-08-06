/** Minimal ASCII STL generator for a printable chassis slab (client-side fallback). */
function facet(
  n: [number, number, number],
  a: [number, number, number],
  b: [number, number, number],
  c: [number, number, number]
) {
  return `  facet normal ${n[0]} ${n[1]} ${n[2]}
    outer loop
      vertex ${a[0]} ${a[1]} ${a[2]}
      vertex ${b[0]} ${b[1]} ${b[2]}
      vertex ${c[0]} ${c[1]} ${c[2]}
    endloop
  endfacet`;
}

function box(x0: number, y0: number, z0: number, x1: number, y1: number, z1: number) {
  const v = {
    a: [x0, y0, z0] as [number, number, number],
    b: [x1, y0, z0] as [number, number, number],
    c: [x1, y1, z0] as [number, number, number],
    d: [x0, y1, z0] as [number, number, number],
    e: [x0, y0, z1] as [number, number, number],
    f: [x1, y0, z1] as [number, number, number],
    g: [x1, y1, z1] as [number, number, number],
    h: [x0, y1, z1] as [number, number, number],
  };
  return [
    facet([0, 0, -1], v.a, v.c, v.b),
    facet([0, 0, -1], v.a, v.d, v.c),
    facet([0, 0, 1], v.e, v.f, v.g),
    facet([0, 0, 1], v.e, v.g, v.h),
    facet([0, -1, 0], v.a, v.b, v.f),
    facet([0, -1, 0], v.a, v.f, v.e),
    facet([0, 1, 0], v.d, v.h, v.g),
    facet([0, 1, 0], v.d, v.g, v.c),
    facet([-1, 0, 0], v.a, v.e, v.h),
    facet([-1, 0, 0], v.a, v.h, v.d),
    facet([1, 0, 0], v.b, v.c, v.g),
    facet([1, 0, 0], v.b, v.g, v.f),
  ].join('\n');
}

export function generateChassisSTL(opts: {
  name: string;
  armLength: number;
  motorMounts: number;
}): string {
  const half = Math.max(40, opts.armLength / 2);
  const thick = 3;
  const armW = 8;
  const hub = 28;
  const parts: string[] = [];

  // Center hub
  parts.push(box(-hub / 2, -hub / 2, 0, hub / 2, hub / 2, thick));

  // Arms
  const mounts = Math.max(3, Math.min(8, opts.motorMounts || 4));
  for (let i = 0; i < mounts; i++) {
    const angle = (i / mounts) * Math.PI * 2 + Math.PI / mounts;
    const x = Math.cos(angle) * half;
    const y = Math.sin(angle) * half;
    // Approximate arm as box along axis
    const dx = Math.cos(angle);
    const dy = Math.sin(angle);
    const len = half - hub / 2;
    const mx = dx * (hub / 2 + len / 2);
    const my = dy * (hub / 2 + len / 2);
    // Simple radial slab via rotated AABB approximation
    parts.push(
      box(mx - armW / 2, my - armW / 2, 0, mx + armW / 2, my + armW / 2, thick)
    );
    // Motor pad
    parts.push(box(x - 10, y - 10, 0, x + 10, y + 10, thick + 1.5));
  }

  return `solid ${opts.name.replace(/\s+/g, '_')}_chassis
${parts.join('\n')}
endsolid ${opts.name.replace(/\s+/g, '_')}_chassis
`;
}

export function downloadSTL(content: string, filename: string) {
  const blob = new Blob([content], { type: 'model/stl' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export async function tryServerSTL(preset: string): Promise<string | null> {
  try {
    const res = await fetch('/api/generate-chassis', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ preset }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (!data.stlUrl) return null;
    const stlRes = await fetch(data.stlUrl);
    if (!stlRes.ok) return null;
    return await stlRes.text();
  } catch {
    return null;
  }
}
