import { STRUCTURES, STRUCTURE_ORDER } from '../data/lattices';

export default function Sidebar({ activeStructure, settings, onStructureChange, onSettingsChange }) {
  const structure = STRUCTURES[activeStructure];

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <h1 className="logo">
          <img src={`${import.meta.env.BASE_URL}logo.svg`} alt="Auraeon" className="logo-img" style={{width: '36px', height: '36px', marginRight: '8px', verticalAlign: 'middle'}} />
          Auraeon Crystal Lattice
        </h1>
        <p className="logo-sub">Interactive Simulator</p>
      </div>

      {/* Structure selector */}
      <section className="panel">
        <h2 className="panel-title">Structure</h2>
        <div className="structure-grid">
          {STRUCTURE_ORDER.map((id) => {
            const s = STRUCTURES[id];
            return (
              <button
                key={id}
                className={`structure-btn ${activeStructure === id ? 'active' : ''}`}
                onClick={() => onStructureChange(id)}
                style={{
                  '--accent': s.color,
                  '--glow': s.glowColor,
                }}
              >
                <span className="structure-dot" />
                <span className="structure-label">{s.abbrev}</span>
              </button>
            );
          })}
        </div>
      </section>

      {/* Info */}
      <section className="panel info-panel">
        <h2 className="panel-title">{structure.name}</h2>
        <p className="info-desc">{structure.description}</p>
        <div className="info-stats">
          <div className="stat">
            <span className="stat-label">Coordination</span>
            <span className="stat-value">{structure.coordinationNumber}</span>
          </div>
          <div className="stat">
            <span className="stat-label">Packing</span>
            <span className="stat-value">{(structure.packingFraction * 100).toFixed(1)}%</span>
          </div>
          <div className="stat">
            <span className="stat-label">Lattice (Å)</span>
            <span className="stat-value">{(settings.latticeConstant || structure.defaultA).toFixed(2)}</span>
          </div>
        </div>
        <div className="info-examples">
          <span className="stat-label">Examples</span>
          <span className="examples-list">{structure.examples.join(', ')}</span>
        </div>
      </section>

      {/* Controls */}
      <section className="panel">
        <h2 className="panel-title">Controls</h2>
        
        <div className="control-row">
          <label className="control-label">Unit Cells</label>
          <div className="control-input">
            <input
              type="range"
              min={1}
              max={4}
              step={1}
              value={settings.repeat}
              onChange={(e) => onSettingsChange({ repeat: Number(e.target.value) })}
            />
            <span className="control-value">{settings.repeat}×{settings.repeat}×{settings.repeat}</span>
          </div>
        </div>

        <div className="control-row">
          <label className="control-label">Atom Size</label>
          <div className="control-input">
            <input
              type="range"
              min={0.1}
              max={0.6}
              step={0.05}
              value={settings.atomRadius}
              onChange={(e) => onSettingsChange({ atomRadius: Number(e.target.value) })}
            />
            <span className="control-value">{settings.atomRadius.toFixed(2)}</span>
          </div>
        </div>

        <div className="control-row">
          <label className="control-label">Lattice Constant</label>
          <div className="control-input">
            <input
              type="range"
              min={structure.defaultA * 0.5}
              max={structure.defaultA * 1.5}
              step={0.01}
              value={settings.latticeConstant || structure.defaultA}
              onChange={(e) => onSettingsChange({ latticeConstant: Number(e.target.value) })}
            />
            <span className="control-value">{(settings.latticeConstant || structure.defaultA).toFixed(2)} Å</span>
          </div>
        </div>

        <div className="toggle-group">
          <label className="toggle-row">
            <span>Bonds</span>
            <input
              type="checkbox"
              checked={settings.showBonds}
              onChange={(e) => onSettingsChange({ showBonds: e.target.checked })}
            />
            <span className="toggle-switch" />
          </label>
          <label className="toggle-row">
            <span>Unit Cell</span>
            <input
              type="checkbox"
              checked={settings.showUnitCell}
              onChange={(e) => onSettingsChange({ showUnitCell: e.target.checked })}
            />
            <span className="toggle-switch" />
          </label>
          <label className="toggle-row">
            <span>Auto Rotate</span>
            <input
              type="checkbox"
              checked={settings.autoRotate}
              onChange={(e) => onSettingsChange({ autoRotate: e.target.checked })}
            />
            <span className="toggle-switch" />
          </label>
        </div>
      </section>

      <div className="sidebar-footer">
        <span>Drag to rotate · Scroll to zoom</span>
      </div>
    </aside>
  );
}
