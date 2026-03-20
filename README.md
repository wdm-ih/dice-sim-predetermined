# dice-physics-rigged

Physics-based 3D dice throwing simulation with predetermined outcomes. Dice tumble, bounce off walls, and settle naturally — yet always land on the values you choose.

## How it works

The simulation runs **real physics** (cannon-es) with no forces or torques rigged. The trick is pure visual: as dice tumble, textures are dynamically remapped so the top-facing side always displays the desired value. Since the camera looks straight down, the swap is invisible.

## Features

- **Three.js** rendering with top-down orthographic camera
- **Cannon-es** physics — gravity, wall collisions, dice-to-dice collisions, floor friction
- Casino-style dice with rounded edges and pip textures
- Predetermined outcome for each die (select 1–6)
- Real-time GUI (lil-gui) to tweak throw speed, spin, physics materials, and more
- Fully written in **TypeScript**

## Getting started

```bash
npm install
npm run dev
```

Open `http://localhost:5173`, pick your desired values, and hit **Throw** (or press **Space**).

## Tech stack

- [Three.js](https://threejs.org/) — 3D rendering
- [cannon-es](https://pmndrs.github.io/cannon-es/) — physics engine
- [lil-gui](https://lil-gui.georgealways.com/) — parameter tweaking
- [Vite](https://vite.dev/) — dev server and bundler
