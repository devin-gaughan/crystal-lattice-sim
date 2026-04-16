/**
 * X-Ray Diffraction & Structure Factor Computation
 *
 * Computes:
 *  - Geometric structure factor F(hkl) from basis positions
 *  - d-spacings via reciprocal-lattice vectors
 *  - Full powder XRD pattern (2θ, intensity, multiplicity, LP correction)
 *
 * References:
 *  - Warren, "X-Ray Diffraction" (1990)
 *  - Cullity & Stock, "Elements of X-Ray Diffraction" (2001)
 */

import { cross, dot, scale, add, magnitude } from './vectorMath';


/* ── Atomic form-factor coefficients (Cromer-Mann 4-Gaussian + c) ──
 * f(s) = Σ aᵢ·exp(-bᵢ·s²) + c,  where s = sinθ / λ
 * Source: International Tables for Crystallography, Vol C (1992)
 */
const FORM_FACTORS = {
  Po: { a: [16.290, 12.154, 8.561, 2.714], b: [0.099, 6.487, 0.885, 30.573], c: 1.281 },
  Fe: { a: [11.770, 7.357, 3.522, 2.305], b: [4.761, 0.307, 15.354, 76.881], c: 1.037 },
  Cu: { a: [13.338, 7.168, 5.616, 1.674], b: [3.583, 0.247, 11.397, 64.813], c: 1.191 },
  Si: { a: [6.292, 3.035, 1.989, 1.541], b: [2.439, 32.334, 0.679, 81.694], c: 1.141 },
  Ti: { a: [9.760, 7.356, 1.699, 1.902], b: [7.851, 0.500, 35.634, 116.105], c: 1.281 },
};

/** Map each lattice type to a representative element */
const STRUCTURE_ELEMENTS = {
  sc: 'Po', bcc: 'Fe', fcc: 'Cu', diamond: 'Si', hcp: 'Ti',
};

export function getStructureElement(structureId) {
  return STRUCTURE_ELEMENTS[structureId] || 'Si';
}

function atomicFormFactor(sinThetaOverLambda, structureId) {
  const el = STRUCTURE_ELEMENTS[structureId] || 'Si';
  const { a, b, c } = FORM_FACTORS[el];
  const s2 = sinThetaOverLambda * sinThetaOverLambda;
  return a.reduce((sum, ai, i) => sum + ai * Math.exp(-b[i] * s2), 0) + c;
}


/* ── Structure factor ── */

/**
 * Compute the geometric structure factor for (hkl).
 * F(hkl) = Σⱼ exp(2πi (h·xⱼ + k·yⱼ + l·zⱼ))
 *
 * @returns {{ real, imag, magnitude, magnitudeSquared }}
 */
export function structureFactor(h, k, l, basis) {
  let re = 0, im = 0;
  for (const [x, y, z] of basis) {
    const phase = 2 * Math.PI * (h * x + k * y + l * z);
    re += Math.cos(phase);
    im += Math.sin(phase);
  }
  const mag2 = re * re + im * im;
  return { real: re, imag: im, magnitude: Math.sqrt(mag2), magnitudeSquared: mag2 };
}

/**
 * Is a reflection systematically absent?  (|F|² ≈ 0)
 */
export function isAbsent(h, k, l, basis) {
  return structureFactor(h, k, l, basis).magnitudeSquared < 0.01;
}


/* ── Powder XRD pattern generation ── */

/** Standard X-ray wavelengths (Å) */
export const WAVELENGTHS = {
  'Cu Kα': 1.5406,
  'Mo Kα': 0.7107,
  'Co Kα': 1.7890,
  'Cr Kα': 2.2910,
};
export const DEFAULT_WAVELENGTH = 'Cu Kα';

/**
 * Lorentz-polarization correction factor.
 * LP = (1 + cos²2θ) / (sin²θ · sin2θ)
 */
function lorentzPolarization(twoThetaDeg) {
  const thetaRad = (twoThetaDeg / 2) * Math.PI / 180;
  const twoThetaRad = twoThetaDeg * Math.PI / 180;
  const sinTheta = Math.sin(thetaRad);
  const sin2Theta = Math.sin(twoThetaRad);
  const cos2Theta = Math.cos(twoThetaRad);
  if (sinTheta < 1e-10 || Math.abs(sin2Theta) < 1e-10) return 0;
  return (1 + cos2Theta * cos2Theta) / (sinTheta * sinTheta * sin2Theta);
}

/**
 * Normalise an (hkl) triple to its "canonical positive" form.
 * Prefers h ≥ k ≥ l ≥ 0 for labelling.
 */
function canonicalHKL(h, k, l) {
  let arr = [Math.abs(h), Math.abs(k), Math.abs(l)];
  arr.sort((a, b) => b - a);
  return arr;
}


