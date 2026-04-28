import { useRef, useMemo, useEffect, useState, useCallback } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Environment, Html } from '@react-three/drei';
import * as THREE from 'three';
import { generateLattice, generateBonds, generateUnitCell } from '../data/latticeGenerator';
import { computePlane, clipPlaneToBox, atomsOnPlane } from '../data/millerIndices';
import { ATOMIC_RADII } from '../data/lattices';
import {
  buildPathDP,
  logCountField,
  generatePathGrid,
  generatePathEdges,
} from '../data/latticePaths';

/* ── Helpers ── */

/** Resolve per-atom color/glow for multi-atom structures. */
function getAtomColors(structure, atomType) {
  if (!atomType || !structure.atomTypes) {
    return { color: structure.color, glowColor: structure.glowColor };
  }
  const uniqueTypes = [...new Set(structure.atomTypes)];
  const speciesIdx = uniqueTypes.indexOf(atomType);
  if (speciesIdx === 0) {
    return { color: structure.color, glowColor: structure.glowColor };
  } else if (speciesIdx === 1) {
    return { color: structure.secondaryColor || structure.color, glowColor: structure.glowColor };
  } else {
    return { color: structure.tertiaryColor || structure.color, glowColor: structure.glowColor };
  }
}

/** Compute radius scale factor for an atom type relative to the base atomRadius. */
function getRadiusScale(structure, atomType) {
  if (!atomType || !structure.atomTypes) return 1;
  const uniqueTypes = [...new Set(structure.atomTypes)];
  const radii = uniqueTypes.map(t => ATOMIC_RADII[t] || 1.2);
  const maxR = Math.max(...radii);
  const r = ATOMIC_RADII[atomType] || 1.2;
  // Scale so largest species = 1.0, smallest proportionally smaller (min 0.5)
  return Math.max(0.5, r / maxR);
}

/* ── Instanced Atoms ── */

const _tempObject = new THREE.Object3D();
const _tempColor = new THREE.Color();

function InstancedAtoms({ atoms, structure, atomRadius, highlightedAtoms, onAtomClick }) {
  // Group atoms by their visual properties (color + radius scale)
  const groups = useMemo(() => {
    const map = new Map();
    atoms.forEach((atom, i) => {
      const { color, glowColor } = getAtomColors(structure, atom.atomType);
      const rScale = getRadiusScale(structure, atom.atomType);
      const key = `${color}|${rScale}`;
      if (!map.has(key)) {
        map.set(key, { color, glowColor, rScale, indices: [] });
      }
      map.get(key).indices.push(i);
    });
    return [...map.values()];
  }, [atoms, structure]);

  return (
    <>
      {groups.map((group, gi) => (
        <AtomInstanceGroup
          key={`${gi}-${group.color}`}
          atoms={atoms}
          indices={group.indices}
          color={group.color}
          glowColor={group.glowColor}
          baseRadius={atomRadius * group.rScale}
          highlightedAtoms={highlightedAtoms}
          onAtomClick={onAtomClick}
        />
      ))}
    </>
  );
}

