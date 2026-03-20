import * as CANNON from 'cannon-es';
import GUI from 'lil-gui';
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

// ─── Types ─────────────────────────────────────────────────
type DiceValue = 1 | 2 | 3 | 4 | 5 | 6;

interface DiceState {
  mesh: THREE.Mesh<RoundedBoxGeometry, THREE.MeshStandardMaterial[]>;
  body: CANNON.Body;
  targetValue: DiceValue;
  settled: boolean;
  lastTopSlot: number;
}

interface Params {
  throwSpeed: number;
  throwSpeedRandom: number;
  throwHeight: number;
  throwUpward: number;
  throwZSpread: number;
  spinX: number;
  spinY: number;
  spinZ: number;
  gravity: number;
  diceMass: number;
  linearDamping: number;
  angularDamping: number;
  floorFriction: number;
  floorRestitution: number;
  wallFriction: number;
  wallRestitution: number;
  sleepThreshold: number;
  textureDelay: number;
}

// ─── Tunable params ────────────────────────────────────────
const params: Params = {
  throwSpeed: 65,
  throwSpeedRandom: 8,
  throwHeight: 3,
  throwUpward: 0.5,
  throwZSpread: 3,
  spinX: 15,
  spinY: 10,
  spinZ: 15,

  gravity: -40,
  diceMass: 0.3,
  linearDamping: 0.25,
  angularDamping: 0.25,
  floorFriction: 0.6,
  floorRestitution: 0.1,
  wallFriction: 0.4,
  wallRestitution: 0.3,

  sleepThreshold: 0.05,
  textureDelay: 0.2,
};

// ─── GUI ───────────────────────────────────────────────────
const gui = new GUI({ title: 'Dice Config' });

const fThrow = gui.addFolder('Throw');
fThrow.add(params, 'throwSpeed', 10, 80, 1).name('Speed');
fThrow.add(params, 'throwSpeedRandom', 0, 20, 1).name('Speed random');
fThrow.add(params, 'throwHeight', 0.5, 8, 0.5).name('Height');
fThrow.add(params, 'throwUpward', 0, 5, 0.1).name('Upward');
fThrow.add(params, 'throwZSpread', 0, 10, 0.5).name('Z spread');
fThrow.add(params, 'spinX', 0, 40, 1).name('Spin X');
fThrow.add(params, 'spinY', 0, 40, 1).name('Spin Y');
fThrow.add(params, 'spinZ', 0, 40, 1).name('Spin Z');

const fPhysics = gui.addFolder('Physics');
fPhysics.add(params, 'gravity', -100, -5, 1).name('Gravity').onChange((v: number) => {
  world.gravity.set(0, v, 0);
});
fPhysics.add(params, 'diceMass', 0.05, 5, 0.05).name('Dice mass');
fPhysics.add(params, 'linearDamping', 0, 0.99, 0.01).name('Linear damp');
fPhysics.add(params, 'angularDamping', 0, 0.99, 0.01).name('Angular damp');
fPhysics.add(params, 'floorFriction', 0, 2, 0.05).name('Floor friction').onChange((v: number) => {
  diceFloorCM.friction = v;
});
fPhysics.add(params, 'floorRestitution', 0, 1, 0.05).name('Floor bounce').onChange((v: number) => {
  diceFloorCM.restitution = v;
});
fPhysics.add(params, 'wallFriction', 0, 2, 0.05).name('Wall friction').onChange((v: number) => {
  diceWallCM.friction = v;
});
fPhysics.add(params, 'wallRestitution', 0, 1, 0.05).name('Wall bounce').onChange((v: number) => {
  diceWallCM.restitution = v;
});
fPhysics.add(params, 'sleepThreshold', 0.01, 0.5, 0.01).name('Sleep threshold');
fPhysics.add(params, 'textureDelay', 0, 3, 0.1).name('Texture delay (s)');

// ─── Scene setup ───────────────────────────────────────────
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x16213e);

const aspect = window.innerWidth / window.innerHeight;
const frustumSize = 18;
const camera = new THREE.OrthographicCamera(
  -frustumSize * aspect / 2, frustumSize * aspect / 2,
  frustumSize / 2, -frustumSize / 2, 0.1, 100
);
camera.position.set(0, 20, 0);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

// ─── Lighting ──────────────────────────────────────────────
scene.add(new THREE.AmbientLight(0xffffff, 0.6));

const dirLight = new THREE.DirectionalLight(0xffffff, 1.0);
dirLight.position.set(5, 15, 5);
dirLight.castShadow = true;
dirLight.shadow.mapSize.set(2048, 2048);
dirLight.shadow.camera.left = -20;
dirLight.shadow.camera.right = 20;
dirLight.shadow.camera.top = 20;
dirLight.shadow.camera.bottom = -20;
scene.add(dirLight);

