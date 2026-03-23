import * as CANNON from 'cannon-es';
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import type { DiceValue, IDiceFactory, ITextureProvider } from './types';

export class DefaultDiceFactory implements IDiceFactory {
  readonly dieHalfSize: number;
  readonly faceNormals: CANNON.Vec3[] = [
    new CANNON.Vec3(1, 0, 0),   // +X  slot 0
    new CANNON.Vec3(-1, 0, 0),  // -X  slot 1
    new CANNON.Vec3(0, 1, 0),   // +Y  slot 2
    new CANNON.Vec3(0, -1, 0),  // -Y  slot 3
    new CANNON.Vec3(0, 0, 1),   // +Z  slot 4
    new CANNON.Vec3(0, 0, -1),  // -Z  slot 5
  ];
  readonly defaultFaceValues: DiceValue[] = [2, 5, 3, 4, 1, 6];

  private readonly dieSize: number;
  private readonly segments: number;
  private readonly radius: number;
  private readonly textureProvider: ITextureProvider;

  constructor(
    textureProvider: ITextureProvider,
    options?: { size?: number; segments?: number; radius?: number },
  ) {
    this.textureProvider = textureProvider;
    this.dieSize = options?.size ?? 1.0;
    this.dieHalfSize = this.dieSize / 2;
    this.segments = options?.segments ?? 4;
    this.radius = options?.radius ?? 0.08;
  }

  createMesh(scene: THREE.Scene): THREE.Mesh {
    const materials = this.defaultFaceValues.map(
      v => new THREE.MeshStandardMaterial({
        map: this.textureProvider.getTexture(v),
        roughness: 0.4,
      }),
    );
    const geometry = new RoundedBoxGeometry(
      this.dieSize, this.dieSize, this.dieSize,
      this.segments, this.radius,
    );
    const mesh = new THREE.Mesh(geometry, materials);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    scene.add(mesh);
    return mesh;
  }

  createBody(world: CANNON.World, material: CANNON.Material): CANNON.Body {
    const body = new CANNON.Body({
      mass: 0.3,
      material,
      shape: new CANNON.Box(
        new CANNON.Vec3(this.dieHalfSize, this.dieHalfSize, this.dieHalfSize),
      ),
      linearDamping: 0.25,
      angularDamping: 0.25,
    });
    world.addBody(body);
    return body;
  }
}