function AtomInstanceGroup({ atoms, indices, color, glowColor, baseRadius, highlightedAtoms, onAtomClick }) {
  const meshRef = useRef();
  const glowRef = useRef();
  const count = indices.length;

  // Update instance matrices and colors
  useEffect(() => {
    if (!meshRef.current) return;
    const mesh = meshRef.current;
    const glowMesh = glowRef.current;

    for (let ii = 0; ii < count; ii++) {
      const idx = indices[ii];
      const atom = atoms[idx];
      const highlighted = highlightedAtoms.has(idx);
      const r = highlighted ? baseRadius * 1.05 : baseRadius;

      _tempObject.position.set(...atom.position);
      _tempObject.scale.setScalar(r);
      _tempObject.updateMatrix();
      mesh.setMatrixAt(ii, _tempObject.matrix);

      if (highlighted) {
        _tempColor.set('#ffffff');
      } else {
        _tempColor.set(color);
      }
      mesh.setColorAt(ii, _tempColor);

      // Glow shell
      if (glowMesh) {
        _tempObject.scale.setScalar(r * 1.15);
        _tempObject.updateMatrix();
        glowMesh.setMatrixAt(ii, _tempObject.matrix);
      }
    }
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    if (glowMesh) {
      glowMesh.instanceMatrix.needsUpdate = true;
    }
  }, [atoms, indices, count, baseRadius, highlightedAtoms, color]);

  const handleClick = useCallback((e) => {
    e.stopPropagation();
    if (onAtomClick && e.instanceId !== undefined) {
      const atomIdx = indices[e.instanceId];
      onAtomClick(atomIdx, atoms[atomIdx]);
    }
  }, [onAtomClick, indices, atoms]);

  return (
    <group>
      {/* Main atom spheres */}
      <instancedMesh
        ref={meshRef}
        args={[null, null, count]}
        onClick={handleClick}
      >
        <sphereGeometry args={[1, 24, 24]} />
        <meshPhysicalMaterial
          metalness={0.3}
          roughness={0.2}
          envMapIntensity={0.8}
        />
      </instancedMesh>
      {/* Glow shells */}
      <instancedMesh ref={glowRef} args={[null, null, count]}>
        <sphereGeometry args={[1, 12, 12]} />
        <meshBasicMaterial
          color={glowColor}
          transparent
          opacity={0.08}
          side={THREE.BackSide}
        />
      </instancedMesh>
    </group>
  );
}

/* ── Atom Tooltip ── */

function AtomTooltip({ atom, structure, position }) {
  if (!atom) return null;
  const { color } = getAtomColors(structure, atom.atomType);
  const label = atom.atomType || structure.abbrev || structure.name;

  return (
    <Html position={position} center style={{ pointerEvents: 'none' }}>
      <div className="atom-tooltip">
        <div className="atom-tooltip-header">
          <span className="atom-tooltip-dot" style={{ background: color }} />
          <span className="atom-tooltip-name">{label}</span>
        </div>
        <div className="atom-tooltip-coords">
          ({atom.position[0].toFixed(2)}, {atom.position[1].toFixed(2)}, {atom.position[2].toFixed(2)}) A
        </div>
      </div>
    </Html>
  );
}

/* ── Bonds ── */

