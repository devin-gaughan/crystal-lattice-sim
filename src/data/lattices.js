/**
 * Crystal Lattice Structure Definitions
 * 
 * Each structure defines:
 * - name: Display name
 * - description: Brief scientific description
 * - basis: Fractional coordinates of atoms in the unit cell
 * - vectors: Lattice vectors (in units of lattice constant a)
 * - defaultA: Default lattice constant in Ångströms
 * - properties: Key physical properties
 * - color: Primary atom color (hex)
 * - examples: Real-world materials with this structure
 */

export const STRUCTURES = {
  sc: {
    id: 'sc',
    name: 'Simple Cubic',
    abbrev: 'SC',
    description: 'The simplest crystal structure with atoms at each corner of a cube. Rare in nature due to inefficient packing (52% density).',
    basis: [
      [0, 0, 0],
    ],
    vectors: [
      [1, 0, 0],
      [0, 1, 0],
      [0, 0, 1],
    ],
    defaultA: 3.34,
    coordinationNumber: 6,
    packingFraction: 0.524,
    color: '#60a5fa',
    glowColor: '#3b82f6',
    examples: ['Polonium (α-Po)'],
  },

  bcc: {
    id: 'bcc',
    name: 'Body-Centered Cubic',
    abbrev: 'BCC',
    description: 'Atoms at cube corners plus one atom at the center. Common in metals — offers good balance of strength and ductility (68% density).',
    basis: [
      [0, 0, 0],
      [0.5, 0.5, 0.5],
    ],
    vectors: [
      [1, 0, 0],
      [0, 1, 0],
      [0, 0, 1],
    ],
    defaultA: 2.87,
    coordinationNumber: 8,
    packingFraction: 0.680,
    color: '#f472b6',
    glowColor: '#ec4899',
    examples: ['Iron (α-Fe)', 'Tungsten (W)', 'Chromium (Cr)', 'Sodium (Na)'],
  },

  fcc: {
    id: 'fcc',
    name: 'Face-Centered Cubic',
    abbrev: 'FCC',
    description: 'Atoms at cube corners and face centers. The most efficient cubic packing (74% density). Dominant structure in noble and transition metals.',
    basis: [
      [0, 0, 0],
      [0.5, 0.5, 0],
      [0.5, 0, 0.5],
      [0, 0.5, 0.5],
    ],
    vectors: [
      [1, 0, 0],
      [0, 1, 0],
      [0, 0, 1],
    ],
    defaultA: 3.61,
    coordinationNumber: 12,
    packingFraction: 0.740,
    color: '#a78bfa',
    glowColor: '#8b5cf6',
    examples: ['Copper (Cu)', 'Aluminum (Al)', 'Gold (Au)', 'Silver (Ag)'],
  },

  diamond: {
    id: 'diamond',
    name: 'Diamond Cubic',
    abbrev: 'DC',
    description: 'Two interpenetrating FCC lattices offset by ¼ of the body diagonal. Each atom bonds tetrahedrally to four neighbors. Foundation of semiconductor technology.',
    basis: [
      [0, 0, 0],
      [0.5, 0.5, 0],
      [0.5, 0, 0.5],
      [0, 0.5, 0.5],
      [0.25, 0.25, 0.25],
      [0.75, 0.75, 0.25],
      [0.75, 0.25, 0.75],
      [0.25, 0.75, 0.75],
    ],
    vectors: [
      [1, 0, 0],
      [0, 1, 0],
      [0, 0, 1],
    ],
    defaultA: 5.43,
    coordinationNumber: 4,
    packingFraction: 0.340,
    color: '#34d399',
    glowColor: '#10b981',
    examples: ['Silicon (Si)', 'Germanium (Ge)', 'Diamond (C)', 'Tin (α-Sn)'],
  },

  hcp: {
    id: 'hcp',
    name: 'Hexagonal Close-Packed',
    abbrev: 'HCP',
    description: 'Close-packed layers stacked in ABAB sequence. Achieves maximum packing efficiency (74%) alongside FCC. Common in lightweight structural metals.',
    basis: [
      [0, 0, 0],
      [1 / 3, 2 / 3, 0.5],
    ],
    vectors: [
      [1, 0, 0],
      [0.5, Math.sqrt(3) / 2, 0],
      [0, 0, Math.sqrt(8 / 3)],
    ],
    defaultA: 3.21,
    coordinationNumber: 12,
    packingFraction: 0.740,
    color: '#fbbf24',
    glowColor: '#f59e0b',
    examples: ['Titanium (Ti)', 'Magnesium (Mg)', 'Zinc (Zn)', 'Cobalt (Co)'],
  },
};

export const STRUCTURE_ORDER = ['sc', 'bcc', 'fcc', 'diamond', 'hcp'];
