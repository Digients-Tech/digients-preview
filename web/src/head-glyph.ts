import * as THREE from "three";

// A generic orientation glyph, not reconstructed facial anatomy. Coordinates
// follow the source camera: +X right, +Y down, +Z forward. The camera origin is
// at the brow; the skull sits behind it, rather than in front of the hands.
// Each section describes [height, half width, front, back], in metres.
const PROFILE = [
  [-0.142, 0.003, -0.076, -0.082],
  [-0.134, 0.038, -0.041, -0.122],
  [-0.116, 0.064, -0.012, -0.153],
  [-0.089, 0.079, 0.001, -0.172],
  [-0.053, 0.084, 0.006, -0.18],
  [-0.018, 0.082, 0.004, -0.178],
  [0.012, 0.078, -0.004, -0.17],
  [0.042, 0.078, 0.002, -0.157],
  [0.071, 0.068, -0.003, -0.14],
  [0.101, 0.054, -0.004, -0.117],
  [0.124, 0.039, -0.014, -0.09],
  [0.139, 0.022, -0.035, -0.068],
  [0.143, 0.003, -0.052, -0.055],
] as const;

function point(height: number, angle: number) {
  let section = 0;
  while (section < PROFILE.length - 2 && height > PROFILE[section + 1]![0])
    section++;
  const lower = PROFILE[section]!;
  const upper = PROFILE[section + 1]!;
  const t = (height - lower[0]) / (upper[0] - lower[0]);
  const width = THREE.MathUtils.lerp(lower[1], upper[1], t);
  const front = THREE.MathUtils.lerp(lower[2], upper[2], t);
  const back = THREE.MathUtils.lerp(lower[3], upper[3], t);
  const x = width * Math.sin(angle);
  let z = (front + back) / 2 + ((front - back) / 2) * Math.cos(angle);
  if (Math.cos(angle) > 0) {
    const bump = (cx: number, cy: number, sx: number, sy: number) =>
      Math.exp(-(((x - cx) / sx) ** 2) - ((height - cy) / sy) ** 2);
    // Brow, nose bridge/tip, eye sockets and lips make direction legible from
    // a three-quarter view without a texture, external asset or identity.
    z += 0.029 * bump(0, 0.034, 0.014, 0.037);
    z += 0.012 * bump(0, 0.045, 0.022, 0.015);
    z += 0.005 * bump(0, -0.008, 0.064, 0.01);
    z -=
      0.009 *
      (bump(-0.032, 0.016, 0.018, 0.015) + bump(0.032, 0.016, 0.018, 0.015));
    z += 0.006 * bump(0, 0.085, 0.028, 0.008);
  }
  return new THREE.Vector3(x, height, z);
}

export function createHeadGlyph() {
  const head = new THREE.Group();
  head.name = "generic-head-pose-glyph";
  const rows = 48,
    columns = 64;
  const positions: number[] = [],
    indices: number[] = [];
  const at = (row: number, col: number) =>
    point(
      THREE.MathUtils.lerp(-0.142, 0.143, row / rows),
      (col / columns) * Math.PI * 2,
    );
  for (let row = 0; row <= rows; row++) {
    for (let col = 0; col <= columns; col++)
      positions.push(...at(row, col).toArray());
  }
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < columns; col++) {
      const a = row * (columns + 1) + col,
        b = a + columns + 1;
      indices.push(a, a + 1, b, a + 1, b + 1, b);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(positions, 3),
  );
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  const surface = new THREE.MeshStandardMaterial({
    color: 0x747b8b,
    roughness: 0.95,
    side: THREE.DoubleSide,
    polygonOffset: true,
    polygonOffsetFactor: 1,
    polygonOffsetUnits: 1,
  });
  head.add(new THREE.Mesh(geometry, surface));

  // Sparse quad contours communicate shape without a dense triangle cage.
  const lines: THREE.Vector3[] = [];
  for (let row = 3; row < rows; row += 3)
    for (let col = 0; col < columns; col++)
      lines.push(at(row, col), at(row, col + 1));
  for (let col = 0; col < columns; col += 4)
    for (let row = 0; row < rows; row++)
      lines.push(at(row, col), at(row + 1, col));
  head.add(
    new THREE.LineSegments(
      new THREE.BufferGeometry().setFromPoints(lines),
      new THREE.LineBasicMaterial({
        color: 0xc4c3ed,
        transparent: true,
        opacity: 0.4,
      }),
    ),
  );

  for (const side of [-1, 1]) {
    const ear = new THREE.Mesh(new THREE.SphereGeometry(1, 12, 16), surface);
    ear.scale.set(0.012, 0.028, 0.017);
    ear.position.set(side * 0.081, 0.03, -0.088);
    head.add(ear);
    const rim = new THREE.EllipseCurve(
      0,
      0,
      0.02,
      0.01,
      0,
      Math.PI * 2,
      false,
      0,
    );
    head.add(
      new THREE.LineLoop(
        new THREE.BufferGeometry().setFromPoints(
          rim
            .getPoints(32)
            .map(
              (p) => new THREE.Vector3(side * 0.092, p.x + 0.03, p.y - 0.088),
            ),
        ),
        new THREE.LineBasicMaterial({
          color: 0xc4c3ed,
          transparent: true,
          opacity: 0.5,
        }),
      ),
    );
  }
  return head;
}