function Bonds({ bonds, color }) {
  const meshData = useMemo(() => {
    return bonds.map(({ start, end }) => {
      const s = new THREE.Vector3(...start);
      const e = new THREE.Vector3(...end);
      const mid = new THREE.Vector3().addVectors(s, e).multiplyScalar(0.5);
      const dir = new THREE.Vector3().subVectors(e, s);
      const len = dir.length();
      dir.normalize();
      const quat = new THREE.Quaternion();
      quat.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
      return { position: mid.toArray(), quaternion: quat, length: len };
    });
  }, [bonds]);

  const bondRef = useRef();

  useEffect(() => {
    if (!bondRef.current || meshData.length === 0) return;
    const mesh = bondRef.current;
    for (let i = 0; i < meshData.length; i++) {
      const { position, quaternion, length } = meshData[i];
      _tempObject.position.set(...position);
      _tempObject.quaternion.copy(quaternion);
      _tempObject.scale.set(1, length, 1);
      _tempObject.updateMatrix();
      mesh.setMatrixAt(i, _tempObject.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  }, [meshData]);

  if (meshData.length === 0) return null;

  return (
    <instancedMesh ref={bondRef} args={[null, null, meshData.length]}>
      <cylinderGeometry args={[0.04, 0.04, 1, 8]} />
      <meshPhysicalMaterial
        color={color}
        metalness={0.4}
        roughness={0.3}
        transparent
        opacity={0.5}
      />
    </instancedMesh>
  );
}

/* ── Unit Cell Wireframe ── */

function UnitCellWireframe({ structure, latticeConstant, visible }) {
  const lines = useMemo(() => {
    if (!visible) return null;
    const { corners, edges } = generateUnitCell(structure, latticeConstant);
    const offset = latticeConstant ? latticeConstant / 2 : structure.defaultA / 2;
    return edges.map(([i, j], idx) => {
      const points = [
        new THREE.Vector3(
          corners[i][0] - offset, corners[i][1] - offset, corners[i][2] - offset
        ),
        new THREE.Vector3(
          corners[j][0] - offset, corners[j][1] - offset, corners[j][2] - offset
        ),
      ];
      const geometry = new THREE.BufferGeometry().setFromPoints(points);
      return (
        <lineSegments key={idx} geometry={geometry}>
          <lineBasicMaterial color="#ffffff" transparent opacity={0.25} />
        </lineSegments>
      );
    });
  }, [structure, latticeConstant, visible]);

  if (!visible) return null;
  return <group>{lines}</group>;
}

/* ── Miller Plane ── */
const PLANE_COLOR = '#60dfff';
const PLANE_EDGE_COLOR = '#90eeff';

function MillerPlane({ structure, latticeConstant, millerIndices, latticeBounds }) {
  const { h, k, l, show, offset, opacity } = millerIndices;

  const planeData = useMemo(() => {
    if (!show || (h === 0 && k === 0 && l === 0)) return null;

    const a = latticeConstant || structure.defaultA;
    const { planeNormal, dSpacing } = computePlane(h, k, l, structure.vectors, a);
    const { vertices, edgeLoop } = clipPlaneToBox(planeNormal, offset * dSpacing, latticeBounds);
    if (vertices.length < 3) return null;

    const positions = [];
    const normals = [];
    for (let i = 1; i < vertices.length - 1; i++) {
      positions.push(...vertices[0], ...vertices[i], ...vertices[i + 1]);
      normals.push(...planeNormal, ...planeNormal, ...planeNormal);
    }
    const fillGeo = new THREE.BufferGeometry();
    fillGeo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    fillGeo.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));

    const edgePoints = edgeLoop.map(v => new THREE.Vector3(...v));
    edgePoints.push(edgePoints[0].clone());
    const edgeGeo = new THREE.BufferGeometry().setFromPoints(edgePoints);

    const cx = vertices.reduce((s, v) => s + v[0], 0) / vertices.length;
    const cy = vertices.reduce((s, v) => s + v[1], 0) / vertices.length;
    const cz = vertices.reduce((s, v) => s + v[2], 0) / vertices.length;
    const arrowLen = a * 0.6;
    const arrowStart = new THREE.Vector3(cx, cy, cz);
    const arrowEnd = new THREE.Vector3(
      cx + planeNormal[0] * arrowLen,
      cy + planeNormal[1] * arrowLen,
      cz + planeNormal[2] * arrowLen
    );
    const arrowQuat = new THREE.Quaternion();
    arrowQuat.setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(...planeNormal));
    const arrowLineGeo = new THREE.BufferGeometry().setFromPoints([arrowStart, arrowEnd]);

    return { fillGeo, edgeGeo, arrowLineGeo, arrowEnd, arrowQuat };
  }, [structure, latticeConstant, h, k, l, show, offset, latticeBounds]);

  if (!show || !planeData) return null;
  const { fillGeo, edgeGeo, arrowLineGeo, arrowEnd, arrowQuat } = planeData;

  return (
    <group>
      <mesh geometry={fillGeo}>
        <meshPhysicalMaterial
          color={PLANE_COLOR} transparent opacity={opacity}
          side={THREE.FrontSide} metalness={0.0} roughness={0.6} depthWrite={false}
        />
      </mesh>
      <mesh geometry={fillGeo}>
        <meshPhysicalMaterial
          color={PLANE_COLOR} transparent opacity={opacity * 0.6}
          side={THREE.BackSide} metalness={0.0} roughness={0.6} depthWrite={false}
        />
      </mesh>
      <line geometry={edgeGeo}>
        <lineBasicMaterial color={PLANE_EDGE_COLOR} transparent opacity={Math.min(1, opacity + 0.3)} />
      </line>
      <line geometry={arrowLineGeo}>
        <lineBasicMaterial color={PLANE_EDGE_COLOR} transparent opacity={0.6} />
      </line>
      <mesh position={arrowEnd} quaternion={arrowQuat}>
        <coneGeometry args={[0.08, 0.25, 8]} />
        <meshBasicMaterial color={PLANE_EDGE_COLOR} transparent opacity={0.7} />
      </mesh>
    </group>
  );
}