/**
 * Generate a complete powder XRD pattern.
 *
 * Enumerates all (hkl) from -maxIndex to +maxIndex, computes d-spacing
 * via reciprocal-lattice vectors, groups equivalent reflections by 2θ,
 * and returns peaks with correct relative intensities.
 *
 * @param {Object} structure - from lattices.js
 * @param {number} [latticeConstant] - override lattice constant (Å)
 * @param {string} [wavelengthKey] - key into WAVELENGTHS
 * @param {number} [maxIndex=6] - max |h|,|k|,|l| to enumerate
 * @param {number} [maxTwoTheta=140] - upper 2θ bound (degrees)
 * @returns {Array<Object>} sorted array of peaks
 */
/**
 * Debye-Waller factor: exp(-2M) where M = B * (sinθ/λ)²
 * B = 8π² <u²> is the isotropic displacement parameter.
 * We estimate B from temperature using a simple Debye model:
 *   B ≈ (3hbar²T) / (m·k_B·Θ_D²) simplified to B ≈ 0.005 * T (Å²)
 * This is a pedagogical approximation; real B values are element-specific.
 */
function debyeWallerFactor(sinThetaOverLambda, temperatureK) {
  if (temperatureK <= 0) return 1;
  const B = 0.005 * temperatureK; // approximate isotropic B-factor (Å²)
  return Math.exp(-2 * B * sinThetaOverLambda * sinThetaOverLambda);
}

export function generateXRDPattern(
  structure,
  latticeConstant,
  wavelengthOrKey = 1.5406,
  maxIndex = 6,
  maxTwoTheta = 140,
  temperatureK = 0
) {
  const a = latticeConstant || structure.defaultA;
  const lambda = typeof wavelengthOrKey === 'string'
    ? (WAVELENGTHS[wavelengthOrKey] || 1.5406)
    : wavelengthOrKey;
  const { basis, vectors } = structure;

  // Real-space lattice vectors (Å)
  const a1 = vectors[0].map(v => v * a);
  const a2 = vectors[1].map(v => v * a);
  const a3 = vectors[2].map(v => v * a);

  // Reciprocal-lattice vectors (Å⁻¹)
  const a2xa3 = cross(a2, a3);
  const vol = dot(a1, a2xa3);
  const b1 = scale(cross(a2, a3), 1 / vol);
  const b2 = scale(cross(a3, a1), 1 / vol);
  const b3 = scale(cross(a1, a2), 1 / vol);

  // Accumulate peaks keyed by rounded 2θ
  const peakMap = new Map();

  for (let h = -maxIndex; h <= maxIndex; h++) {
    for (let k = -maxIndex; k <= maxIndex; k++) {
      for (let l = -maxIndex; l <= maxIndex; l++) {
        if (h === 0 && k === 0 && l === 0) continue;

        // Reciprocal-lattice vector G = h·b1 + k·b2 + l·b3
        const G = add(add(scale(b1, h), scale(b2, k)), scale(b3, l));
        const Gmag = magnitude(G);
        const d = 1 / Gmag;

        // Bragg's law: λ = 2d sinθ  →  sinθ = λ/(2d)
        const sinTheta = lambda / (2 * d);
        if (sinTheta >= 1 || sinTheta <= 0) continue;
        const twoTheta = 2 * Math.asin(sinTheta) * 180 / Math.PI;
        if (twoTheta > maxTwoTheta || twoTheta < 5) continue;

        // Geometric structure factor
        const { magnitudeSquared: F2 } = structureFactor(h, k, l, basis);
        if (F2 < 0.01) continue;  // systematically absent

        // Group by 2θ (0.01° resolution)
        const key = Math.round(twoTheta * 100);

        if (peakMap.has(key)) {
          const p = peakMap.get(key);
          p.totalF2 += F2;
          p.count += 1;
        } else {
          const [ch, ck, cl] = canonicalHKL(h, k, l);
          peakMap.set(key, {
            hkl: [ch, ck, cl],
            twoTheta,
            dSpacing: d,
            F2,                 // single-reflection |F|²
            totalF2: F2,        // accumulated (multiplicity × |F|²)
            count: 1,           // multiplicity counter
            sinThetaOverLambda: sinTheta / lambda,
          });
        }
      }
    }
  }

  // Compute final intensities
  const peaks = [];
  for (const [, p] of peakMap) {
    const LP = lorentzPolarization(p.twoTheta);
    const f = atomicFormFactor(p.sinThetaOverLambda, structure.id);
    const DW = debyeWallerFactor(p.sinThetaOverLambda, temperatureK);
    const intensity = p.totalF2 * f * f * LP * DW;

    const [h, k, l] = p.hkl;
    peaks.push({
      hkl: [h, k, l],
      label: `(${h}${k}${l})`,
      twoTheta: p.twoTheta,
      dSpacing: p.dSpacing,
      F2: p.F2,
      multiplicity: p.count,
      intensity,
      relativeIntensity: 0,   // filled below
    });
  }

  // Sort by 2θ
  peaks.sort((a, b) => a.twoTheta - b.twoTheta);

  // Normalise to 100
  const maxI = Math.max(...peaks.map(p => p.intensity), 1e-20);
  for (const p of peaks) {
    p.relativeIntensity = (p.intensity / maxI) * 100;
  }

  return peaks;
}
