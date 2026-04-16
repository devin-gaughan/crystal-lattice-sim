import { useState, useCallback, useMemo, useRef } from 'react';
import CrystalScene from './components/Scene';
import Sidebar from './components/Sidebar';
import ErrorBoundary from './components/ErrorBoundary';
import { STRUCTURES } from './data/lattices';
import { generateXRDPattern, WAVELENGTHS } from './data/diffraction';
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
  const [wavelength, setWavelength] = useState('Cu K\u03b1');
  const [temperature, setTemperature] = useState(0); // Debye-Waller temp (K)
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const screenshotRef = useRef(null);

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

  const handleScreenshot = useCallback(() => {
    if (screenshotRef.current?.current) {
      try {
        const dataUrl = screenshotRef.current.current();
        const link = document.createElement('a');
        link.download = `crystal-${activeStructure}.png`;
        link.href = dataUrl;
        link.click();
      } catch {
        // Canvas might not support toDataURL in some contexts
      }
    }
  }, [activeStructure]);

  const handleScreenshotRef = useCallback((ref) => {
    screenshotRef.current = ref;
  }, []);

  const structure = STRUCTURES[activeStructure];
  const a = settings.latticeConstant || structure.defaultA;
  const lambda = WAVELENGTHS[wavelength];

  const xrdPeaks = useMemo(
    () => generateXRDPattern(structure, a, lambda, 6, 140, temperature),
    [structure, a, lambda, temperature]
  );

  return (
    <div className="app">
      {/* Mobile toggle */}
      <button
        className={`sidebar-toggle ${sidebarOpen ? 'open' : ''}`}
        onClick={() => setSidebarOpen(v => !v)}
        aria-label="Toggle sidebar"
      >
        <span /><span /><span />
      </button>

      <Sidebar
        activeStructure={activeStructure}
        settings={settings}
        millerIndices={millerIndices}
        planeStats={planeStats}
        xrdPeaks={xrdPeaks}
        wavelength={wavelength}
        temperature={temperature}
        sidebarOpen={sidebarOpen}
        onStructureChange={handleStructureChange}
        onSettingsChange={handleSettingsChange}
        onMillerChange={handleMillerChange}
        onWavelengthChange={setWavelength}
        onTemperatureChange={setTemperature}
        onScreenshot={handleScreenshot}
      />
      <main className="viewport">
        <ErrorBoundary>
          <CrystalScene
            structure={structure}
            settings={settings}
            millerIndices={millerIndices}
            onPlaneStats={handlePlaneStats}
            onScreenshot={handleScreenshotRef}
          />
        </ErrorBoundary>
        {structure.atomTypes && (() => {
          const uniqueTypes = [...new Set(structure.atomTypes)];
          if (uniqueTypes.length < 2) return null;
          const colors = [structure.color, structure.secondaryColor, structure.tertiaryColor];
          return (
            <div className="atom-legend">
              {uniqueTypes.map((type, i) => (
                <div key={type} className="atom-legend-item">
                  <span className="atom-legend-dot" style={{ background: colors[i] || structure.color }} />
                  <span className="atom-legend-label">{type}</span>
                </div>
              ))}
            </div>
          );
        })()}
      </main>
    </div>
  );
}

export default App;