/* ── Lattice Path Overlay (Dynamic Programming visualization) ── */

const PATH_NODE_COLOR = new THREE.Color('#d4af37');     // Auraeon champagne gold
const PATH_NODE_DIM = new THREE.Color('#2a2a2a');       // Unfilled cells
const PATH_EDGE_COLOR = '#9c8748';                       // Edges between nodes

function LatticePathOverlay({ latticePaths, latticeConstant }) {
  const { a, b, c, playing, showEdges, resetKey, show } = latticePaths;

  // Compute DP, positions, and color field. Cheap (max 7^3 = 343 cells).
  const { positions, edges, logField, maxLog, total } = useMemo(() => {
    const dpTable = buildPathDP(a, b, c);
    const pos = generatePathGrid(a, b, c, latticeConstant);
    const edg = generatePathEdges(a, b, c, latticeConstant);
    const lf = logCountField(dpTable, a, b, c);
    let mx = 0;
    for (const v of lf) if (v > mx) mx = v;
    return {
      positions: pos,
      edges: edg,
      logField: lf,
      maxLog: mx || 1, // avoid div-by-zero for 1x1x1 case
      total: pos.length,
    };
  }, [a, b, c, latticeConstant]);

  const [step, setStep] = useState(0);
  const tickAccum = useRef(0);

  // Reset step when dimensions/resetKey change OR when `show` toggles.
  // React 19 idiom: compare a signature during render rather than setState in
  // an effect (avoids the react-hooks/set-state-in-effect lint and the extra
  // render that effect-based resets cause).
  const resetSignature = `${a}-${b}-${c}-${resetKey}-${show ? 'on' : 'off'}`;
  const [lastSignature, setLastSignature] = useState(resetSignature);
  if (resetSignature !== lastSignature) {
    setLastSignature(resetSignature);
    setStep(0);
  }

  // Drain the frame accumulator whenever step is forced back to 0 (avoids a
  // big jump on the next frame). Touching refs in an effect is fine — the
  // restriction is only on touching refs during render.
  useEffect(() => {
    if (step === 0) tickAccum.current = 0;
  }, [step]);

  useFrame((_, delta) => {
    if (!show || !playing || step >= total) return;
    tickAccum.current += delta;
    // Cover the full grid in ~3 seconds, with a minimum sensible rate
    const cellsPerSecond = Math.max(20, total / 3);
    const interval = 1 / cellsPerSecond;
    if (tickAccum.current >= interval) {
      const advance = Math.floor(tickAccum.current / interval);
      tickAccum.current -= advance * interval;
      setStep((s) => Math.min(total, s + advance));
    }
  });

  // Update instanced node colors when step changes
  const nodeMeshRef = useRef();
  const nodeGlowRef = useRef();

  useEffect(() => {
    const mesh = nodeMeshRef.current;
    const glow = nodeGlowRef.current;
    if (!mesh) return;

    const dummy = new THREE.Object3D();
    const color = new THREE.Color();
    const baseRadius = latticeConstant * 0.18;

    for (let idx = 0; idx < positions.length; idx++) {
      const { position } = positions[idx];
      const filled = idx < step;
      const r = filled ? baseRadius : baseRadius * 0.55;

      dummy.position.set(...position);
      dummy.scale.setScalar(r);
      dummy.updateMatrix();
      mesh.setMatrixAt(idx, dummy.matrix);

      if (filled) {
        // Interpolate dim → champagne gold by log path count
        const t = logField[idx] / maxLog;
        color.copy(PATH_NODE_DIM).lerp(PATH_NODE_COLOR, 0.25 + 0.75 * t);
      } else {
        color.copy(PATH_NODE_DIM);
      }
      mesh.setColorAt(idx, color);

      if (glow) {
        dummy.scale.setScalar(r * 1.3);
        dummy.updateMatrix();
        glow.setMatrixAt(idx, dummy.matrix);
      }
    }
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    if (glow) glow.instanceMatrix.needsUpdate = true;
  }, [positions, logField, maxLog, step, latticeConstant]);

  // Edge geometry — recomputed only when grid dims change
  const edgeGeometry = useMemo(() => {
    const pts = [];
    for (const e of edges) {
      pts.push(new THREE.Vector3(...e.start));
      pts.push(new THREE.Vector3(...e.end));
    }
    return new THREE.BufferGeometry().setFromPoints(pts);
  }, [edges]);

  if (!show) return null;

  return (
    <group>
      {/* Edges (DP connectivity) */}
      {showEdges && (
        <lineSegments geometry={edgeGeometry}>
          <lineBasicMaterial
            color={PATH_EDGE_COLOR}
            transparent
            opacity={0.18}
          />
        </lineSegments>
      )}

      {/* Glow shells */}
      <instancedMesh ref={nodeGlowRef} args={[null, null, positions.length]}>
        <sphereGeometry args={[1, 12, 12]} />
        <meshBasicMaterial
          color={PATH_NODE_COLOR}
          transparent
          opacity={0.12}
          side={THREE.BackSide}
        />
      </instancedMesh>

      {/* Main nodes */}
      <instancedMesh ref={nodeMeshRef} args={[null, null, positions.length]}>
        <sphereGeometry args={[1, 20, 20]} />
        <meshPhysicalMaterial
          metalness={0.5}
          roughness={0.25}
          envMapIntensity={1.0}
          vertexColors
        />
      </instancedMesh>

      {/* Origin and target labels */}
      <Html position={positions[0].position} center style={{ pointerEvents: 'none' }}>
        <div className="path-label path-origin">(0,0,0)</div>
      </Html>
      <Html position={positions[positions.length - 1].position} center style={{ pointerEvents: 'none' }}>
        <div className="path-label path-target">({a},{b},{c})</div>
      </Html>
    </group>
  );
}

