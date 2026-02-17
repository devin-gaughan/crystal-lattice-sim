import { STRUCTURES, STRUCTURE_ORDER } from '../data/lattices';
import { computePlane, COMMON_PLANES } from '../data/millerIndices';

export default function Sidebar({ activeStructure, settings, millerIndices, planeStats, onStructureChange, onSettingsChange, onMillerChange }) {
  const structure = STRUCTURES[activeStructure];
  const isPlaneValid = millerIndices.show && !(millerIndices.h === 0 && millerIndices.k === 0 && millerIndices.l === 0);

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
                style={{ '--accent': s.color, '--glow': s.glowColor }}
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
            <input type="range" min={1} max={4} step={1} value={settings.repeat}
              onChange={(e) => onSettingsChange({ repeat: Number(e.target.value) })} />
            <span className="control-value">{settings.repeat}×{settings.repeat}×{settings.repeat}</span>
          </div>
        </div>

        <div className="control-row">
          <label className="control-label">Atom Size</label>
          <div className="control-input">
            <input type="range" min={0.1} max={0.6} step={0.05} value={settings.atomRadius}
              onChange={(e) => onSettingsChange({ atomRadius: Number(e.target.value) })} />
            <span className="control-value">{settings.atomRadius.toFixed(2)}</span>
          </div>
        </div>

        <div className="control-row">
          <label className="control-label">Lattice Constant</label>
          <div className="control-input">
            <input type="range" min={structure.defaultA * 0.5} max={structure.defaultA * 1.5} step={0.01}
              value={settings.latticeConstant || structure.defaultA}
              onChange={(e) => onSettingsChange({ latticeConstant: Number(e.target.value) })} />
            <span className="control-value">{(settings.latticeConstant || structure.defaultA).toFixed(2)} Å</span>
          </div>
        </div>

        <div className="toggle-group">
          <label className="toggle-row">
            <span>Bonds</span>
            <input type="checkbox" checked={settings.showBonds}
              onChange={(e) => onSettingsChange({ showBonds: e.target.checked })} />
            <span className="toggle-switch" />
          </label>
          <label className="toggle-row">
            <span>Unit Cell</span>
            <input type="checkbox" checked={settings.showUnitCell}
              onChange={(e) => onSettingsChange({ showUnitCell: e.target.checked })} />
            <span className="toggle-switch" />
          </label>
          <label className="toggle-row">
            <span>Auto Rotate</span>
            <input type="checkbox" checked={settings.autoRotate}
              onChange={(e) => onSettingsChange({ autoRotate: e.target.checked })} />
            <span className="toggle-switch" />
          </label>
        </div>
      </section>

      {/* Miller Indices / Lattice Planes */}
      <section className="panel">
        <h2 className="panel-title">Lattice Planes</h2>

        {/* Quick presets */}
        <div className="preset-chips">
          {COMMON_PLANES.map((p) => {
            const isActive = millerIndices.show && millerIndices.h === p.h && millerIndices.k === p.k && millerIndices.l === p.l;
            return (
              <button
                key={p.label}
                className={`preset-chip ${isActive ? 'active' : ''}`}
                title={p.desc}
                onClick={() => {
                  if (isActive) {
                    onMillerChange({ show: false });
                  } else {
                    onMillerChange({ h: p.h, k: p.k, l: p.l, show: true, offset: 0 });
                  }
                }}
              >
                {p.label}
              </button>
            );
          })}
        </div>

        {/* Custom hkl inputs */}
        <div className="hkl-row">
          <label className="control-label">Custom (hkl)</label>
          <div className="hkl-inputs">
            {['h', 'k', 'l'].map((axis) => (
              <div key={axis} className="hkl-field">
                <span className="hkl-label">{axis}</span>
                <input
                  type="number" min={-4} max={4} step={1}
                  value={millerIndices[axis]}
                  onChange={(e) => {
                    const val = Math.max(-4, Math.min(4, parseInt(e.target.value) || 0));
                    onMillerChange({ [axis]: val, show: true, offset: 0 });
                  }}
                  className="hkl-input"
                />
              </div>
            ))}
          </div>
        </div>

        {/* Plane info badges */}
        {isPlaneValid && (() => {
          const a = settings.latticeConstant || structure.defaultA;
          const { dSpacing } = computePlane(millerIndices.h, millerIndices.k, millerIndices.l, structure.vectors, a);
          return (
            <div className="plane-info-row">
              <div className="dspacing-badge">
                <span className="dspacing-label">d-spacing</span>
                <span className="dspacing-value">{dSpacing.toFixed(3)} Å</span>
              </div>
              {planeStats && planeStats.atomCount > 0 && (
                <div className="dspacing-badge atoms-badge">
                  <span className="dspacing-label">on plane</span>
                  <span className="dspacing-value atoms-value">{planeStats.atomCount}</span>
                </div>
              )}
            </div>
          );
        })()}

        {/* Plane controls (only shown when plane is active) */}
        {isPlaneValid && (
          <>
            <div className="control-row">
              <label className="control-label">Plane Position</label>
              <div className="control-input">
                <input type="range" min={-3} max={3} step={0.05}
                  value={millerIndices.offset}
                  onChange={(e) => onMillerChange({ offset: Number(e.target.value) })} />
                <span className="control-value">{millerIndices.offset > 0 ? '+' : ''}{millerIndices.offset.toFixed(2)}d</span>
              </div>
            </div>

            <div className="control-row">
              <label className="control-label">Plane Opacity</label>
              <div className="control-input">
                <input type="range" min={0.1} max={0.8} step={0.05}
                  value={millerIndices.opacity}
                  onChange={(e) => onMillerChange({ opacity: Number(e.target.value) })} />
                <span className="control-value">{(millerIndices.opacity * 100).toFixed(0)}%</span>
              </div>
            </div>
          </>
        )}

        {/* Show/hide toggle */}
        <div className="toggle-group">
          <label className="toggle-row">
            <span>Show Plane</span>
            <input type="checkbox" checked={millerIndices.show}
              onChange={(e) => onMillerChange({ show: e.target.checked })} />
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
