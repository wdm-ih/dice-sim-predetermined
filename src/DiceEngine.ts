import * as CANNON from 'cannon-es';
import * as THREE from 'three';
import { createDebugPanel } from './DebugPanel';
import { DefaultDiceFactory } from './DiceFactory';
import { DefaultEnvironment } from './Environment';
import { createPhysicsWorld, type PhysicsContext } from './PhysicsWorld';
import { createScene, type SceneContext } from './SceneSetup';
import { DefaultTextureProvider } from './TextureProvider';
import { getTopSlot, remapDiceTextures, resetDiceTextures } from './TextureRemapper';
import type {
  DiceEngineConfig,
  DiceState,
  DiceValue,
  IDiceFactory,
  IEnvironment,
  ITextureProvider,
  PhysicsParams,
  ThrowParams,
} from './types';

const DEFAULT_THROW: ThrowParams = {
  throwSpeed: 65,
  throwSpeedRandom: 8,
  throwHeight: 3,
  throwUpward: 0.5,
  throwZSpread: 3,
  spinX: 15,
  spinY: 10,
  spinZ: 15,
};

const DEFAULT_PHYSICS: PhysicsParams = {
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

export class DiceEngine {
  private sceneCtx: SceneContext;
  private physicsCtx: PhysicsContext;
  private textureProvider: ITextureProvider;
  private diceFactory: IDiceFactory;
  private environment: IEnvironment;

  private dice: DiceState[] = [];
  private diceCount: number;

  private throwParams: ThrowParams;
  private physicsParams: PhysicsParams;

  private animating = false;
  private simTime = 0;
  private timer = new THREE.Timer();
  private animFrameId = 0;

  private settledCallbacks: ((results: DiceValue[]) => void)[] = [];
  private gui: ReturnType<typeof createDebugPanel> | null = null;

  constructor(config: DiceEngineConfig) {
    this.diceCount = config.diceCount ?? 2;
    const frustumSize = config.frustumSize ?? 18;

    this.throwParams = { ...DEFAULT_THROW, ...config.throwParams };
    this.physicsParams = { ...DEFAULT_PHYSICS, ...config.physicsParams };

    // Scene
    this.sceneCtx = createScene(config.container, frustumSize);

    // Physics
    this.physicsCtx = createPhysicsWorld(this.physicsParams);

    // Injectables
    this.textureProvider = config.textureProvider ?? new DefaultTextureProvider();
    this.textureProvider.init(this.sceneCtx.renderer);

    this.diceFactory = config.diceFactory ?? new DefaultDiceFactory(this.textureProvider);

    this.environment = config.environment ?? new DefaultEnvironment();
    this.environment.setup(
      this.sceneCtx.scene,
      this.physicsCtx.world,
      this.sceneCtx.boardWidth,
      this.sceneCtx.boardHeight,
      this.physicsCtx.floorMaterial,
      this.physicsCtx.wallMaterial,
    );

    // Create dice
    for (let i = 0; i < this.diceCount; i++) {
      const mesh = this.diceFactory.createMesh(this.sceneCtx.scene);
      const body = this.diceFactory.createBody(this.physicsCtx.world, this.physicsCtx.diceMaterial);
      body.position.set(this.sceneCtx.boardWidth, -5, 0);
      mesh.visible = false;
      this.dice.push({ mesh, body, targetValue: 1, settled: false, lastTopSlot: -1 });
    }

    // Debug panel
    if (config.debug) {
      this.gui = createDebugPanel(
        this.throwParams,
        this.physicsParams,
        this.physicsCtx.world,
        {
          diceFloorCM: this.physicsCtx.diceFloorCM,
          diceWallCM: this.physicsCtx.diceWallCM,
        },
      );
    }

    // Start render loop
    this.animate();
  }

  get isAnimating(): boolean {
    return this.animating;
  }

  onSettled(callback: (results: DiceValue[]) => void): void {
    this.settledCallbacks.push(callback);
  }

  throw(targetValues: DiceValue[]): void {
    if (this.animating) return;
    if (targetValues.length !== this.diceCount) {
      throw new Error(`Expected ${this.diceCount} target values, got ${targetValues.length}`);
    }

    this.animating = true;
    this.simTime = 0;

    const { throwParams: tp, physicsParams: pp } = this;
    const bw = this.sceneCtx.boardWidth;
    const startX = bw / 2 - 1.5;
    const startY = this.diceFactory.dieHalfSize + tp.throwHeight;

    this.dice.forEach((d, i) => {
      d.mesh.visible = true;
      d.targetValue = targetValues[i];
      d.settled = false;
      d.lastTopSlot = -1;

      resetDiceTextures(d.mesh, this.diceFactory.defaultFaceValues, this.textureProvider);

      // Apply live physics params
      d.body.mass = pp.diceMass;
      d.body.updateMassProperties();
      d.body.linearDamping = pp.linearDamping;
      d.body.angularDamping = pp.angularDamping;

      d.body.type = CANNON.Body.DYNAMIC;
      d.body.velocity.setZero();
      d.body.angularVelocity.setZero();
      d.body.force.setZero();
      d.body.torque.setZero();

      // Spread dice along Z
      const zSpacing = this.diceCount > 1
        ? -0.8 + (i * 1.6) / (this.diceCount - 1)
        : 0;
      d.body.position.set(startX, startY, zSpacing);

      // Random orientation
      const rq = new CANNON.Quaternion();
      rq.setFromEuler(
        Math.random() * Math.PI * 2,
        Math.random() * Math.PI * 2,
        Math.random() * Math.PI * 2,
      );
      d.body.quaternion.copy(rq);

      // Velocity
      const vx = -(tp.throwSpeed + Math.random() * tp.throwSpeedRandom);
      const vz = (Math.random() - 0.5) * tp.throwZSpread;
      d.body.velocity.set(vx, tp.throwUpward, vz);

      // Spin
      d.body.angularVelocity.set(
        (Math.random() - 0.5) * tp.spinX,
        (Math.random() - 0.5) * tp.spinY,
        (Math.random() - 0.5) * tp.spinZ,
      );
    });
  }

  dispose(): void {
    cancelAnimationFrame(this.animFrameId);
    this.sceneCtx.dispose();
    this.gui?.destroy();
  }

  // ─── Private ──────────────────────────────────────────

  private animate = (): void => {
    this.animFrameId = requestAnimationFrame(this.animate);
    this.timer.update();
    const dt = Math.min(this.timer.getDelta(), 0.05);

    if (this.animating) {
      this.physicsCtx.world.step(1 / 120, dt, 8);
      this.simTime += dt;

      // Continuous texture tracking
      if (this.simTime > this.physicsParams.textureDelay) {
        for (const d of this.dice) {
          if (d.settled) continue;
          const topSlot = getTopSlot(d.body, this.diceFactory.faceNormals);
          if (topSlot !== d.lastTopSlot) {
            d.lastTopSlot = topSlot;
            remapDiceTextures(d.mesh, d.body, d.targetValue, this.diceFactory.faceNormals, this.textureProvider);
          }
        }
      }

      // Sleep detection
      if (this.simTime > 1.0) {
        const threshold = this.physicsParams.sleepThreshold;
        const allSleeping = this.dice.every(d =>
          d.body.velocity.length() < threshold
          && d.body.angularVelocity.length() < threshold,
        );

        if (allSleeping) {
          for (const d of this.dice) {
            if (!d.settled) {
              d.body.velocity.setZero();
              d.body.angularVelocity.setZero();
              remapDiceTextures(d.mesh, d.body, d.targetValue, this.diceFactory.faceNormals, this.textureProvider);
              d.settled = true;
            }
          }

          if (this.dice.every(d => d.settled)) {
            this.animating = false;
            const results = this.dice.map(d => d.targetValue);
            for (const cb of this.settledCallbacks) cb(results);
          }
        }
      }
    }

    // Sync meshes
    for (const d of this.dice) {
      d.mesh.position.copy(d.body.position);
      d.mesh.quaternion.copy(d.body.quaternion);
    }

    this.sceneCtx.renderer.render(this.sceneCtx.scene, this.sceneCtx.camera);
  };
}
