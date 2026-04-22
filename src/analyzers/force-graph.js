export function computeForceLayout(nodes, edges, { width = 900, height = 520, iterations = 180 } = {}) {
  if (nodes.length === 0) return [];
  const n = nodes.length;
  const area = width * height;
  const k = Math.sqrt(area / n) * 0.85;
  const k2 = k * k;

  const edgeMap = new Map(nodes.map(node => [node.id, []]));
  for (const e of edges) {
    if (edgeMap.has(e.source) && edgeMap.has(e.target)) {
      edgeMap.get(e.source).push({ other: e.target, weight: e.weight ?? 1 });
      edgeMap.get(e.target).push({ other: e.source, weight: e.weight ?? 1 });
    }
  }

  const state = nodes.map((node, i) => {
    const angle = (i / n) * Math.PI * 2;
    const r = Math.min(width, height) * 0.3;
    return {
      id: node.id,
      x: width / 2 + Math.cos(angle) * r + (Math.random() - 0.5) * 40,
      y: height / 2 + Math.sin(angle) * r + (Math.random() - 0.5) * 40,
      dx: 0,
      dy: 0,
    };
  });
  const idx = new Map(state.map((s, i) => [s.id, i]));

  let t = width / 10;
  const cool = (initial, step) => initial * (1 - step / iterations);

  for (let step = 0; step < iterations; step++) {
    for (const s of state) { s.dx = 0; s.dy = 0; }

    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const a = state[i];
        const b = state[j];
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        const distSq = dx * dx + dy * dy + 0.01;
        const force = k2 / distSq;
        const dist = Math.sqrt(distSq);
        const fx = (dx / dist) * force;
        const fy = (dy / dist) * force;
        a.dx += fx; a.dy += fy;
        b.dx -= fx; b.dy -= fy;
      }
    }

    for (const e of edges) {
      const i = idx.get(e.source);
      const j = idx.get(e.target);
      if (i == null || j == null) continue;
      const a = state[i];
      const b = state[j];
      const dx = a.x - b.x;
      const dy = a.y - b.y;
      const dist = Math.sqrt(dx * dx + dy * dy) + 0.01;
      const weight = (e.weight ?? 1);
      const force = (dist * dist) / k * Math.log(weight + 1);
      const fx = (dx / dist) * force;
      const fy = (dy / dist) * force;
      a.dx -= fx; a.dy -= fy;
      b.dx += fx; b.dy += fy;
    }

    const temp = cool(t, step);
    for (const s of state) {
      const mag = Math.sqrt(s.dx * s.dx + s.dy * s.dy) + 0.01;
      const capped = Math.min(mag, temp);
      s.x += (s.dx / mag) * capped;
      s.y += (s.dy / mag) * capped;
      s.x = Math.max(20, Math.min(width - 20, s.x));
      s.y = Math.max(20, Math.min(height - 20, s.y));
    }
  }

  return state.map(s => ({ id: s.id, x: s.x, y: s.y }));
}
