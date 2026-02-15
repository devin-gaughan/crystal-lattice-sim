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

  const handleStructureChange = useCallback((id) => {
    setActiveStructure(id);
    setSettings((prev) => ({
      ...prev,
      latticeConstant: null,
    }));
  }, []);

  const handleSettingsChange = useCallback((patch) => {
    setSettings((prev) => ({ ...prev, ...patch }));
  }, []);

  const structure = STRUCTURES[activeStructure];

  return (
    <div className="app">
      <Sidebar
        activeStructure={activeStructure}
        settings={settings}
        onStructureChange={handleStructureChange}
        onSettingsChange={handleSettingsChange}
      />
      <main className="viewport">
        <CrystalScene structure={structure} settings={settings} />
      </main>
    </div>
  );
}

export default App;