/* ── Rotating Group ── */

function RotatingGroup({ children, autoRotate, speed = 0.3 }) {
  const groupRef = useRef();
  useFrame((_, delta) => {
    if (autoRotate && groupRef.current) {
      groupRef.current.rotation.y += delta * speed;
    }
  });
  return <group ref={groupRef}>{children}</group>;
}

/* ── Atom Legend (3D overlay) ── */

function AtomLegend({ structure }) {
  if (!structure.atomTypes) return null;
  const uniqueTypes = [...new Set(structure.atomTypes)];
  if (uniqueTypes.length < 2) return null;

  const entries = uniqueTypes.map((type) => {
    const { color } = getAtomColors(structure, type);
    return { type, color };
  });

  return (
    <Html position={[0, 0, 0]} style={{ pointerEvents: 'none' }} zIndexRange={[100, 0]}>
      <div className="atom-legend">
        {entries.map(({ type, color }) => (
          <div key={type} className="atom-legend-item">
            <span className="atom-legend-dot" style={{ background: color }} />
            <span className="atom-legend-label">{type}</span>
          </div>
        ))}
      </div>
    </Html>
  );
}

/* ── Screenshot helper ── */

function ScreenshotHelper({ screenshotRef }) {
  const { gl } = useThree();
  useEffect(() => {
    if (screenshotRef) {
      screenshotRef.current = () => {
        gl.render(gl.scene || gl._scene, gl.camera || gl._camera);
        return gl.domElement.toDataURL('image/png');
      };
    }
  }, [gl, screenshotRef]);
  return null;
}

