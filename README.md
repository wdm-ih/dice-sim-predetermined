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
- **Modular, model-agnostic architecture** — swap in your own dice models, table, or textures

## Getting started

```bash
npm install
npm run dev
```

Open `http://localhost:5173`, pick your desired values, and hit **Throw** (or press **Space**).

## Architecture

```
src/
  types.ts              — Shared interfaces and types
  TextureProvider.ts    — Default canvas-drawn pip textures
  DiceFactory.ts        — Default RoundedBoxGeometry dice mesh + physics body
  TextureRemapper.ts    — Core rigging logic (face detection + texture swap)
  Environment.ts        — Default floor + walls
  SceneSetup.ts         — Three.js scene, camera, renderer, lighting
  PhysicsWorld.ts       — Cannon-es world + contact materials
  DebugPanel.ts         — Optional lil-gui debug panel
  DiceEngine.ts         — Main orchestrator class
  main.ts               — Thin bootstrap wiring UI to engine
```

## Custom models

The engine is designed around three injectable interfaces. Provide your own implementation to swap dice models, table environment, or face textures — without touching the core engine.

### `ITextureProvider` — custom face textures

Produces the texture for each dice value (1–6). Default draws canvas pips. Swap in image files, SVGs, or anything else.

```ts
import { DiceEngine } from './DiceEngine';
import type { DiceValue, ITextureProvider } from './types';

class ImageTextureProvider implements ITextureProvider {
  private textures = new Map<DiceValue, THREE.Texture>();

  init(renderer: THREE.WebGLRenderer): void {
    const loader = new THREE.TextureLoader();
    for (let v = 1; v <= 6; v++) {
      this.textures.set(v as DiceValue, loader.load(`/textures/face-${v}.png`));
    }
  }

  getTexture(value: DiceValue): THREE.Texture {
    return this.textures.get(value)!;
  }
}

const engine = new DiceEngine({
  container: document.body,
  textureProvider: new ImageTextureProvider(),
});
```

### `IDiceFactory` — custom dice mesh and physics body

Controls the visual mesh, physics body, and the mapping between material slots and face normals. Default uses `RoundedBoxGeometry`. Swap in a GLTF model or any geometry.

```ts
class MyDiceFactory implements IDiceFactory {
  readonly dieHalfSize = 0.5;
  readonly faceNormals: CANNON.Vec3[] = [ /* your 6 face normals */ ];
  readonly defaultFaceValues: DiceValue[] = [2, 5, 3, 4, 1, 6];

  createMesh(scene: THREE.Scene): THREE.Mesh { /* load your model */ }
  createBody(world: CANNON.World, material: CANNON.Material): CANNON.Body { /* ... */ }
}

const engine = new DiceEngine({
  container: document.body,
  diceFactory: new MyDiceFactory(),
});
```

### `IEnvironment` — custom table / play area

Builds the floor and walls (visual + physics). Default draws a green felt plane with brown box walls. Swap in a wooden table GLTF, add bumpers, or change the layout entirely.

```ts
class FancyTable implements IEnvironment {
  setup(scene, world, boardWidth, boardHeight, floorMaterial, wallMaterial): void {
    // Load your GLTF table model
    // Add physics colliders to match the geometry
  }
}

const engine = new DiceEngine({
  container: document.body,
  environment: new FancyTable(),
});
```

### Engine API

```ts
const engine = new DiceEngine({
  container: document.body,
  diceCount: 2,           // any number of dice
  frustumSize: 18,        // camera zoom
  debug: true,            // show lil-gui panel
  throwParams: { throwSpeed: 65, spinX: 15, /* ... */ },
  physicsParams: { gravity: -40, diceMass: 0.3, /* ... */ },
});

engine.throw([3, 6]);     // throw with predetermined outcomes
engine.onSettled((results) => console.log(results)); // [3, 6]
engine.isAnimating;       // true while dice are in motion
engine.dispose();         // clean up all resources
```

## Debug panel parameters

Enable with `debug: true` in the engine config. All parameters update in real-time — tweak them between throws to see the effect immediately.

### Throw parameters

