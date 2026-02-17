import { useState, useCallback } from 'react';
import CrystalScene from './components/Scene';
import Sidebar from './components/Sidebar';
import { STRUCTURES } from './data/lattices';
import './App.css';

function App() {
  const [activeStructure, setActiveStructure] = useState('fcc');
  const [settings, setSettings] = useState({
    repeat: 2,
    latticeConstant: null,
    showBonds: true,
    showUnitCell: true,
    autoRotate: true,
    atomRadius: 0.3,
  });

  const [millerIndices, setMillerIndices] = useState({
    h: 1, k: 1, l: 1,
    show: false,
    offset: 0,
    opacity: 0.45,
  });

  const [planeStats, setPlaneStats] = useState({ atomCount: 0, totalAtoms: 0 });

  const handleStructureChange = useCallback((id) => {
    setActiveStructure(id);
    setSettings((prev) => ({ ...prev, latticeConstant: null }));
  }, []);

  const handleSettingsChange = useCallback((patch) => {
    setSettings((prev) => ({ ...prev, ...patch }));
  }, []);

  const handleMillerChange = useCallback((patch) => {
    setMillerIndices((prev) => ({ ...prev, ...patch }));
  }, []);

  const handlePlaneStats = useCallback((stats) => {
    setPlaneStats(stats);
  }, []);

  const structure = STRUCTURES[activeStructure];

  return (
    <div className="app">
      <Sidebar
        activeStructure={activeStructure}
        settings={settings}
        millerIndices={millerIndices}
        planeStats={planeStats}
        onStructureChange={handleStructureChange}
        onSettingsChange={handleSettingsChange}
        onMillerChange={handleMillerChange}
      />
      <main className="viewport">
        <CrystalScene
          structure={structure}
          settings={settings}
          millerIndices={millerIndices}
          onPlaneStats={handlePlaneStats}
        />
      </main>
    </div>
  );
}

export default App;