// ─── Board dimensions ──────────────────────────────────────
const BOARD_W = frustumSize * aspect - 4;
const BOARD_H = frustumSize - 4;
const WALL_HEIGHT = 6;
const WALL_THICKNESS = 0.4;

// ─── Physics world ─────────────────────────────────────────
const world = new CANNON.World({
  gravity: new CANNON.Vec3(0, params.gravity, 0),
});
world.defaultContactMaterial.friction = 0.4;
world.defaultContactMaterial.restitution = 0.3;

const dicePhysMat = new CANNON.Material('dice');
const wallPhysMat = new CANNON.Material('wall');
const floorPhysMat = new CANNON.Material('floor');

const diceWallCM = new CANNON.ContactMaterial(dicePhysMat, wallPhysMat, {
  friction: params.wallFriction, restitution: params.wallRestitution,
});
const diceFloorCM = new CANNON.ContactMaterial(dicePhysMat, floorPhysMat, {
  friction: params.floorFriction, restitution: params.floorRestitution,
});
const diceDiceCM = new CANNON.ContactMaterial(dicePhysMat, dicePhysMat, {
  friction: 0.3, restitution: 0.25,
});
world.addContactMaterial(diceWallCM);
world.addContactMaterial(diceFloorCM);
world.addContactMaterial(diceDiceCM);

// ─── Floor ─────────────────────────────────────────────────
const floorMesh = new THREE.Mesh(
  new THREE.PlaneGeometry(BOARD_W, BOARD_H),
  new THREE.MeshStandardMaterial({ color: 0x1a472a, roughness: 0.9 })
);
floorMesh.rotation.x = -Math.PI / 2;
floorMesh.receiveShadow = true;
scene.add(floorMesh);

const floorBody = new CANNON.Body({
  mass: 0, material: floorPhysMat,
  shape: new CANNON.Plane(),
});
floorBody.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
world.addBody(floorBody);

// ─── Walls ─────────────────────────────────────────────────
function createWall(
  width: number, height: number, depth: number,
  position: THREE.Vector3, color: number
): void {
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(width, height, depth),
    new THREE.MeshStandardMaterial({ color, roughness: 0.7, metalness: 0.1 })
  );
  mesh.position.copy(position);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  scene.add(mesh);

  const body = new CANNON.Body({
    mass: 0, material: wallPhysMat,
    shape: new CANNON.Box(new CANNON.Vec3(width / 2, height / 2, depth / 2)),
  });
  body.position.set(position.x, position.y, position.z);
  world.addBody(body);
}

const wc = 0x4a2c0a;
createWall(WALL_THICKNESS, WALL_HEIGHT, BOARD_H, new THREE.Vector3(-BOARD_W / 2 - WALL_THICKNESS / 2, WALL_HEIGHT / 2, 0), wc);
createWall(WALL_THICKNESS, WALL_HEIGHT, BOARD_H, new THREE.Vector3(BOARD_W / 2 + WALL_THICKNESS / 2, WALL_HEIGHT / 2, 0), wc);
createWall(BOARD_W + WALL_THICKNESS * 2, WALL_HEIGHT, WALL_THICKNESS, new THREE.Vector3(0, WALL_HEIGHT / 2, -BOARD_H / 2 - WALL_THICKNESS / 2), wc);
createWall(BOARD_W + WALL_THICKNESS * 2, WALL_HEIGHT, WALL_THICKNESS, new THREE.Vector3(0, WALL_HEIGHT / 2, BOARD_H / 2 + WALL_THICKNESS / 2), wc);

// ─── Dice textures ─────────────────────────────────────────
const DICE_SIZE = 1.0;
const DICE_HALF = DICE_SIZE / 2;

const pipLayouts: Record<DiceValue, [number, number][]> = {
  1: [[0, 0]],
  2: [[-0.25, -0.25], [0.25, 0.25]],
  3: [[-0.25, -0.25], [0, 0], [0.25, 0.25]],
  4: [[-0.25, -0.25], [0.25, -0.25], [-0.25, 0.25], [0.25, 0.25]],
  5: [[-0.25, -0.25], [0.25, -0.25], [0, 0], [-0.25, 0.25], [0.25, 0.25]],
  6: [[-0.25, -0.25], [0.25, -0.25], [-0.25, 0], [0.25, 0], [-0.25, 0.25], [0.25, 0.25]],
};

