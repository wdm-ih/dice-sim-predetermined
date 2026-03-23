import * as CANNON from 'cannon-es';
import * as THREE from 'three';
import type { IEnvironment } from './types';

const WALL_HEIGHT = 6;
const WALL_THICKNESS = 0.4;
const WALL_COLOR = 0x4a2c0a;
const FLOOR_COLOR = 0x1a472a;

export class DefaultEnvironment implements IEnvironment {
  setup(
    scene: THREE.Scene,
    world: CANNON.World,
    boardWidth: number,
    boardHeight: number,
    floorMaterial: CANNON.Material,
    wallMaterial: CANNON.Material,
  ): void {
    this.createFloor(scene, world, boardWidth, boardHeight, floorMaterial);
    this.createWalls(scene, world, boardWidth, boardHeight, wallMaterial);
  }

  private createFloor(
    scene: THREE.Scene,
    world: CANNON.World,
    boardWidth: number,
    boardHeight: number,
    material: CANNON.Material,
  ): void {
    const mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(boardWidth, boardHeight),
      new THREE.MeshStandardMaterial({ color: FLOOR_COLOR, roughness: 0.9 }),
    );
    mesh.rotation.x = -Math.PI / 2;
    mesh.receiveShadow = true;
    scene.add(mesh);

    const body = new CANNON.Body({ mass: 0, material, shape: new CANNON.Plane() });
    body.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
    world.addBody(body);
  }

  private createWalls(
    scene: THREE.Scene,
    world: CANNON.World,
    bw: number,
    bh: number,
    material: CANNON.Material,
  ): void {
    const t = WALL_THICKNESS;
    const h = WALL_HEIGHT;

    const walls: { w: number; h: number; d: number; pos: [number, number, number] }[] = [
      { w: t, h, d: bh, pos: [-bw / 2 - t / 2, h / 2, 0] },           // left
      { w: t, h, d: bh, pos: [bw / 2 + t / 2, h / 2, 0] },            // right
      { w: bw + t * 2, h, d: t, pos: [0, h / 2, -bh / 2 - t / 2] },   // top
      { w: bw + t * 2, h, d: t, pos: [0, h / 2, bh / 2 + t / 2] },    // bottom
    ];

    for (const wall of walls) {
      const mesh = new THREE.Mesh(
        new THREE.BoxGeometry(wall.w, wall.h, wall.d),
        new THREE.MeshStandardMaterial({ color: WALL_COLOR, roughness: 0.7, metalness: 0.1 }),
      );
      mesh.position.set(...wall.pos);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      scene.add(mesh);

      const body = new CANNON.Body({
        mass: 0,
        material,
        shape: new CANNON.Box(new CANNON.Vec3(wall.w / 2, wall.h / 2, wall.d / 2)),
      });
      body.position.set(...wall.pos);
      world.addBody(body);
    }
  }
}
