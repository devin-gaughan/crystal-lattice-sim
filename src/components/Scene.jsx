import { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Environment } from '@react-three/drei';
import * as THREE from 'three';
import { generateLattice, generateBonds, generateUnitCell } from '../data/latticeGenerator';

function Atom({ position, color, glowColor, radius = 0.3, opacity = 1 }) {
  const meshRef = useRef();
  
  return (
    <group position={position}>
      <mesh ref={meshRef}>
        <sphereGeometry args={[radius, 32, 32]} />
        <meshPhysicalMaterial
          color={color}
          metalness={0.3}
          roughness={0.2}
          transparent={opacity < 1}
          opacity={opacity}
          envMapIntensity={0.8}
        />
      </mesh>
      {/* Glow shell */}
      <mesh>
        <sphereGeometry args={[radius * 1.15, 16, 16]} />
        <meshBasicMaterial
          color={glowColor}
          transparent
          opacity={0.08}
          side={THREE.BackSide}
        />
      </mesh>
    </group>
  );
}

function Bond({ start, end, color }) {
  const ref = useRef();
  
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
          corners[i][0] - offset,
          corners[i][1] - offset,
          corners[i][2] - offset
        ),
        new THREE.Vector3(
          corners[j][0] - offset,
          corners[j][1] - offset,
          corners[j][2] - offset
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

function RotatingGroup({ children, autoRotate, speed = 0.3 }) {
  const groupRef = useRef();
  
  useFrame((_, delta) => {
    if (autoRotate && groupRef.current) {
      groupRef.current.rotation.y += delta * speed;
    }
  });
  
  return <group ref={groupRef}>{children}</group>;
}

function Lattice({ structure, repeat, latticeConstant, showBonds, showUnitCell, autoRotate, atomRadius }) {
  const a = latticeConstant || structure.defaultA;
  
  const atoms = useMemo(
    () => generateLattice(structure, repeat, a),
    [structure, repeat, a]
  );

  const bonds = useMemo(
    () => (showBonds ? generateBonds(atoms, structure, a) : []),
    [atoms, structure, a, showBonds]
  );

  return (
    <RotatingGroup autoRotate={autoRotate}>
      {atoms.map((atom, i) => (
        <Atom
          key={i}
          position={atom.position}
          color={structure.color}
          glowColor={structure.glowColor}
          radius={atomRadius}
        />
      ))}
      {bonds.map((bond, i) => (
        <Bond
          key={`b-${i}`}
          start={bond.start}
          end={bond.end}
          color={structure.color}
        />
      ))}
      <UnitCellWireframe
        structure={structure}
        latticeConstant={a}
        visible={showUnitCell}
      />
    </RotatingGroup>
  );
}

export default function CrystalScene({ structure, settings }) {
  const {
    repeat = 2,
    latticeConstant,
    showBonds = true,
    showUnitCell = true,
    autoRotate = true,
    atomRadius = 0.3,
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
        structure={structure}
        repeat={repeat}
        latticeConstant={latticeConstant}
        showBonds={showBonds}
        showUnitCell={showUnitCell}
        autoRotate={autoRotate}
        atomRadius={atomRadius}
      />
      
      <OrbitControls
        enablePan={true}
        enableZoom={true}
        enableRotate={true}
        minDistance={3}
        maxDistance={30}
        autoRotate={false}
      />
      <Environment preset="night" />
    </Canvas>
  );
}
