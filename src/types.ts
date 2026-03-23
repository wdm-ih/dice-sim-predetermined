import type * as CANNON from 'cannon-es';
import type * as THREE from 'three';

export type DiceValue = 1 | 2 | 3 | 4 | 5 | 6;

// ─── Injectable: Texture Provider ─────────────────────
export interface ITextureProvider {
  init(renderer: THREE.WebGLRenderer): void;
  getTexture(value: DiceValue): THREE.Texture;
}

// ─── Injectable: Dice Factory ─────────────────────────
export interface IDiceFactory {
  createMesh(scene: THREE.Scene): THREE.Mesh;
  createBody(world: CANNON.World, material: CANNON.Material): CANNON.Body;
  readonly dieHalfSize: number;
  readonly faceNormals: CANNON.Vec3[];
  readonly defaultFaceValues: DiceValue[];
}

// ─── Injectable: Environment ──────────────────────────
export interface IEnvironment {
  setup(
    scene: THREE.Scene,
    world: CANNON.World,
    boardWidth: number,
    boardHeight: number,
    floorMaterial: CANNON.Material,
    wallMaterial: CANNON.Material,
  ): void;
}

// ─── Parameters ───────────────────────────────────────
export interface ThrowParams {
  throwSpeed: number;
  throwSpeedRandom: number;
  throwHeight: number;
  throwUpward: number;
  throwZSpread: number;
  spinX: number;
  spinY: number;
  spinZ: number;
}

export interface PhysicsParams {
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

// ─── Engine configuration ─────────────────────────────
export interface DiceEngineConfig {
  container: HTMLElement;
  diceCount?: number;
  frustumSize?: number;
  textureProvider?: ITextureProvider;
  diceFactory?: IDiceFactory;
  environment?: IEnvironment;
  debug?: boolean;
  throwParams?: Partial<ThrowParams>;
  physicsParams?: Partial<PhysicsParams>;
}

// ─── Internal dice state ──────────────────────────────
export interface DiceState {
  mesh: THREE.Mesh;
  body: CANNON.Body;
  targetValue: DiceValue;
  settled: boolean;
  lastTopSlot: number;
}
