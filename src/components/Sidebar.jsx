import { useMemo } from 'react';
import { STRUCTURES, STRUCTURE_ORDER } from '../data/lattices';
import { computePlane, COMMON_PLANES } from '../data/millerIndices';
import { structureFactor, getStructureElement, WAVELENGTHS } from '../data/diffraction';
import {
  buildPathDP,
  trinomialCoefficient,
  formatCount,
  totalCells,
} from '../data/latticePaths';
import XRDChart from './XRDChart';

export default function Sidebar({
  activeStructure, settings, millerIndices, latticePaths, planeStats,
  xrdPeaks, wavelength, temperature, sidebarOpen,
  onStructureChange, onSettingsChange, onMillerChange,
  onLatticePathsChange, onLatticePathsReset,
  onWavelengthChange, onTemperatureChange, onScreenshot,
}) {
  const structure = STRUCTURES[activeStructure];
  const isPlaneValid = millerIndices.show && !(millerIndices.h === 0 && millerIndices.k === 0 && millerIndices.l === 0);

  // Lattice path DP results — only computed when panel is meaningful.
  // Cheap (max 7^3 = 343 cells), but memoized to avoid re-running on every keystroke.
  const pathStats = useMemo(() => {
    const { a, b, c } = latticePaths;
    const dp = buildPathDP(a, b, c);
    const total = dp[a][b][c];
    const closedForm = trinomialCoefficient(a, b, c);
    return {
      total,
      closedForm,
      verified: total === closedForm,
      cells: totalCells(a, b, c),
    };
  }, [latticePaths.a, latticePaths.b, latticePaths.c]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <aside className={`sidebar ${sidebarOpen ? 'open' : 'closed'}`}>
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
            <span className="stat-label">Lattice (A)</span>
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
            <span className="control-value">{settings.repeat}&times;{settings.repeat}&times;{settings.repeat}</span>
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
            <span className="control-value">{(settings.latticeConstant || structure.defaultA).toFixed(2)} A</span>
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

        {/* Screenshot */}
        <button className="screenshot-btn" onClick={onScreenshot}>
          Export PNG
        </button>
      </section>

      {/* Miller Indices / Lattice Planes */}
      <section className="panel">
        <h2 className="panel-title">Lattice Planes</h2>

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
          const sf = structureFactor(millerIndices.h, millerIndices.k, millerIndices.l, structure.basis);
          const isAllowed = sf.magnitudeSquared > 0.01;
          const lambda = WAVELENGTHS[wavelength];
          const sinTheta = lambda / (2 * dSpacing);
          const twoTheta = sinTheta <= 1 ? (2 * Math.asin(sinTheta) * 180 / Math.PI) : null;

          return (
            <>
              <div className="plane-info-row">
                <div className="dspacing-badge">
                  <span className="dspacing-label">d-spacing</span>
                  <span className="dspacing-value">{dSpacing.toFixed(3)} A</span>
                </div>
                {planeStats && planeStats.atomCount > 0 && (
                  <div className="dspacing-badge atoms-badge">
                    <span className="dspacing-label">on plane</span>
                    <span className="dspacing-value atoms-value">{planeStats.atomCount}</span>
                  </div>
                )}
              </div>

              <div className="plane-info-row">
                <div className={`sf-badge ${isAllowed ? 'allowed' : 'forbidden'}`}>
                  <span className="dspacing-label">|F|&sup2;</span>
                  <span className="sf-value">{sf.magnitudeSquared.toFixed(1)}</span>
                </div>
                <div className={`sf-badge ${isAllowed ? 'allowed' : 'forbidden'}`}>
                  <span className="dspacing-label">status</span>
                  <span className={`sf-status ${isAllowed ? 'allowed' : 'forbidden'}`}>
                    {isAllowed ? 'Allowed' : 'Forbidden'}
                  </span>
                </div>
                {twoTheta !== null && isAllowed && (
                  <div className="sf-badge allowed">
                    <span className="dspacing-label">2&theta;</span>
                    <span className="sf-value">{twoTheta.toFixed(2)}&deg;</span>
                  </div>
                )}
              </div>
            </>
          );
        })()}

        {/* Plane controls */}
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

        <div className="toggle-group">
          <label className="toggle-row">
            <span>Show Plane</span>
            <input type="checkbox" checked={millerIndices.show}
              onChange={(e) => onMillerChange({ show: e.target.checked })} />
            <span className="toggle-switch" />
          </label>
        </div>
      </section>

      {/* Lattice Paths (Dynamic Programming) */}
      <section className="panel">
        <h2 className="panel-title">Lattice Paths</h2>
        <p className="info-desc" style={{ marginBottom: 8 }}>
          Counts monotonic paths from (0,0,0) to (a,b,c) on a 3D grid via dynamic
          programming. Generalization of Project Euler #15.
        </p>

        <div className="control-row">
          <label className="control-label">a (steps in x)</label>
          <div className="control-input">
            <input
              type="range" min={1} max={6} step={1} value={latticePaths.a}
              onChange={(e) => onLatticePathsChange({ a: Number(e.target.value), resetKey: latticePaths.resetKey + 1 })}
            />
            <span className="control-value">{latticePaths.a}</span>
          </div>
        </div>
        <div className="control-row">
          <label className="control-label">b (steps in y)</label>
          <div className="control-input">
            <input
              type="range" min={1} max={6} step={1} value={latticePaths.b}
              onChange={(e) => onLatticePathsChange({ b: Number(e.target.value), resetKey: latticePaths.resetKey + 1 })}
            />
            <span className="control-value">{latticePaths.b}</span>
          </div>
        </div>
        <div className="control-row">
          <label className="control-label">c (steps in z)</label>
          <div className="control-input">
            <input
              type="range" min={1} max={6} step={1} value={latticePaths.c}
              onChange={(e) => onLatticePathsChange({ c: Number(e.target.value), resetKey: latticePaths.resetKey + 1 })}
            />
            <span className="control-value">{latticePaths.c}</span>
          </div>
        </div>

        {/* Path count display */}
        <div className="plane-info-row" style={{ marginTop: 12 }}>
          <div className="dspacing-badge" style={{ minWidth: 0 }}>
            <span className="dspacing-label">Total paths</span>
            <span className="dspacing-value">{formatCount(pathStats.total)}</span>
          </div>
          <div className={`sf-badge ${pathStats.verified ? 'allowed' : 'forbidden'}`}>
            <span className="dspacing-label">DP = trinomial</span>
            <span className={`sf-status ${pathStats.verified ? 'allowed' : 'forbidden'}`}>
              {pathStats.verified ? 'verified' : 'mismatch'}
            </span>
          </div>
        </div>

        <div className="plane-info-row">
          <div className="dspacing-badge atoms-badge">
            <span className="dspacing-label">DP cells</span>
            <span className="dspacing-value atoms-value">{pathStats.cells}</span>
          </div>
          <div className="dspacing-badge atoms-badge">
            <span className="dspacing-label">Closed form</span>
            <span className="dspacing-value atoms-value">
              ({latticePaths.a}+{latticePaths.b}+{latticePaths.c})! / ({latticePaths.a}!&middot;{latticePaths.b}!&middot;{latticePaths.c}!)
            </span>
          </div>
        </div>

        {/* Toggles */}
        <div className="toggle-group" style={{ marginTop: 12 }}>
          <label className="toggle-row">
            <span>Show Lattice Paths</span>
            <input
              type="checkbox" checked={latticePaths.show}
              onChange={(e) => onLatticePathsChange({ show: e.target.checked, resetKey: latticePaths.resetKey + 1 })}
            />
            <span className="toggle-switch" />
          </label>
          <label className="toggle-row">
            <span>Animate Fill</span>
            <input
              type="checkbox" checked={latticePaths.playing}
              onChange={(e) => onLatticePathsChange({ playing: e.target.checked })}
              disabled={!latticePaths.show}
            />
            <span className="toggle-switch" />
          </label>
          <label className="toggle-row">
            <span>Show Edges</span>
            <input
              type="checkbox" checked={latticePaths.showEdges}
              onChange={(e) => onLatticePathsChange({ showEdges: e.target.checked })}
              disabled={!latticePaths.show}
            />
            <span className="toggle-switch" />
          </label>
        </div>

        <button
          className="screenshot-btn"
          onClick={onLatticePathsReset}
          disabled={!latticePaths.show}
          style={{ opacity: latticePaths.show ? 1 : 0.4 }}
        >
          Reset Animation
        </button>
      </section>

      {/* XRD Pattern */}
      <section className="panel">
        <h2 className="panel-title">Powder XRD Pattern</h2>

        {/* Wavelength selector */}
        <div className="xrd-wavelength-row">
          <label className="control-label">Source</label>
          <div className="wavelength-chips">
            {Object.entries(WAVELENGTHS).map(([name]) => (
              <button
                key={name}
                className={`preset-chip xrd-src-chip ${wavelength === name ? 'active' : ''}`}
                onClick={() => onWavelengthChange(name)}
              >
                {name}
              </button>
            ))}
          </div>
        </div>

        <div className="xrd-meta">
          <span className="xrd-meta-item">
            &lambda; = {WAVELENGTHS[wavelength].toFixed(4)} A
          </span>
          <span className="xrd-meta-item">
            {getStructureElement(activeStructure)} scattering
          </span>
          <span className="xrd-meta-item">
            {xrdPeaks.length} peaks
          </span>
        </div>

        {/* Temperature (Debye-Waller) */}
        <div className="control-row">
          <label className="control-label">Temperature (Debye-Waller)</label>
          <div className="control-input">
            <input type="range" min={0} max={1500} step={10}
              value={temperature}
              onChange={(e) => onTemperatureChange(Number(e.target.value))} />
            <span className="control-value">{temperature} K</span>
          </div>
        </div>

        <XRDChart
          peaks={xrdPeaks}
          activeMiller={millerIndices}
          onPeakClick={(pk) => onMillerChange({ h: pk.hkl[0], k: pk.hkl[1], l: pk.hkl[2], show: true, offset: 0 })}
        />

        {/* Peak table */}
        <div className="xrd-table-wrap">
          <table className="xrd-table">
            <thead>
              <tr>
                <th>(hkl)</th>
                <th>2&theta; (&deg;)</th>
                <th>d (A)</th>
                <th>I (%)</th>
              </tr>
            </thead>
            <tbody>
              {xrdPeaks
                .slice()
                .sort((a, b) => b.relativeIntensity - a.relativeIntensity)
                .slice(0, 8)
                .map((p, i) => {
                  const isActive = millerIndices.show &&
                    p.hkl[0] === Math.abs(millerIndices.h) &&
                    p.hkl[1] === Math.abs(millerIndices.k) &&
                    p.hkl[2] === Math.abs(millerIndices.l);
                  return (
                    <tr
                      key={i}
                      className={`xrd-row ${isActive ? 'active' : ''}`}
                      onClick={() => onMillerChange({ h: p.hkl[0], k: p.hkl[1], l: p.hkl[2], show: true, offset: 0 })}
                    >
                      <td className="xrd-hkl">{p.label}</td>
                      <td>{p.twoTheta.toFixed(2)}</td>
                      <td>{p.dSpacing.toFixed(3)}</td>
                      <td>{p.relativeIntensity.toFixed(1)}</td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </section>

      <div className="sidebar-footer">
        <span>Click atoms for info &middot; Drag to rotate &middot; Scroll to zoom</span>
      </div>
    </aside>
  );
}