/* ── Main Lattice ── */

function Lattice({ structure, repeat, latticeConstant, showBonds, showUnitCell, autoRotate, atomRadius, millerIndices, latticePaths, onPlaneStats, onAtomClick, selectedAtomIdx }) {
  const a = latticeConstant || structure.defaultA;
  const pathMode = latticePaths && latticePaths.show;

  const atoms = useMemo(
    () => generateLattice(structure, repeat, a),
    [structure, repeat, a]
  );

  const bonds = useMemo(
    () => (showBonds ? generateBonds(atoms, structure, a) : []),
    [atoms, structure, a, showBonds]
  );

  const latticeBounds = useMemo(() => {
    if (atoms.length === 0) return 5;
    let maxDist = 0;
    for (const atom of atoms) {
      for (let i = 0; i < 3; i++) {
        maxDist = Math.max(maxDist, Math.abs(atom.position[i]));
      }
    }
    return maxDist + a * 0.3;
  }, [atoms, a]);

  const highlightedAtoms = useMemo(() => {
    if (!millerIndices.show || (millerIndices.h === 0 && millerIndices.k === 0 && millerIndices.l === 0)) {
      return new Set();
    }
    const { planeNormal, dSpacing } = computePlane(
      millerIndices.h, millerIndices.k, millerIndices.l, structure.vectors, a
    );
    const tolerance = atomRadius * 1.0;
    return atomsOnPlane(atoms, planeNormal, millerIndices.offset * dSpacing, tolerance);
  }, [atoms, millerIndices, structure, a, atomRadius]);

  useEffect(() => {
    if (onPlaneStats) {
      onPlaneStats({ atomCount: highlightedAtoms.size, totalAtoms: atoms.length });
    }
  }, [highlightedAtoms.size, atoms.length, onPlaneStats]);

  // Selected atom for tooltip
  const selectedAtom = selectedAtomIdx != null ? atoms[selectedAtomIdx] : null;

  return (
    <RotatingGroup autoRotate={autoRotate}>
      {!pathMode && (
        <>
          <InstancedAtoms
            atoms={atoms}
            structure={structure}
            atomRadius={atomRadius}
            highlightedAtoms={highlightedAtoms}
            onAtomClick={onAtomClick}
          />
          <Bonds bonds={bonds} color={structure.color} />
          <UnitCellWireframe structure={structure} latticeConstant={a} visible={showUnitCell} />
          <MillerPlane
            structure={structure}
            latticeConstant={a}
            millerIndices={millerIndices}
            latticeBounds={latticeBounds}
          />
          {selectedAtom && (
            <AtomTooltip atom={selectedAtom} structure={structure} position={selectedAtom.position} />
          )}
        </>
      )}
      {pathMode && (
        <LatticePathOverlay latticePaths={latticePaths} latticeConstant={a} />
      )}
    </RotatingGroup>
  );
}

/* ── Camera Auto-Fit ──
 * Smoothly zooms the camera to frame the visible scene whenever `bounds` (a
 * half-extent radius from origin) changes. Keeps the user's current orbit
 * angle — only the radial distance is animated. Once the lerp settles, the
 * user has full manual control again until the next bounds change.
 */
function CameraAutoFit({ bounds, controlsRef }) {
  const camera = useThree(state => state.camera);
  const desiredDist = useRef(null);

  useEffect(() => {
    if (!bounds) return;
    // Bounding sphere radius of an axis-aligned cube with half-extent `bounds`.
    const radius = bounds * Math.sqrt(3);
    const fovRad = (camera.fov * Math.PI) / 180;
    // Distance to fit bounding sphere within vertical FOV with a 30% margin.
    const dist = (radius / Math.sin(fovRad / 2)) * 1.3;
    desiredDist.current = Math.max(camera.near * 2, dist);

    const controls = controlsRef.current;
    if (controls) {
      controls.minDistance = Math.max(2, dist * 0.25);
      controls.maxDistance = dist * 4;
      controls.target.set(0, 0, 0);
      controls.update();
    }
  }, [bounds, camera, controlsRef]);

  useFrame(() => {
    const target = desiredDist.current;
    if (target == null) return;
    const cur = camera.position.length();
    const diff = target - cur;
    if (Math.abs(diff) < 0.05) {
      desiredDist.current = null;
      return;
    }
    camera.position.setLength(cur + diff * 0.12);
    const controls = controlsRef.current;
    if (controls) controls.update();
  });

  return null;
}

