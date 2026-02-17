import { useRef, useMemo, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Environment } from '@react-three/drei';
import * as THREE from 'three';
import { generateLattice, generateBonds, generateUnitCell } from '../data/latticeGenerator';
import { computePlane, clipPlaneToBox, atomsOnPlane } from '../data/millerIndices';

function Atom({ position, color, glowColor, radius = 0.3, opacity = 1, highlighted = false }) {
  const ringRef = useRef();

  // Pulsing ring animation for highlighted atoms
  useFrame((state) => {
    if (highlighted && ringRef.current) {
      const t = state.clock.getElapsedTime();
      const pulse = 1.0 + 0.15 * Math.sin(t * 3);
      ringRef.current.scale.setScalar(pulse);
      ringRef.current.material.opacity = 0.3 + 0.15 * Math.sin(t * 3 + 1);
    }
  });

  return (
    <group position={position}>
      <mesh>
        <sphereGeometry args={[radius, 32, 32]} />
        <meshPhysicalMaterial
          color={highlighted ? '#ffffff' : color}
          metalness={highlighted ? 0.5 : 0.3}
          roughness={0.2}
          transparent={opacity < 1}
          opacity={opacity}
          envMapIntensity={highlighted ? 1.2 : 0.8}
          emissive={highlighted ? '#60dfff' : '#000000'}
          emissiveIntensity={highlighted ? 0.6 : 0}
        />
      </mesh>
      {/* Standard glow shell */}
      {!highlighted && (
        <mesh>
          <sphereGeometry args={[radius * 1.15, 16, 16]} />
          <meshBasicMaterial
            color={glowColor}
            transparent
            opacity={0.08}
            side={THREE.BackSide}
          />
        </mesh>
      )}
      {/* Highlighted: bright animated ring */}
      {highlighted && (
        <mesh ref={ringRef}>
          <sphereGeometry args={[radius * 1.4, 16, 16]} />
          <meshBasicMaterial
            color="#60dfff"
            transparent
            opacity={0.3}
            side={THREE.BackSide}
          />
        </mesh>
      )}
    </group>
  );
}

function Bond({ start, end, color }) {
  const { position, quaternion, length } = useMemo(() => {
    const s = new THREE.Vector3(...start);
    const e = new THREE.Vector3(...end);
    const mid = new THREE.Vector3().addVectors(s, e).multiplyScalar(0.5);
    const dir = new THREE.Vector3().subVectors(e, s);
    const len = dir.length();
    dir.normalize();
    const quat = new THREE.Quaternion();
    quat.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
    return { position: mid, quaternion: quat, length: len };
  }, [start, end]);

  return (
    <mesh position={position} quaternion={quaternion}>
      <cylinderGeometry args={[0.04, 0.04, length, 8]} />
      <meshPhysicalMaterial
        color={color}
        metalness={0.4}
        roughness={0.3}
        transparent
        opacity={0.5}
      />
    </mesh>
  );
}

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

    // Fill geometry (triangle fan)
    const positions = [];
    const normals = [];
    for (let i = 1; i < vertices.length - 1; i++) {
      positions.push(...vertices[0], ...vertices[i], ...vertices[i + 1]);
      normals.push(...planeNormal, ...planeNormal, ...planeNormal);
    }
    const fillGeo = new THREE.BufferGeometry();
    fillGeo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    fillGeo.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));

    // Edge wireframe (closed loop)
    const edgePoints = edgeLoop.map(v => new THREE.Vector3(...v));
    edgePoints.push(edgePoints[0].clone());
    const edgeGeo = new THREE.BufferGeometry().setFromPoints(edgePoints);

    // Normal arrow at centroid
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
    // Orient the cone along the normal
    const arrowQuat = new THREE.Quaternion();
    arrowQuat.setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(...planeNormal));

    const arrowLineGeo = new THREE.BufferGeometry().setFromPoints([arrowStart, arrowEnd]);

    return { fillGeo, edgeGeo, arrowLineGeo, arrowEnd, arrowQuat };
  }, [structure, latticeConstant, h, k, l, show, offset, latticeBounds]);

  if (!show || !planeData) return null;
  const { fillGeo, edgeGeo, arrowLineGeo, arrowEnd, arrowQuat } = planeData;

  return (
    <group>
      {/* Filled plane — front */}
      <mesh geometry={fillGeo}>
        <meshPhysicalMaterial
          color={PLANE_COLOR}
          transparent
          opacity={opacity}
          side={THREE.FrontSide}
          metalness={0.0}
          roughness={0.6}
          depthWrite={false}
        />
      </mesh>
      {/* Filled plane — back */}
      <mesh geometry={fillGeo}>
        <meshPhysicalMaterial
          color={PLANE_COLOR}
          transparent
          opacity={opacity * 0.6}
          side={THREE.BackSide}
          metalness={0.0}
          roughness={0.6}
          depthWrite={false}
        />
      </mesh>
      {/* Edge outline */}
      <line geometry={edgeGeo}>
        <lineBasicMaterial color={PLANE_EDGE_COLOR} transparent opacity={Math.min(1, opacity + 0.3)} />
      </line>
      {/* Normal direction arrow shaft */}
      <line geometry={arrowLineGeo}>
        <lineBasicMaterial color={PLANE_EDGE_COLOR} transparent opacity={0.6} />
      </line>
      {/* Arrow tip cone */}
      <mesh position={arrowEnd} quaternion={arrowQuat}>
        <coneGeometry args={[0.08, 0.25, 8]} />
        <meshBasicMaterial color={PLANE_EDGE_COLOR} transparent opacity={0.7} />
      </mesh>
    </group>
  );
}

