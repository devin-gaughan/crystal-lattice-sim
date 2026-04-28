/**
 * Lattice Path Counting via Dynamic Programming
 * ----------------------------------------------
 * Counts monotonic paths from (0,0,0) to (a,b,c) on a 3D lattice grid,
 * moving only in the +x, +y, or +z direction. This is the 3D generalization
 * of Project Euler #15 (https://projecteuler.net/problem=15).
 *
 * Recurrence:  paths(i,j,k) = paths(i-1,j,k) + paths(i,j-1,k) + paths(i,j,k-1)
 * Base case:   paths(0,0,0) = 1
 *
 * Closed form: paths(a,b,c) = (a+b+c)! / (a! * b! * c!)   [trinomial coefficient]
 *
 * The DP fills an (a+1) x (b+1) x (c+1) table in O(a*b*c) time. We use BigInt
 * because counts grow combinatorially (e.g. paths(6,6,6) = 7,484,400).
 */

/**
 * Build the full DP table of path counts.
 * @param {number} a Steps in +x direction.
 * @param {number} b Steps in +y direction.
 * @param {number} c Steps in +z direction.
 * @returns {BigInt[][][]} dp[i][j][k] = number of paths from origin to (i,j,k).
 */
export function buildPathDP(a, b, c) {
  const dp = Array.from({ length: a + 1 }, () =>
    Array.from({ length: b + 1 }, () =>
      new Array(c + 1).fill(0n)
    )
  );
  dp[0][0][0] = 1n;
  for (let i = 0; i <= a; i++) {
    for (let j = 0; j <= b; j++) {
      for (let k = 0; k <= c; k++) {
        if (i === 0 && j === 0 && k === 0) continue;
        let sum = 0n;
        if (i > 0) sum += dp[i - 1][j][k];
        if (j > 0) sum += dp[i][j - 1][k];
        if (k > 0) sum += dp[i][j][k - 1];
        dp[i][j][k] = sum;
      }
    }
  }
  return dp;
}

/**
 * Closed-form trinomial coefficient: (a+b+c)! / (a! * b! * c!).
 * Independent verification of the DP result.
 */
export function trinomialCoefficient(a, b, c) {
  const factorial = (n) => {
    let r = 1n;
    for (let i = 2n; i <= BigInt(n); i++) r *= i;
    return r;
  };
  return factorial(a + b + c) / (factorial(a) * factorial(b) * factorial(c));
}

/**
 * Generator yielding (i,j,k) tuples in the order the DP fills them.
 * Useful for animating the table fill.
 */
export function* fillOrder(a, b, c) {
  for (let i = 0; i <= a; i++)
    for (let j = 0; j <= b; j++)
      for (let k = 0; k <= c; k++)
        yield [i, j, k];
}

/** Total cell count in the (a+1)*(b+1)*(c+1) DP table. */
export function totalCells(a, b, c) {
  return (a + 1) * (b + 1) * (c + 1);
}

/** Pretty-print a BigInt count with comma separators. */
export function formatCount(n) {
  return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

/**
 * Project the BigInt DP counts to log10(count) for color mapping.
 * Returns Float64Array of length (a+1)*(b+1)*(c+1) flattened in fillOrder.
 */
export function logCountField(dp, a, b, c) {
  const out = new Float64Array((a + 1) * (b + 1) * (c + 1));
  let idx = 0;
  for (let i = 0; i <= a; i++) {
    for (let j = 0; j <= b; j++) {
      for (let k = 0; k <= c; k++) {
        const n = dp[i][j][k];
        out[idx++] = n > 0n ? Math.log10(Number(n) || 1) : 0;
      }
    }
  }
  return out;
}

/**
 * Generate centered 3D positions for the (a+1)*(b+1)*(c+1) grid nodes,
 * spaced by `latticeConstant`. Centered on the origin to match the existing
 * crystal scene's coordinate system.
 */
export function generatePathGrid(a, b, c, latticeConstant) {
  const positions = [];
  const offsetX = (a * latticeConstant) / 2;
  const offsetY = (b * latticeConstant) / 2;
  const offsetZ = (c * latticeConstant) / 2;
  for (let i = 0; i <= a; i++) {
    for (let j = 0; j <= b; j++) {
      for (let k = 0; k <= c; k++) {
        positions.push({
          gridIndex: [i, j, k],
          position: [
            i * latticeConstant - offsetX,
            j * latticeConstant - offsetY,
            k * latticeConstant - offsetZ,
          ],
        });
      }
    }
  }
  return positions;
}

/**
 * Generate edge segments between adjacent grid nodes in +x, +y, +z directions.
 * Each edge: { start: [x,y,z], end: [x,y,z] }.
 */
export function generatePathEdges(a, b, c, latticeConstant) {
  const offsetX = (a * latticeConstant) / 2;
  const offsetY = (b * latticeConstant) / 2;
  const offsetZ = (c * latticeConstant) / 2;
  const pos = (i, j, k) => [
    i * latticeConstant - offsetX,
    j * latticeConstant - offsetY,
    k * latticeConstant - offsetZ,
  ];
  const edges = [];
  for (let i = 0; i <= a; i++) {
    for (let j = 0; j <= b; j++) {
      for (let k = 0; k <= c; k++) {
        if (i < a) edges.push({ start: pos(i, j, k), end: pos(i + 1, j, k) });
        if (j < b) edges.push({ start: pos(i, j, k), end: pos(i, j + 1, k) });
        if (k < c) edges.push({ start: pos(i, j, k), end: pos(i, j, k + 1) });
      }
    }
  }
  return edges;
}

/* ── Self-tests (cheap; verified at module load in dev) ── */

if (import.meta?.env?.DEV) {
  // 2D case (c=0) reduces to Project Euler #15: paths(20,20,0) = C(40,20)
  const dp = buildPathDP(20, 20, 0);
  const dpResult = dp[20][20][0];
  const closedForm = trinomialCoefficient(20, 20, 0);
  const expected = 137846528820n;
  if (dpResult !== expected || closedForm !== expected) {
    console.error('latticePaths self-test FAILED', { dpResult, closedForm, expected });
  }
}
