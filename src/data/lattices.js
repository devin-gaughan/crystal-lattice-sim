/**
 * Crystal Lattice Structure Definitions
 *
 * Each structure defines:
 * - name: Display name
 * - description: Brief scientific description
 * - basis: Fractional coordinates of atoms in the unit cell
 * - vectors: Lattice vectors (in units of lattice constant a)
 * - defaultA: Default lattice constant in Angstroms
 * - properties: Key physical properties
 * - color: Primary atom color (hex)
 * - examples: Real-world materials with this structure
 *
 * Multi-atom structures also define:
 * - atomTypes: Array parallel to basis, naming the species at each site
 * - secondaryColor / tertiaryColor: Colors for 2nd/3rd species
 */

/**
 * Ionic / atomic radii (Angstroms) for display scaling.
 * Sources: Shannon (1976) effective ionic radii; covalent radii for non-ionic.
 */
export const ATOMIC_RADII = {
  // Elemental / covalent
  Po: 1.68, Fe: 1.26, Cu: 1.28, Si: 1.17, Ti: 1.47, Ge: 1.22, C: 0.77,
  Al: 1.43, Au: 1.44, Ag: 1.44, W: 1.39, Cr: 1.29, Mg: 1.60, Zn: 1.22, Co: 1.25,
  // Ionic
  Na: 1.02, Cl: 1.81, Cs: 1.67, K: 1.38, F: 1.33, Li: 0.76,
  Ba: 1.35, Sr: 1.18, Ca: 1.00, O: 1.40, S: 1.84,
  // For display we keep all positive
};

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

  nacl: {
    id: 'nacl',
    name: 'Rock Salt (NaCl)',
    abbrev: 'NaCl',
    description: 'Two interpenetrating FCC sublattices of cations and anions, offset by half a lattice constant. The archetypal ionic crystal structure.',
    basis: [
      // Na (cation) sublattice — FCC positions
      [0, 0, 0],
      [0.5, 0.5, 0],
      [0.5, 0, 0.5],
      [0, 0.5, 0.5],
      // Cl (anion) sublattice — offset by (0.5, 0, 0)
      [0.5, 0, 0],
      [0, 0.5, 0],
      [0, 0, 0.5],
      [0.5, 0.5, 0.5],
    ],
    atomTypes: ['Na', 'Na', 'Na', 'Na', 'Cl', 'Cl', 'Cl', 'Cl'],
    vectors: [
      [1, 0, 0],
      [0, 1, 0],
      [0, 0, 1],
    ],
    defaultA: 5.64,
    coordinationNumber: 6,
    packingFraction: 0.673,
    color: '#38bdf8',
    secondaryColor: '#4ade80',
    glowColor: '#0ea5e9',
    examples: ['NaCl (table salt)', 'MgO', 'FeO', 'LiF'],
  },

  cscl: {
    id: 'cscl',
    name: 'Cesium Chloride (CsCl)',
    abbrev: 'CsCl',
    description: 'Simple cubic lattice with a two-atom basis: one atom at the corner and one at the body center. Often confused with BCC, but the two sites are chemically distinct.',
    basis: [
      [0, 0, 0],       // Cs
      [0.5, 0.5, 0.5], // Cl
    ],
    atomTypes: ['Cs', 'Cl'],
    vectors: [
      [1, 0, 0],
      [0, 1, 0],
      [0, 0, 1],
    ],
    defaultA: 4.12,
    coordinationNumber: 8,
    packingFraction: 0.729,
    color: '#c084fc',
    secondaryColor: '#4ade80',
    glowColor: '#a855f7',
    examples: ['CsCl', 'CsBr', 'CsI', 'TlCl'],
  },

  zincblende: {
    id: 'zincblende',
    name: 'Zinc Blende (ZnS)',
    abbrev: 'ZnS',
    description: 'Like diamond cubic but with two different atom types alternating. Each atom is tetrahedrally coordinated by the other species. Foundation of III-V semiconductors.',
    basis: [
      // Zn sublattice
      [0, 0, 0],
      [0.5, 0.5, 0],
      [0.5, 0, 0.5],
      [0, 0.5, 0.5],
      // S sublattice
      [0.25, 0.25, 0.25],
      [0.75, 0.75, 0.25],
      [0.75, 0.25, 0.75],
      [0.25, 0.75, 0.75],
    ],
    atomTypes: ['Zn', 'Zn', 'Zn', 'Zn', 'S', 'S', 'S', 'S'],
    vectors: [
      [1, 0, 0],
      [0, 1, 0],
      [0, 0, 1],
    ],
    defaultA: 5.41,
    coordinationNumber: 4,
    packingFraction: 0.340,
    color: '#fb923c',
    secondaryColor: '#facc15',
    glowColor: '#f97316',
    examples: ['ZnS (sphalerite)', 'GaAs', 'InP', 'SiC (3C)'],
  },

  perovskite: {
    id: 'perovskite',
    name: 'Perovskite (ABO\u2083)',
    abbrev: 'ABO\u2083',
    description: 'A cubic structure with formula ABO\u2083: A at corners, B at body center, and O at face centers. Critical for ferroelectrics, superconductors, and next-generation solar cells.',
    basis: [
      // A-site (corners) — Ba in BaTiO3
      [0, 0, 0],
      // B-site (body center) — Ti
      [0.5, 0.5, 0.5],
      // O-site (face centers)
      [0.5, 0.5, 0],
      [0.5, 0, 0.5],
      [0, 0.5, 0.5],
    ],
    atomTypes: ['Ba', 'Ti', 'O', 'O', 'O'],
    vectors: [
      [1, 0, 0],
      [0, 1, 0],
      [0, 0, 1],
    ],
    defaultA: 4.01,
    coordinationNumber: 6,
    packingFraction: 0.524,
    color: '#f43f5e',
    secondaryColor: '#22d3ee',
    tertiaryColor: '#e2e8f0',
    glowColor: '#e11d48',
    examples: ['BaTiO\u2083', 'SrTiO\u2083', 'CaTiO\u2083', 'CH\u2083NH\u2083PbI\u2083'],
  },
  fluorite: {
    id: 'fluorite',
    name: 'Fluorite (CaF\u2082)',
    abbrev: 'CaF\u2082',
    description: 'Cations form an FCC sublattice; anions occupy all eight tetrahedral sites. Important for nuclear fuels (UO\u2082) and optical materials.',
    basis: [
      // Ca (cation) — FCC
      [0, 0, 0],
      [0.5, 0.5, 0],
      [0.5, 0, 0.5],
      [0, 0.5, 0.5],
      // F (anion) — all tetrahedral sites
      [0.25, 0.25, 0.25],
      [0.75, 0.75, 0.25],
      [0.75, 0.25, 0.75],
      [0.25, 0.75, 0.75],
      [0.25, 0.25, 0.75],
      [0.75, 0.75, 0.75],
      [0.75, 0.25, 0.25],
      [0.25, 0.75, 0.25],
    ],
    atomTypes: ['Ca', 'Ca', 'Ca', 'Ca', 'F', 'F', 'F', 'F', 'F', 'F', 'F', 'F'],
    vectors: [
      [1, 0, 0],
      [0, 1, 0],
      [0, 0, 1],
    ],
    defaultA: 5.46,
    coordinationNumber: 8,
    packingFraction: 0.624,
    color: '#06b6d4',
    secondaryColor: '#fbbf24',
    glowColor: '#0891b2',
    examples: ['CaF\u2082', 'UO\u2082', 'BaF\u2082', 'ThO\u2082'],
  },

  wurtzite: {
    id: 'wurtzite',
    name: 'Wurtzite (ZnS)',
    abbrev: 'Wz',
    description: 'Hexagonal analogue of zinc blende. Two interpenetrating HCP sublattices with tetrahedral coordination. Foundation of III-nitride semiconductors (GaN, AlN).',
    basis: [
      // Zn sites
      [0, 0, 0],
      [1 / 3, 2 / 3, 0.5],
      // S sites (offset by ~3/8 c)
      [0, 0, 3 / 8],
      [1 / 3, 2 / 3, 7 / 8],
    ],
    atomTypes: ['Zn', 'Zn', 'S', 'S'],
    vectors: [
      [1, 0, 0],
      [0.5, Math.sqrt(3) / 2, 0],
      [0, 0, Math.sqrt(8 / 3)],
    ],
    defaultA: 3.82,
    coordinationNumber: 4,
    packingFraction: 0.340,
    color: '#f97316',
    secondaryColor: '#a3e635',
    glowColor: '#ea580c',
    examples: ['ZnS (wurtzite)', 'GaN', 'AlN', 'ZnO'],
  },
};

export const STRUCTURE_ORDER = [
  'sc', 'bcc', 'fcc', 'diamond', 'hcp',
  'nacl', 'cscl', 'zincblende', 'fluorite', 'perovskite',
  'wurtzite',
];
