import fs from 'node:fs';

const pairs = JSON.parse(fs.readFileSync('/tmp/6m3m-matched-pairs.json', 'utf8'));
const center = (points) => points.reduce((s, p) => ({ x: s.x + p.x / points.length, y: s.y + p.y / points.length, z: s.z + p.z / points.length }), { x: 0, y: 0, z: 0 });
const dot = (a, b) => a.x * b.x + a.y * b.y + a.z * b.z;
const norm = (v) => Array.isArray(v) ? Math.sqrt(v.reduce((s, x) => s + x * x, 0)) : Math.sqrt(dot(v, v));
const normalize = (v) => { const n = norm(v) || 1; return v.map((x) => x / n); };
const mul = (m, v) => m.map((row) => row.reduce((s, x, i) => s + x * v[i], 0));
const rotate = (q, p) => ({ x: (1 - 2 * (q[2] ** 2 + q[3] ** 2)) * p.x + 2 * (q[1] * q[2] - q[3] * q[0]) * p.y + 2 * (q[1] * q[3] + q[2] * q[0]) * p.z, y: 2 * (q[1] * q[2] + q[3] * q[0]) * p.x + (1 - 2 * (q[1] ** 2 + q[3] ** 2)) * p.y + 2 * (q[2] * q[3] - q[1] * q[0]) * p.z, z: 2 * (q[1] * q[3] - q[2] * q[0]) * p.x + 2 * (q[2] * q[3] + q[1] * q[0]) * p.y + (1 - 2 * (q[1] ** 2 + q[2] ** 2)) * p.z });
const a = pairs.map((p) => p.reference); const b = pairs.map((p) => p.mobile); const ca = center(a); const cb = center(b); const ac = a.map((p) => ({ x: p.x - ca.x, y: p.y - ca.y, z: p.z - ca.z })); const bc = b.map((p) => ({ x: p.x - cb.x, y: p.y - cb.y, z: p.z - cb.z }));
let sxx = 0, sxy = 0, sxz = 0, syx = 0, syy = 0, syz = 0, szx = 0, szy = 0, szz = 0; bc.forEach((p, i) => { const t = ac[i]; sxx += p.x * t.x; sxy += p.x * t.y; sxz += p.x * t.z; syx += p.y * t.x; syy += p.y * t.y; syz += p.y * t.z; szx += p.z * t.x; szy += p.z * t.y; szz += p.z * t.z; });
const matrix = [[sxx + syy + szz, syz - szy, szx - sxz, sxy - syx], [syz - szy, sxx - syy - szz, sxy + syx, szx + sxz], [szx - sxz, sxy + syx, -sxx + syy - szz, syz + szy], [sxy - syx, szx + sxz, syz + szy, -sxx - syy + szz]]; let q = [1, 0, 0, 0]; for (let i = 0; i < 80; i += 1) q = normalize(mul(matrix, q)); const moved = b.map((p) => { const r = rotate(q, { x: p.x - cb.x, y: p.y - cb.y, z: p.z - cb.z }); return { x: r.x + ca.x, y: r.y + ca.y, z: r.z + ca.z }; }); const rmsd = Math.sqrt(moved.reduce((s, p, i) => s + (p.x - a[i].x) ** 2 + (p.y - a[i].y) ** 2 + (p.z - a[i].z) ** 2, 0) / moved.length);
console.log(JSON.stringify({ pairs: pairs.length, rmsd }, null, 2));