const faceNormals: CANNON.Vec3[] = [
  new CANNON.Vec3(1, 0, 0),   // +X  slot 0
  new CANNON.Vec3(-1, 0, 0),  // -X  slot 1
  new CANNON.Vec3(0, 1, 0),   // +Y  slot 2
  new CANNON.Vec3(0, -1, 0),  // -Y  slot 3
  new CANNON.Vec3(0, 0, 1),   // +Z  slot 4
  new CANNON.Vec3(0, 0, -1),  // -Z  slot 5
];

function createDiceTexture(value: DiceValue): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#f5f5f0';
  ctx.fillRect(0, 0, size, size);

  ctx.fillStyle = '#1a1a2e';
  for (const [px, py] of pipLayouts[value]) {
    ctx.beginPath();
    ctx.arc(size / 2 + px * size, size / 2 + py * size, size * 0.08, 0, Math.PI * 2);
    ctx.fill();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
  return texture;
}

// Pre-generate textures for values 1-6
const diceTextures: Record<DiceValue, THREE.CanvasTexture> = {} as Record<DiceValue, THREE.CanvasTexture>;
for (let v = 1; v <= 6; v++) {
  diceTextures[v as DiceValue] = createDiceTexture(v as DiceValue);
}

// ─── Dice creation ─────────────────────────────────────────
const defaultFaceValues: DiceValue[] = [2, 5, 3, 4, 1, 6];

function createDiceMesh(): THREE.Mesh<RoundedBoxGeometry, THREE.MeshStandardMaterial[]> {
  const materials = defaultFaceValues.map(v =>
    new THREE.MeshStandardMaterial({ map: diceTextures[v], roughness: 0.4 })
  );
  const geometry = new RoundedBoxGeometry(DICE_SIZE, DICE_SIZE, DICE_SIZE, 4, 0.08);
  const mesh = new THREE.Mesh(geometry, materials);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  scene.add(mesh);
  return mesh;
}

function createDiceBody(): CANNON.Body {
  const body = new CANNON.Body({
    mass: params.diceMass,
    material: dicePhysMat,
    shape: new CANNON.Box(new CANNON.Vec3(DICE_HALF, DICE_HALF, DICE_HALF)),
    linearDamping: params.linearDamping,
    angularDamping: params.angularDamping,
  });
  world.addBody(body);
  return body;
}

// ─── Detect which material slot faces up ───────────────────
function getTopSlot(body: CANNON.Body): number {
  const up = new CANNON.Vec3(0, 1, 0);
  let bestDot = -Infinity;
  let bestSlot = 0;
  for (let i = 0; i < 6; i++) {
    const wn = body.quaternion.vmult(faceNormals[i]);
    const dot = wn.dot(up);
    if (dot > bestDot) { bestDot = dot; bestSlot = i; }
  }
  return bestSlot;
}

function oppositeSlot(slot: number): number {
  return slot % 2 === 0 ? slot + 1 : slot - 1;
}

// ─── Remap textures so desired value shows on top ──────────
function remapDiceTextures(
  mesh: THREE.Mesh<RoundedBoxGeometry, THREE.MeshStandardMaterial[]>,
  body: CANNON.Body,
  desiredTopValue: DiceValue
): void {
  const topSlot = getTopSlot(body);
  const bottomSlot = oppositeSlot(topSlot);
  const bottomValue = (7 - desiredTopValue) as DiceValue;

  const materials = mesh.material;
  materials[topSlot].map = diceTextures[desiredTopValue];
  materials[topSlot].needsUpdate = true;
  materials[bottomSlot].map = diceTextures[bottomValue];
  materials[bottomSlot].needsUpdate = true;

  const usedValues = new Set<DiceValue>([desiredTopValue, bottomValue]);
  const sideValues = ([1, 2, 3, 4, 5, 6] as DiceValue[]).filter(v => !usedValues.has(v));

  for (let i = sideValues.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [sideValues[i], sideValues[j]] = [sideValues[j], sideValues[i]];
  }

  let sideIdx = 0;
  for (let i = 0; i < 6; i++) {
    if (i === topSlot || i === bottomSlot) continue;
    materials[i].map = diceTextures[sideValues[sideIdx++]];
    materials[i].needsUpdate = true;
  }
}

function resetDiceTextures(
  mesh: THREE.Mesh<RoundedBoxGeometry, THREE.MeshStandardMaterial[]>
): void {
  const materials = mesh.material;
  for (let i = 0; i < 6; i++) {
    materials[i].map = diceTextures[defaultFaceValues[i]];
    materials[i].needsUpdate = true;
  }
}

