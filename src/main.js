import * as CANNON from 'cannon-es';
import GUI from 'lil-gui';
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

// ─── Tunable params ────────────────────────────────────────
const params = {
  // Throw
  throwSpeed: 65,
  throwSpeedRandom: 8,
  throwHeight: 3,
  throwUpward: 0.5,
  throwZSpread: 3,
  spinX: 15,
  spinY: 10,
  spinZ: 15,

  // Physics
  gravity: -40,
  diceMass: 0.3,
  linearDamping: 0.25,
  angularDamping: 0.25,
  floorFriction: 0.6,
  floorRestitution: 0.1,
  wallFriction: 0.4,
  wallRestitution: 0.3,

  // Settling blend
  purePhysicsTime: 1.2,
  blendDuration: 1.5,
  blendStrengthMax: 0.15,
  angularDampBlend: 0.05,
  sleepThreshold: 0.05,
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
fPhysics.add(params, 'gravity', -100, -5, 1).name('Gravity').onChange(v => {
  world.gravity.set(0, v, 0);
});
fPhysics.add(params, 'diceMass', 0.05, 5, 0.05).name('Dice mass');
fPhysics.add(params, 'linearDamping', 0, 0.99, 0.01).name('Linear damp');
fPhysics.add(params, 'angularDamping', 0, 0.99, 0.01).name('Angular damp');
fPhysics.add(params, 'floorFriction', 0, 2, 0.05).name('Floor friction').onChange(v => {
  diceFloorCM.friction = v;
});
fPhysics.add(params, 'floorRestitution', 0, 1, 0.05).name('Floor bounce').onChange(v => {
  diceFloorCM.restitution = v;
});
fPhysics.add(params, 'wallFriction', 0, 2, 0.05).name('Wall friction').onChange(v => {
  diceWallCM.friction = v;
});
fPhysics.add(params, 'wallRestitution', 0, 1, 0.05).name('Wall bounce').onChange(v => {
  diceWallCM.restitution = v;
});

const fSettle = gui.addFolder('Settling');
fSettle.add(params, 'purePhysicsTime', 0.2, 4, 0.1).name('Pure physics (s)');
fSettle.add(params, 'blendDuration', 0.5, 5, 0.1).name('Blend duration (s)');
fSettle.add(params, 'blendStrengthMax', 0.01, 0.5, 0.01).name('Blend strength');
fSettle.add(params, 'angularDampBlend', 0.01, 0.3, 0.01).name('Ang. damp blend');
fSettle.add(params, 'sleepThreshold', 0.01, 0.5, 0.01).name('Sleep threshold');

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
function createWall(width, height, depth, position, color) {
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
  body.position.copy(position);
  world.addBody(body);
}

const wc = 0x4a2c0a;
createWall(WALL_THICKNESS, WALL_HEIGHT, BOARD_H, new THREE.Vector3(-BOARD_W / 2 - WALL_THICKNESS / 2, WALL_HEIGHT / 2, 0), wc);
createWall(WALL_THICKNESS, WALL_HEIGHT, BOARD_H, new THREE.Vector3(BOARD_W / 2 + WALL_THICKNESS / 2, WALL_HEIGHT / 2, 0), wc);
createWall(BOARD_W + WALL_THICKNESS * 2, WALL_HEIGHT, WALL_THICKNESS, new THREE.Vector3(0, WALL_HEIGHT / 2, -BOARD_H / 2 - WALL_THICKNESS / 2), wc);
createWall(BOARD_W + WALL_THICKNESS * 2, WALL_HEIGHT, WALL_THICKNESS, new THREE.Vector3(0, WALL_HEIGHT / 2, BOARD_H / 2 + WALL_THICKNESS / 2), wc);

// ─── Dice creation ─────────────────────────────────────────
const DICE_SIZE = 1.0;
const DICE_HALF = DICE_SIZE / 2;

const pipLayouts = {
  1: [[0, 0]],
  2: [[-0.25, -0.25], [0.25, 0.25]],
  3: [[-0.25, -0.25], [0, 0], [0.25, 0.25]],
  4: [[-0.25, -0.25], [0.25, -0.25], [-0.25, 0.25], [0.25, 0.25]],
  5: [[-0.25, -0.25], [0.25, -0.25], [0, 0], [-0.25, 0.25], [0.25, 0.25]],
  6: [[-0.25, -0.25], [0.25, -0.25], [-0.25, 0], [0.25, 0], [-0.25, 0.25], [0.25, 0.25]],
};

const faceConfig = [
  { value: 2, normal: [1, 0, 0] },
  { value: 5, normal: [-1, 0, 0] },
  { value: 3, normal: [0, 1, 0] },
  { value: 4, normal: [0, -1, 0] },
  { value: 1, normal: [0, 0, 1] },
  { value: 6, normal: [0, 0, -1] },
];

function createDiceTexture(value) {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

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

function createDiceMesh() {
  const faceValues = [2, 5, 3, 4, 1, 6];
  const materials = faceValues.map(v =>
    new THREE.MeshStandardMaterial({ map: createDiceTexture(v), roughness: 0.4 })
  );
  const geometry = new RoundedBoxGeometry(DICE_SIZE, DICE_SIZE, DICE_SIZE, 4, 0.08);
  const mesh = new THREE.Mesh(geometry, materials);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  scene.add(mesh);
  return mesh;
}

function createDiceBody() {
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

// ─── Quaternion helpers ────────────────────────────────────
function getQuaternionForTopFace(targetValue) {
  const face = faceConfig.find(f => f.value === targetValue);
  if (!face) return new CANNON.Quaternion();

  const quat = new THREE.Quaternion();
  quat.setFromUnitVectors(new THREE.Vector3(...face.normal), new THREE.Vector3(0, 1, 0));
  return new CANNON.Quaternion(quat.x, quat.y, quat.z, quat.w);
}

function getTopFaceValue(body) {
  const up = new CANNON.Vec3(0, 1, 0);
  let bestDot = -Infinity;
  let bestValue = 1;
  for (const face of faceConfig) {
    const wn = body.quaternion.vmult(new CANNON.Vec3(...face.normal));
    const dot = wn.dot(up);
    if (dot > bestDot) { bestDot = dot; bestValue = face.value; }
  }
  return bestValue;
}

function getNearestTargetQuat(body, targetValue) {
  const baseQ = getQuaternionForTopFace(targetValue);
  const curQ = new THREE.Quaternion(body.quaternion.x, body.quaternion.y, body.quaternion.z, body.quaternion.w);

  let bestQ = null;
  let bestAngle = Infinity;
  for (let i = 0; i < 4; i++) {
    const yRot = new CANNON.Quaternion();
    yRot.setFromEuler(0, (i * Math.PI) / 2, 0);
    const candidate = baseQ.mult(yRot);
    const angle = curQ.angleTo(new THREE.Quaternion(candidate.x, candidate.y, candidate.z, candidate.w));
    if (angle < bestAngle) { bestAngle = angle; bestQ = candidate; }
  }
  return bestQ;
}

// ─── Create two dice ───────────────────────────────────────
const dice = [
  { mesh: createDiceMesh(), body: createDiceBody() },
  { mesh: createDiceMesh(), body: createDiceBody() },
];

dice.forEach(d => {
  d.body.position.set(BOARD_W, -5, 0);
  d.mesh.visible = false;
});

// ─── Throw logic ───────────────────────────────────────────
let isAnimating = false;
let simTime = 0;

const throwBtn = document.getElementById('throwBtn');
const statusEl = document.getElementById('status');

function throwDice() {
  if (isAnimating) return;
  isAnimating = true;
  throwBtn.disabled = true;
  statusEl.textContent = 'Throwing...';
  simTime = 0;

  const targetValues = [
    parseInt(document.getElementById('dice1Val').value),
    parseInt(document.getElementById('dice2Val').value),
  ];

  const startX = BOARD_W / 2 - 1.5;
  const startY = DICE_HALF + params.throwHeight;

  dice.forEach((d, i) => {
    d.mesh.visible = true;
    d.targetValue = targetValues[i];
    d.settled = false;

    // Apply current GUI params to body
    d.body.mass = params.diceMass;
    d.body.updateMassProperties();
    d.body.linearDamping = params.linearDamping;
    d.body.angularDamping = params.angularDamping;

    d.body.type = CANNON.Body.DYNAMIC;
    d.body.velocity.setZero();
    d.body.angularVelocity.setZero();
    d.body.force.setZero();
    d.body.torque.setZero();

    d.body.position.set(startX, startY, (i === 0) ? -0.8 : 0.8);

    // Random orientation
    const rq = new CANNON.Quaternion();
    rq.setFromEuler(Math.random() * Math.PI * 2, Math.random() * Math.PI * 2, Math.random() * Math.PI * 2);
    d.body.quaternion.copy(rq);

    // Throw: strong leftward
    const vx = -(params.throwSpeed + Math.random() * params.throwSpeedRandom);
    const vz = (Math.random() - 0.5) * params.throwZSpread;
    d.body.velocity.set(vx, params.throwUpward, vz);

    // Tumbling spin
    d.body.angularVelocity.set(
      (Math.random() - 0.5) * params.spinX,
      (Math.random() - 0.5) * params.spinY,
      (Math.random() - 0.5) * params.spinZ
    );
  });
}

throwBtn.addEventListener('click', throwDice);

// ─── Animation loop ────────────────────────────────────────
const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.05);

  if (isAnimating) {
    world.step(1 / 120, dt, 8);
    simTime += dt;

    // Gradual orientation blending after pure physics phase
    if (simTime > params.purePhysicsTime) {
      const progress = Math.min((simTime - params.purePhysicsTime) / params.blendDuration, 1);
      const strength = progress * progress * progress; // ease-in cubic

      dice.forEach(d => {
        if (d.settled) return;

        const targetQ = getNearestTargetQuat(d.body, d.targetValue);
        const curQ = d.body.quaternion.clone();
        const blended = new CANNON.Quaternion();
        CANNON.Quaternion.prototype.slerp.call(curQ, targetQ, strength * params.blendStrengthMax, blended);
        d.body.quaternion.copy(blended);

        // Extra angular damping during blend
        const damp = 1 - strength * params.angularDampBlend;
        d.body.angularVelocity.scale(damp, d.body.angularVelocity);
      });
    }

    // Check settled
    if (simTime > params.purePhysicsTime + params.blendDuration * 0.5) {
      const allSleeping = dice.every(d => {
        return d.body.velocity.length() < params.sleepThreshold
            && d.body.angularVelocity.length() < params.sleepThreshold;
      });

      if (allSleeping) {
        dice.forEach(d => {
          if (!d.settled) {
            d.body.quaternion.copy(getNearestTargetQuat(d.body, d.targetValue));
            d.body.velocity.setZero();
            d.body.angularVelocity.setZero();
            d.settled = true;
          }
        });

        if (dice.every(d => d.settled)) {
          isAnimating = false;
          throwBtn.disabled = false;
          statusEl.textContent = `Result: ${getTopFaceValue(dice[0].body)} and ${getTopFaceValue(dice[1].body)}`;
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

document.addEventListener('keydown', (e) => {
  if (e.code === 'Space') { e.preventDefault(); throwDice(); }
});
