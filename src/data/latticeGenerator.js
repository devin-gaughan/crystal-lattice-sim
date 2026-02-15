/**
 * Generates 3D atom positions for a crystal lattice.
 * 
 * @param {Object} structure - Structure definition from lattices.js
 * @param {number} repeat - Number of unit cells to repeat in each direction
 * @param {number} latticeConstant - Lattice constant (Å)
 * @returns {Array} Array of {position: [x,y,z], isCorner: boolean}
 */
export function generateLattice(structure, repeat = 2, latticeConstant = null) {
  const a = latticeConstant || structure.defaultA;
  const { basis, vectors } = structure;
  const atoms = [];
  const seen = new Set();
  const tolerance = 0.01;

  const offset = ((repeat - 1) * a) / 2;

  for (let i = 0; i < repeat; i++) {
    for (let j = 0; j < repeat; j++) {
      for (let k = 0; k < repeat; k++) {
        for (const b of basis) {
          const fracX = b[0] + i;
          const fracY = b[1] + j;
          const fracZ = b[2] + k;

          const x =
            fracX * vectors[0][0] * a +
            fracY * vectors[1][0] * a +
            fracZ * vectors[2][0] * a - offset;
          const y =
            fracX * vectors[0][1] * a +
            fracY * vectors[1][1] * a +
            fracZ * vectors[2][1] * a - offset;
          const z =
            fracX * vectors[0][2] * a +
            fracY * vectors[1][2] * a +
            fracZ * vectors[2][2] * a - offset;

          const key = `${Math.round(x / tolerance)},${Math.round(y / tolerance)},${Math.round(z / tolerance)}`;
          if (!seen.has(key)) {
            seen.add(key);
            atoms.push({
              position: [x, y, z],
              isEdge: i === 0 || j === 0 || k === 0 ||
                      i === repeat - 1 || j === repeat - 1 || k === repeat - 1,
            });
          }
        }
      }
    }
  }
  return atoms;
}

/**
 * Generates bonds between nearby atoms.
 */
export function generateBonds(atoms, structure, latticeConstant = null) {
  const a = latticeConstant || structure.defaultA;
  let maxBondLength;

  switch (structure.id) {
    case 'sc':
      maxBondLength = a * 1.05;
      break;
    case 'bcc':
      maxBondLength = a * Math.sqrt(3) / 2 * 1.05;
      break;
    case 'fcc':
      maxBondLength = a * Math.sqrt(2) / 2 * 1.05;
      break;
    case 'diamond':
      maxBondLength = a * Math.sqrt(3) / 4 * 1.05;
      break;
    case 'hcp':
      maxBondLength = a * 1.05;
      break;
    default:
      maxBondLength = a * 1.05;
  }

  const bonds = [];
  for (let i = 0; i < atoms.length; i++) {
    for (let j = i + 1; j < atoms.length; j++) {
      const dx = atoms[i].position[0] - atoms[j].position[0];
      const dy = atoms[i].position[1] - atoms[j].position[1];
      const dz = atoms[i].position[2] - atoms[j].position[2];
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
      if (dist <= maxBondLength && dist > 0.01) {
        bonds.push({
          start: atoms[i].position,
          end: atoms[j].position,
        });
      }
    }
  }
  return bonds;
}

/**
 * Generates unit cell wireframe edges.
 */
export function generateUnitCell(structure, latticeConstant = null) {
  const a = latticeConstant || structure.defaultA;
  const { vectors } = structure;

  const v = vectors.map(vec => vec.map(c => c * a));
  const origin = [0, 0, 0];

  const corners = [
    origin,
    v[0],
    v[1],
    v[2],
    [v[0][0] + v[1][0], v[0][1] + v[1][1], v[0][2] + v[1][2]],
    [v[0][0] + v[2][0], v[0][1] + v[2][1], v[0][2] + v[2][2]],
    [v[1][0] + v[2][0], v[1][1] + v[2][1], v[1][2] + v[2][2]],
    [v[0][0] + v[1][0] + v[2][0], v[0][1] + v[1][1] + v[2][1], v[0][2] + v[1][2] + v[2][2]],
  ];

  const edges = [
    [0, 1], [0, 2], [0, 3],
    [1, 4], [1, 5],
    [2, 4], [2, 6],
    [3, 5], [3, 6],
    [4, 7], [5, 7], [6, 7],
  ];

  return { corners, edges };
}
