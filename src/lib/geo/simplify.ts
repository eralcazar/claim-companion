// Douglas-Peucker polyline simplification for lat/lng arrays.
type P = { latitude: number; longitude: number };

function perpDist(pt: P, a: P, b: P): number {
  const x = pt.longitude, y = pt.latitude;
  const x1 = a.longitude, y1 = a.latitude;
  const x2 = b.longitude, y2 = b.latitude;
  const dx = x2 - x1, dy = y2 - y1;
  if (dx === 0 && dy === 0) {
    const ex = x - x1, ey = y - y1;
    return Math.sqrt(ex * ex + ey * ey);
  }
  const t = ((x - x1) * dx + (y - y1) * dy) / (dx * dx + dy * dy);
  const cx = x1 + t * dx, cy = y1 + t * dy;
  const ex = x - cx, ey = y - cy;
  return Math.sqrt(ex * ex + ey * ey);
}

export function simplifyPath<T extends P>(points: T[], tolerance = 0.00005): T[] {
  if (points.length < 3) return points;
  const keep = new Uint8Array(points.length);
  keep[0] = 1;
  keep[points.length - 1] = 1;
  const stack: Array<[number, number]> = [[0, points.length - 1]];
  while (stack.length) {
    const [i, j] = stack.pop()!;
    let maxD = 0, idx = -1;
    for (let k = i + 1; k < j; k++) {
      const d = perpDist(points[k], points[i], points[j]);
      if (d > maxD) { maxD = d; idx = k; }
    }
    if (idx !== -1 && maxD > tolerance) {
      keep[idx] = 1;
      stack.push([i, idx], [idx, j]);
    }
  }
  const out: T[] = [];
  for (let k = 0; k < points.length; k++) if (keep[k]) out.push(points[k]);
  return out;
}