/* ── Exported Scene ── */

export default function CrystalScene({ structure, settings, millerIndices, latticePaths, onPlaneStats, onScreenshot }) {
  const {
    repeat = 2, latticeConstant, showBonds = true,
    showUnitCell = true, autoRotate = true, atomRadius = 0.3,
  } = settings;

  // Effective lattice constant for size calculations (settings.latticeConstant
  // can be null until the user touches it; fall back to the structure default).
  const a = latticeConstant ?? structure.defaultA;

  // Half-extent of the visible volume — used by CameraAutoFit to frame the
  // scene on structure / repeat / lattice-path-dimension changes. We take the
  // larger of the crystal lattice extent and the lattice-path grid extent
  // (when active) so both fit comfortably in view.
  const cameraBounds = useMemo(() => {
    const crystalBounds = (repeat * a) / 2 + a * 0.3;
    if (latticePaths?.show) {
      const maxPathDim = Math.max(latticePaths.a, latticePaths.b, latticePaths.c);
      const pathBounds = (maxPathDim * a) / 2 + a * 0.5;
      return Math.max(crystalBounds, pathBounds);
    }
    return crystalBounds;
  }, [repeat, a, latticePaths]);

  const [selectedAtomIdx, setSelectedAtomIdx] = useState(null);
  const [prevStructure, setPrevStructure] = useState(structure);
  const screenshotRef = useRef(null);
  const controlsRef = useRef(null);

  // Deselect when structure changes (idiomatic React pattern for derived state reset)
  if (prevStructure !== structure) {
    setPrevStructure(structure);
    setSelectedAtomIdx(null);
  }

  const handleAtomClick = useCallback((idx) => {
    setSelectedAtomIdx(prev => prev === idx ? null : idx);
  }, []);

  // Expose screenshot function
  useEffect(() => {
    if (onScreenshot) {
      onScreenshot(screenshotRef);
    }
  }, [onScreenshot]);

  return (
    <Canvas
      camera={{ position: [8, 6, 8], fov: 45, near: 0.1, far: 100 }}
      style={{ background: 'transparent' }}
      gl={{ antialias: true, alpha: true, preserveDrawingBuffer: true }}
      onClick={(e) => {
        // Click on empty space clears selection
        if (e.target === e.currentTarget) setSelectedAtomIdx(null);
      }}
    >
      <ambientLight intensity={0.4} />
      <directionalLight position={[10, 10, 5]} intensity={1.0} />
      <directionalLight position={[-5, -5, -5]} intensity={0.3} />
      <pointLight position={[0, 0, 0]} intensity={0.2} color={structure.glowColor} />
      <Lattice
        structure={structure} repeat={repeat} latticeConstant={latticeConstant}
        showBonds={showBonds} showUnitCell={showUnitCell} autoRotate={autoRotate}
        atomRadius={atomRadius} millerIndices={millerIndices} latticePaths={latticePaths}
        onPlaneStats={onPlaneStats}
        onAtomClick={handleAtomClick} selectedAtomIdx={selectedAtomIdx}
      />
      <OrbitControls ref={controlsRef} enablePan enableZoom enableRotate minDistance={3} maxDistance={30} autoRotate={false} />
      <CameraAutoFit bounds={cameraBounds} controlsRef={controlsRef} />
      <Environment preset="night" />
      <ScreenshotHelper screenshotRef={screenshotRef} />
    </Canvas>
  );
}