// ─── Create two dice ───────────────────────────────────────
const dice: DiceState[] = [
  { mesh: createDiceMesh(), body: createDiceBody(), targetValue: 3, settled: false, lastTopSlot: -1 },
  { mesh: createDiceMesh(), body: createDiceBody(), targetValue: 6, settled: false, lastTopSlot: -1 },
];

dice.forEach(d => {
  d.body.position.set(BOARD_W, -5, 0);
  d.mesh.visible = false;
});

// ─── Throw logic ───────────────────────────────────────────
let isAnimating = false;
let simTime = 0;

const throwBtn = document.getElementById('throwBtn') as HTMLButtonElement;
const statusEl = document.getElementById('status') as HTMLDivElement;

function throwDice(): void {
  if (isAnimating) return;
  isAnimating = true;
  throwBtn.disabled = true;
  statusEl.textContent = 'Throwing...';
  simTime = 0;

  const targetValues: DiceValue[] = [
    parseInt((document.getElementById('dice1Val') as HTMLSelectElement).value) as DiceValue,
    parseInt((document.getElementById('dice2Val') as HTMLSelectElement).value) as DiceValue,
  ];

  const startX = BOARD_W / 2 - 1.5;
  const startY = DICE_HALF + params.throwHeight;

  dice.forEach((d, i) => {
    d.mesh.visible = true;
    d.targetValue = targetValues[i];
    d.settled = false;
    d.lastTopSlot = -1;

    resetDiceTextures(d.mesh);

    d.body.mass = params.diceMass;
    d.body.updateMassProperties();
    d.body.linearDamping = params.linearDamping;
    d.body.angularDamping = params.angularDamping;

    d.body.type = CANNON.Body.DYNAMIC;
    d.body.velocity.setZero();
    d.body.angularVelocity.setZero();
    d.body.force.setZero();
    d.body.torque.setZero();

    d.body.position.set(startX, startY, i === 0 ? -0.8 : 0.8);

    const rq = new CANNON.Quaternion();
    rq.setFromEuler(Math.random() * Math.PI * 2, Math.random() * Math.PI * 2, Math.random() * Math.PI * 2);
    d.body.quaternion.copy(rq);

    const vx = -(params.throwSpeed + Math.random() * params.throwSpeedRandom);
    const vz = (Math.random() - 0.5) * params.throwZSpread;
    d.body.velocity.set(vx, params.throwUpward, vz);

    d.body.angularVelocity.set(
      (Math.random() - 0.5) * params.spinX,
      (Math.random() - 0.5) * params.spinY,
      (Math.random() - 0.5) * params.spinZ
    );
  });
}

throwBtn.addEventListener('click', throwDice);

// ─── Animation loop ────────────────────────────────────────
const timer = new THREE.Timer();

function animate(): void {
  requestAnimationFrame(animate);
  timer.update();
  const dt = Math.min(timer.getDelta(), 0.05);

  if (isAnimating) {
    world.step(1 / 120, dt, 8);
    simTime += dt;

    if (simTime > params.textureDelay) {
      dice.forEach(d => {
        if (d.settled) return;
        const topSlot = getTopSlot(d.body);
        if (topSlot !== d.lastTopSlot) {
          d.lastTopSlot = topSlot;
          remapDiceTextures(d.mesh, d.body, d.targetValue);
        }
      });
    }

    if (simTime > 1.0) {
      const allSleeping = dice.every(d =>
        d.body.velocity.length() < params.sleepThreshold
        && d.body.angularVelocity.length() < params.sleepThreshold
      );

      if (allSleeping) {
        dice.forEach(d => {
          if (!d.settled) {
            d.body.velocity.setZero();
            d.body.angularVelocity.setZero();
            remapDiceTextures(d.mesh, d.body, d.targetValue);
            d.settled = true;
          }
        });

        if (dice.every(d => d.settled)) {
          isAnimating = false;
          throwBtn.disabled = false;
          statusEl.textContent = `Result: ${dice[0].targetValue} and ${dice[1].targetValue}`;
        }
      }
    }
  }

  dice.forEach(d => {
    d.mesh.position.copy(d.body.position);
    d.mesh.quaternion.copy(d.body.quaternion);
  });

  renderer.render(scene, camera);
}

animate();

// ─── Resize ────────────────────────────────────────────────
window.addEventListener('resize', () => {
  const a = window.innerWidth / window.innerHeight;
  camera.left = -frustumSize * a / 2;
  camera.right = frustumSize * a / 2;
  camera.top = frustumSize / 2;
  camera.bottom = -frustumSize / 2;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

document.addEventListener('keydown', (e: KeyboardEvent) => {
  if (e.code === 'Space') { e.preventDefault(); throwDice(); }
});