| Parameter | Default | Range | Description |
|-----------|---------|-------|-------------|
| **Speed** (`throwSpeed`) | `65` | 10–80 | Base horizontal velocity (left-ward) of the throw. **Higher** = dice fly faster across the table and hit the left wall harder, bouncing further back. **Lower** = dice may not reach the left wall at all. |
| **Speed random** (`throwSpeedRandom`) | `8` | 0–20 | Random variation added to throw speed. Each die gets `throwSpeed + random(0..throwSpeedRandom)`. **Higher** = more variety between throws, dice arrive at wall at different times. **0** = both dice always thrown at the same speed. |
| **Height** (`throwHeight`) | `3` | 0.5–8 | Starting height above the table surface (in world units). **Higher** = dice fall longer before touching the table, more dramatic initial bounce. **Lower** = dice skim the surface almost immediately, less airtime. |
| **Upward** (`throwUpward`) | `0.5` | 0–5 | Initial upward velocity component. **Higher** = dice arc upward before falling, creating a lob trajectory. **0** = dice launch flat/parallel to the table and only fall due to gravity. |
| **Z spread** (`throwZSpread`) | `3` | 0–10 | Random lateral (front/back) velocity. Each die gets a random Z velocity in the range `±throwZSpread/2`. **Higher** = dice scatter more across the table width after bouncing. **Lower** = dice travel in a straighter line. |
| **Spin X** (`spinX`) | `15` | 0–40 | Maximum angular velocity around the X axis (forward tumble). **Higher** = faster forward/backward tumbling, more chaotic rolls. **0** = no tumble on this axis. |
| **Spin Y** (`spinY`) | `10` | 0–40 | Maximum angular velocity around the Y axis (horizontal spin like a top). **Higher** = dice spin faster when viewed from above. Only visible from top-down as a rotation in place. |
| **Spin Z** (`spinZ`) | `15` | 0–40 | Maximum angular velocity around the Z axis (sideways tumble). **Higher** = faster sideways rolling. Combined with Spin X, creates the full tumbling effect. |

### Physics parameters

| Parameter | Default | Range | Description |
|-----------|---------|-------|-------------|
| **Gravity** (`gravity`) | `-40` | -100 to -5 | Downward gravitational acceleration. **More negative** = dice fall faster, less airtime, heavier feel. **Less negative** = floaty, moon-like physics, dice bounce higher. Applied to the entire physics world. |
| **Dice mass** (`diceMass`) | `0.3` | 0.05–5 | Mass of each die in kg. Affects how dice interact with each other on collision. **Heavier** = more momentum, harder to deflect, stronger collisions. **Lighter** = dice push each other around more easily. Does not affect gravity fall speed (that's mass-independent). |
| **Linear damp** (`linearDamping`) | `0.25` | 0–0.99 | Velocity damping applied every frame — simulates air resistance and table friction. **Higher** = dice slow down faster after bouncing, stop sooner, shorter travel distance. **Lower** = dice slide further, feel slippery. **0** = no damping (dice slide forever). **0.99** = almost instant stop. |
| **Angular damp** (`angularDamping`) | `0.25` | 0–0.99 | Rotation damping applied every frame — how quickly spin energy is lost. **Higher** = dice stop spinning sooner, settle faster. **Lower** = dice keep tumbling and spinning long after hitting the wall. Affects how "snappy" the final settle feels. |
| **Floor friction** (`floorFriction`) | `0.6` | 0–2 | Friction between dice and the table surface. **Higher** = dice grip the table more, roll rather than slide, stop sooner on the surface. **Lower** = dice slide across the table like on ice. Values > 1 simulate very grippy surfaces (felt, rubber). |
| **Floor bounce** (`floorRestitution`) | `0.1` | 0–1 | Bounciness of dice hitting the table. **Higher** = dice bounce up more after landing, takes longer to settle. **Lower** = dice absorb impact and stick to the table. **0** = dead stop on contact. **1** = perfectly elastic (full bounce). |
| **Wall friction** (`wallFriction`) | `0.4` | 0–2 | Friction between dice and the walls. **Higher** = dice scrub against the wall and lose more speed on contact. **Lower** = dice slide along the wall and deflect cleanly. |
| **Wall bounce** (`wallRestitution`) | `0.3` | 0–1 | Bounciness of dice hitting walls. **Higher** = dice bounce back further from the wall. **Lower** = dice absorb the impact and stop near the wall. This is a key parameter for controlling where dice end up after hitting the left wall. |
| **Sleep threshold** (`sleepThreshold`) | `0.05` | 0.01–0.5 | Velocity threshold below which dice are considered "settled." Both linear and angular velocity must be below this value. **Higher** = dice settle sooner (even while still slightly wobbling), faster result. **Lower** = waits until dice are almost perfectly still, more realistic but slower. |
| **Texture delay** (`textureDelay`) | `0.2` | 0–3 | Seconds before the dynamic texture remapping begins. During this delay, dice show their default face layout. **Higher** = more of the initial flight uses unrigged textures (safer if camera angle could reveal sides, but irrelevant for top-down). **Lower/0** = textures are rigged from the very first frame. |

### Tips for tuning

- **Dice don't reach the left wall?** Increase `throwSpeed` or decrease `linearDamping`.
- **Dice bounce too far back from the wall?** Decrease `wallRestitution` or increase `linearDamping`.
- **Dice take too long to settle?** Increase `angularDamping`, `linearDamping`, or `sleepThreshold`.
- **Throw looks too uniform?** Increase `throwSpeedRandom`, `throwZSpread`, and spin values.
- **Dice feel floaty?** Make `gravity` more negative (e.g. `-60`) and reduce `floorRestitution`.

## Tech stack

- [Three.js](https://threejs.org/) — 3D rendering
- [cannon-es](https://pmndrs.github.io/cannon-es/) — physics engine
- [lil-gui](https://lil-gui.georgealways.com/) — parameter tweaking
- [Vite](https://vite.dev/) — dev server and bundler