function RotatingGroup({ children, autoRotate, speed = 0.3 }) {
  const groupRef = useRef();
  useFrame((_, delta) => {
    if (autoRotate && groupRef.current) {
      groupRef.current.rotation.y += delta * speed;
    }
  });
  return <group ref={groupRef}>{children}</group>;
}

function Lattice({ structure, repeat, latticeConstant, showBonds, showUnitCell, autoRotate, atomRadius, millerIndices, onPlaneStats }) {
  const a = latticeConstant || structure.defaultA;

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

  // Report stats for sidebar
  useEffect(() => {
    if (onPlaneStats) {
      onPlaneStats({ atomCount: highlightedAtoms.size, totalAtoms: atoms.length });
    }
  }, [highlightedAtoms.size, atoms.length, onPlaneStats]);

  return (
    <RotatingGroup autoRotate={autoRotate}>
      {atoms.map((atom, i) => (
        <Atom
          key={i}
          position={atom.position}
          color={structure.color}
          glowColor={structure.glowColor}
          radius={atomRadius}
          highlighted={highlightedAtoms.has(i)}
        />
      ))}
      {bonds.map((bond, i) => (
        <Bond key={`b-${i}`} start={bond.start} end={bond.end} color={structure.color} />
      ))}
      <UnitCellWireframe structure={structure} latticeConstant={a} visible={showUnitCell} />
      <MillerPlane
        structure={structure}
        latticeConstant={a}
        millerIndices={millerIndices}
        latticeBounds={latticeBounds}
      />
    </RotatingGroup>
  );
}

export default function CrystalScene({ structure, settings, millerIndices, onPlaneStats }) {
  const {
    repeat = 2, latticeConstant, showBonds = true,
    showUnitCell = true, autoRotate = true, atomRadius = 0.3,
  } = settings;

  return (
    <Canvas
      camera={{ position: [8, 6, 8], fov: 45, near: 0.1, far: 100 }}
      style={{ background: 'transparent' }}
      gl={{ antialias: true, alpha: true }}
    >
      <ambientLight intensity={0.4} />
      <directionalLight position={[10, 10, 5]} intensity={1.0} />
      <directionalLight position={[-5, -5, -5]} intensity={0.3} />
      <pointLight position={[0, 0, 0]} intensity={0.2} color={structure.glowColor} />
      <Lattice
        structure={structure} repeat={repeat} latticeConstant={latticeConstant}
        showBonds={showBonds} showUnitCell={showUnitCell} autoRotate={autoRotate}
        atomRadius={atomRadius} millerIndices={millerIndices} onPlaneStats={onPlaneStats}
      />
      <OrbitControls enablePan enableZoom enableRotate minDistance={3} maxDistance={30} autoRotate={false} />
      <Environment preset="night" />
    </Canvas>
  );
}
