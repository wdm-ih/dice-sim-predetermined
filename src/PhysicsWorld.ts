import * as CANNON from 'cannon-es';
import type { PhysicsParams } from './types';

export interface PhysicsContext {
  world: CANNON.World;
  diceMaterial: CANNON.Material;
  floorMaterial: CANNON.Material;
  wallMaterial: CANNON.Material;
  diceFloorCM: CANNON.ContactMaterial;
  diceWallCM: CANNON.ContactMaterial;
  diceDiceCM: CANNON.ContactMaterial;
}

export function createPhysicsWorld(params: PhysicsParams): PhysicsContext {
  const world = new CANNON.World({
    gravity: new CANNON.Vec3(0, params.gravity, 0),
  });
  world.defaultContactMaterial.friction = 0.4;
  world.defaultContactMaterial.restitution = 0.3;

  const diceMaterial = new CANNON.Material('dice');
  const wallMaterial = new CANNON.Material('wall');
  const floorMaterial = new CANNON.Material('floor');

  const diceWallCM = new CANNON.ContactMaterial(diceMaterial, wallMaterial, {
    friction: params.wallFriction,
    restitution: params.wallRestitution,
  });
  const diceFloorCM = new CANNON.ContactMaterial(diceMaterial, floorMaterial, {
    friction: params.floorFriction,
    restitution: params.floorRestitution,
  });
  const diceDiceCM = new CANNON.ContactMaterial(diceMaterial, diceMaterial, {
    friction: 0.3,
    restitution: 0.25,
  });

  world.addContactMaterial(diceWallCM);
  world.addContactMaterial(diceFloorCM);
  world.addContactMaterial(diceDiceCM);

  return { world, diceMaterial, floorMaterial, wallMaterial, diceFloorCM, diceWallCM, diceDiceCM };
}
