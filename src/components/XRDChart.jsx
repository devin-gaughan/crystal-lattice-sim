import { useMemo, useRef } from 'react';

/**
 * Interactive SVG powder-XRD chart.
 *
 * – Peaks rendered as Gaussian profiles (not just sticks) for a realistic look.
 * – Top peaks labelled with (hkl).
 * – Click a peak → selects that Miller plane in the 3D view.
 * – Hover tooltip shows d-spacing and intensity.
 */

const CHART_W  = 272;   // inner plot width (px)
const CHART_H  = 140;   // inner plot height
const PAD_L    = 28;    // left axis padding
const PAD_R    = 6;
const PAD_T    = 18;    // top (for labels)
const PAD_B    = 22;    // bottom axis
const SVG_W    = CHART_W + PAD_L + PAD_R;
const SVG_H    = CHART_H + PAD_T + PAD_B;
const SIGMA    = 0.35;  // Gaussian half-width in 2θ degrees
const CURVE_PTS = 400;  // resolution of the continuous curve
const MIN_2TH  = 10;
const MAX_2TH  = 140;


function toX(twoTheta) {
  return PAD_L + ((twoTheta - MIN_2TH) / (MAX_2TH - MIN_2TH)) * CHART_W;
}
function toY(relIntensity) {
  return PAD_T + CHART_H - (relIntensity / 105) * CHART_H;
}

/** Build a continuous broadened profile from discrete peaks. */
function buildProfile(peaks) {
  const step = (MAX_2TH - MIN_2TH) / CURVE_PTS;
  const inv2Sigma2 = 1 / (2 * SIGMA * SIGMA);
  const pts = new Float64Array(CURVE_PTS + 1);

  for (const pk of peaks) {
    const amp = pk.relativeIntensity;
    const centre = pk.twoTheta;
    // Only compute within ±5σ of peak centre
    const loIdx = Math.max(0, Math.floor((centre - 5 * SIGMA - MIN_2TH) / step));
    const hiIdx = Math.min(CURVE_PTS, Math.ceil((centre + 5 * SIGMA - MIN_2TH) / step));
    for (let i = loIdx; i <= hiIdx; i++) {
      const th = MIN_2TH + i * step;
      const d = th - centre;
      pts[i] += amp * Math.exp(-d * d * inv2Sigma2);
    }
  }

  // Clamp to 105 (leave a little headroom)
  for (let i = 0; i <= CURVE_PTS; i++) {
    if (pts[i] > 105) pts[i] = 105;
  }
  return { pts, step };
}


export default function XRDChart({ peaks, activeMiller, onPeakClick, accentColor = '#60dfff' }) {
  const svgRef = useRef();

  // Broadened profile path
  const profilePath = useMemo(() => {
    if (!peaks || peaks.length === 0) return '';
    const { pts, step } = buildProfile(peaks);
    let d = `M ${toX(MIN_2TH)} ${toY(0)}`;
    for (let i = 0; i <= CURVE_PTS; i++) {
      const th = MIN_2TH + i * step;
      d += ` L ${toX(th).toFixed(1)} ${toY(pts[i]).toFixed(1)}`;
    }
    d += ` L ${toX(MAX_2TH)} ${toY(0)} Z`;
    return d;
  }, [peaks]);

  // Decide which peaks get (hkl) labels — top 8 by intensity
  const labelledPeaks = useMemo(() => {
    if (!peaks) return [];
    return [...peaks]
      .sort((a, b) => b.relativeIntensity - a.relativeIntensity)
      .slice(0, 8);
  }, [peaks]);

  // 2θ axis ticks
  const ticks = [20, 40, 60, 80, 100, 120, 140];

  if (!peaks || peaks.length === 0) {
    return (
      <div className="xrd-chart-empty">
        <span>No observable reflections</span>
      </div>
    );
  }

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${SVG_W} ${SVG_H}`}
      className="xrd-chart-svg"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Gradient fill for the profile */}
      <defs>
        <linearGradient id="xrdGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={accentColor} stopOpacity="0.5" />
          <stop offset="100%" stopColor={accentColor} stopOpacity="0.03" />
        </linearGradient>
      </defs>

      {/* Axis lines */}
      <line x1={PAD_L} y1={PAD_T} x2={PAD_L} y2={PAD_T + CHART_H}
        stroke="rgba(255,255,255,0.08)" strokeWidth="1" />
      <line x1={PAD_L} y1={PAD_T + CHART_H} x2={PAD_L + CHART_W} y2={PAD_T + CHART_H}
        stroke="rgba(255,255,255,0.12)" strokeWidth="1" />

      {/* Grid + tick labels */}
      {ticks.map(t => {
        if (t > MAX_2TH) return null;
        const x = toX(t);
        return (
          <g key={t}>
            <line x1={x} y1={PAD_T} x2={x} y2={PAD_T + CHART_H}
              stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
            <text x={x} y={PAD_T + CHART_H + 14} textAnchor="middle"
              fill="rgba(255,255,255,0.25)" fontSize="8" fontFamily="JetBrains Mono, monospace">
              {t}°
            </text>
          </g>
        );
      })}

      {/* Axis label */}
      <text x={PAD_L + CHART_W / 2} y={SVG_H - 1} textAnchor="middle"
        fill="rgba(255,255,255,0.2)" fontSize="7" fontFamily="DM Sans, sans-serif">
        2θ (degrees)
      </text>


      {/* Broadened profile fill */}
      <path d={profilePath} fill="url(#xrdGrad)" stroke="none" />
      {/* Broadened profile stroke */}
      <path d={profilePath} fill="none" stroke={accentColor} strokeWidth="1.2" opacity="0.8" />

      {/* Stick markers for each peak (clickable) */}
      {peaks.map((pk, i) => {
        const x = toX(pk.twoTheta);
        const yTop = toY(pk.relativeIntensity);
        const yBot = toY(0);
        const isActive = activeMiller &&
          pk.hkl[0] === Math.abs(activeMiller.h) &&
          pk.hkl[1] === Math.abs(activeMiller.k) &&
          pk.hkl[2] === Math.abs(activeMiller.l);

        return (
          <line
            key={i}
            x1={x} y1={yTop} x2={x} y2={yBot}
            stroke={isActive ? '#fff' : accentColor}
            strokeWidth={isActive ? 1.6 : 0.7}
            opacity={isActive ? 1 : 0.45}
            style={{ cursor: 'pointer' }}
            onClick={() => onPeakClick && onPeakClick(pk)}
          >
            <title>{pk.label}  2θ={pk.twoTheta.toFixed(2)}°  d={pk.dSpacing.toFixed(3)}Å  I={pk.relativeIntensity.toFixed(1)}%</title>
          </line>
        );
      })}

      {/* (hkl) labels on top peaks */}
      {labelledPeaks.map((pk, i) => {
        const x = toX(pk.twoTheta);
        const y = toY(pk.relativeIntensity) - 4;
        return (
          <text
            key={`lbl-${i}`}
            x={x} y={y}
            textAnchor="middle"
            fill="rgba(255,255,255,0.55)"
            fontSize="7"
            fontFamily="JetBrains Mono, monospace"
            style={{ cursor: 'pointer', pointerEvents: 'none' }}
          >
            {pk.label}
          </text>
        );
      })}
    </svg>
  );
}
