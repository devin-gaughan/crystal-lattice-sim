# Crystal Lattice Simulator

An interactive 3D crystal lattice visualizer built with React and Three.js. Explore common crystal structures used in materials science and semiconductor research.

![React](https://img.shields.io/badge/React-18-blue) ![Three.js](https://img.shields.io/badge/Three.js-r170-green) ![License](https://img.shields.io/badge/License-MIT-yellow)

## Features

- **5 Crystal Structures** — Simple Cubic, BCC, FCC, Diamond Cubic, and HCP
- **Interactive 3D Visualization** — Orbit, zoom, and pan with mouse controls
- **Real-time Parameter Tuning** — Adjust lattice constants, atom sizes, and unit cell repetitions
- **Bond Visualization** — Toggle nearest-neighbor bonds calculated from structure geometry
- **Unit Cell Wireframe** — Overlay the fundamental unit cell for reference
- **Scientific Data** — Coordination numbers, packing fractions, and real material examples
- **Dark Lab-Instrument UI** — Minimal, distraction-free interface

## Tech Stack

- **React 19** + Vite
- **Three.js** via React Three Fiber + Drei
- **Custom CSS** with CSS variables

## Getting Started

```bash
git clone https://github.com/devin-gaughan/crystal-lattice-sim.git
cd crystal-lattice-sim
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

## Crystal Structures

| Structure | Coordination | Packing | Example Materials |
|-----------|-------------|---------|-------------------|
| Simple Cubic | 6 | 52.4% | Polonium |
| BCC | 8 | 68.0% | Iron, Tungsten, Chromium |
| FCC | 12 | 74.0% | Copper, Aluminum, Gold |
| Diamond Cubic | 4 | 34.0% | Silicon, Germanium, Diamond |
| HCP | 12 | 74.0% | Titanium, Magnesium, Zinc |

## Background

This project draws on experience from semiconductor materials research, where understanding crystal lattice geometry is fundamental to analyzing material properties, defect structures, and device performance.

## License

MIT
