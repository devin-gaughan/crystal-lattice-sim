/**
 * Miller Indices Plane Mathematics
 * 
 * Computes crystallographic planes from (hkl) indices,
 * including d-spacing, plane normals, and atom-plane distances
 * for arbitrary lattice vector systems.
 */

function cross(a, b) {
  return [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ];
}

function dot(a, b) {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

function scale(v, s) {
  return [v[0] * s, v[1] * s, v[2] * s];
}

function add(a, b) {
  return [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
}

function magnitude(v) {
  return Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]);
}

function normalize(v) {
  const m = magnitude(v);
  return m > 0 ? [v[0] / m, v[1] / m, v[2] / m] : [0, 0, 0];
}

/**
 * Compute plane normal and d-spacing for given Miller indices.
 * Works for any lattice vector system (cubic, hexagonal, etc.)
 */
export function computePlane(h, k, l, vectors, a) {
  const a1 = scale(vectors[0], a);
  const a2 = scale(vectors[1], a);
  const a3 = scale(vectors[2], a);

  const a2xa3 = cross(a2, a3);
  const vol = dot(a1, a2xa3);

  const b1 = scale(cross(a2, a3), 1 / vol);
  const b2 = scale(cross(a3, a1), 1 / vol);
  const b3 = scale(cross(a1, a2), 1 / vol);

  const G = add(add(scale(b1, h), scale(b2, k)), scale(b3, l));
  const Gmag = magnitude(G);
  const dSpacing = Gmag > 0 ? 1 / Gmag : Infinity;
  const planeNormal = normalize(G);

  return { planeNormal, dSpacing, G };
}

/**
 * Signed distance from a point to the Miller plane.
 */
export function distanceToPlane(point, planeNormal, offset = 0) {
  return dot(point, planeNormal) - offset;
}

/**
 * Find atoms on or near the plane.  Returns Set of atom indices AND the count.
 */
export function atomsOnPlane(atoms, planeNormal, offset, tolerance = 0.15) {
  const onPlane = new Set();
  for (let i = 0; i < atoms.length; i++) {
    const d = Math.abs(distanceToPlane(atoms[i].position, planeNormal, offset));
    if (d <= tolerance) {
      onPlane.add(i);
    }
  }
  return onPlane;
}

/**
 * Clip a plane (defined by normal + offset) to an axis-aligned bounding box.
 * Returns polygon vertices AND the edge loop for wireframe rendering.
 */
export function clipPlaneToBox(planeNormal, offset, bounds) {
  const [nx, ny, nz] = planeNormal;
  const d = offset;

  // Tangent vectors for the plane
  let tangent1, tangent2;
  if (Math.abs(nx) < 0.9) {
    tangent1 = normalize(cross(planeNormal, [1, 0, 0]));
  } else {
    tangent1 = normalize(cross(planeNormal, [0, 1, 0]));
  }
  tangent2 = normalize(cross(planeNormal, tangent1));

  // Large initial quad
  const size = bounds * 3;
  const center = scale(planeNormal, d);
  const quad = [
    add(add(center, scale(tangent1, -size)), scale(tangent2, -size)),
    add(add(center, scale(tangent1, size)), scale(tangent2, -size)),
    add(add(center, scale(tangent1, size)), scale(tangent2, size)),
    add(add(center, scale(tangent1, -size)), scale(tangent2, size)),
  ];

  // Clip against 6 box faces using Sutherland-Hodgman
  let polygon = quad;
  const clipPlanes = [
    { normal: [1, 0, 0], d: bounds },
    { normal: [-1, 0, 0], d: bounds },
    { normal: [0, 1, 0], d: bounds },
    { normal: [0, -1, 0], d: bounds },
    { normal: [0, 0, 1], d: bounds },
    { normal: [0, 0, -1], d: bounds },
  ];

  for (const clip of clipPlanes) {
    polygon = clipPolygonByPlane(polygon, clip.normal, clip.d);
    if (polygon.length < 3) return { vertices: [], edgeLoop: [] };
  }

  return { vertices: polygon, edgeLoop: polygon };
}

function clipPolygonByPlane(vertices, normal, d) {
  if (vertices.length === 0) return [];
  const output = [];

  for (let i = 0; i < vertices.length; i++) {
    const current = vertices[i];
    const next = vertices[(i + 1) % vertices.length];
    const dc = dot(current, normal);
    const dn = dot(next, normal);
    const currentInside = dc <= d + 0.001;
    const nextInside = dn <= d + 0.001;

    if (currentInside) {
      output.push(current);
      if (!nextInside) {
        output.push(intersectEdgePlane(current, next, normal, d));
      }
    } else if (nextInside) {
      output.push(intersectEdgePlane(current, next, normal, d));
    }
  }

  return output;
}

function intersectEdgePlane(a, b, normal, d) {
  const da = dot(a, normal) - d;
  const db = dot(b, normal) - d;
  const t = da / (da - db);
  return [
    a[0] + t * (b[0] - a[0]),
    a[1] + t * (b[1] - a[1]),
    a[2] + t * (b[2] - a[2]),
  ];
}

/**
 * Common crystallographic planes.
 */
export const COMMON_PLANES = [
  { h: 1, k: 0, l: 0, label: '(100)', desc: 'Face plane' },
  { h: 1, k: 1, l: 0, label: '(110)', desc: 'Edge diagonal' },
  { h: 1, k: 1, l: 1, label: '(111)', desc: 'Body diagonal' },
  { h: 2, k: 0, l: 0, label: '(200)', desc: 'Half-spacing' },
  { h: 2, k: 1, l: 0, label: '(210)', desc: 'Stepped face' },
  { h: 2, k: 1, l: 1, label: '(211)', desc: 'Stepped diagonal' },
];
