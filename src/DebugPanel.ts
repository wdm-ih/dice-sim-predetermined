import type * as CANNON from 'cannon-es';
import GUI from 'lil-gui';
import type { PhysicsParams, ThrowParams } from './types';

export function createDebugPanel(
  throwParams: ThrowParams,
  physicsParams: PhysicsParams,
  world: CANNON.World,
  contactMaterials: {
    diceFloorCM: CANNON.ContactMaterial;
    diceWallCM: CANNON.ContactMaterial;
  },
): GUI {
  const gui = new GUI({ title: 'Dice Config' });

  const fThrow = gui.addFolder('Throw');
  fThrow.add(throwParams, 'throwSpeed', 10, 80, 1).name('Speed');
  fThrow.add(throwParams, 'throwSpeedRandom', 0, 20, 1).name('Speed random');
  fThrow.add(throwParams, 'throwHeight', 0.5, 8, 0.5).name('Height');
  fThrow.add(throwParams, 'throwUpward', 0, 5, 0.1).name('Upward');
  fThrow.add(throwParams, 'throwZSpread', 0, 10, 0.5).name('Z spread');
  fThrow.add(throwParams, 'spinX', 0, 40, 1).name('Spin X');
  fThrow.add(throwParams, 'spinY', 0, 40, 1).name('Spin Y');
  fThrow.add(throwParams, 'spinZ', 0, 40, 1).name('Spin Z');

  const fPhysics = gui.addFolder('Physics');
  fPhysics.add(physicsParams, 'gravity', -100, -5, 1).name('Gravity').onChange((v: number) => {
    world.gravity.set(0, v, 0);
  });
  fPhysics.add(physicsParams, 'diceMass', 0.05, 5, 0.05).name('Dice mass');
  fPhysics.add(physicsParams, 'linearDamping', 0, 0.99, 0.01).name('Linear damp');
  fPhysics.add(physicsParams, 'angularDamping', 0, 0.99, 0.01).name('Angular damp');
  fPhysics.add(physicsParams, 'floorFriction', 0, 2, 0.05).name('Floor friction').onChange((v: number) => {
    contactMaterials.diceFloorCM.friction = v;
  });
  fPhysics.add(physicsParams, 'floorRestitution', 0, 1, 0.05).name('Floor bounce').onChange((v: number) => {
    contactMaterials.diceFloorCM.restitution = v;
  });
  fPhysics.add(physicsParams, 'wallFriction', 0, 2, 0.05).name('Wall friction').onChange((v: number) => {
    contactMaterials.diceWallCM.friction = v;
  });
  fPhysics.add(physicsParams, 'wallRestitution', 0, 1, 0.05).name('Wall bounce').onChange((v: number) => {
    contactMaterials.diceWallCM.restitution = v;
  });
  fPhysics.add(physicsParams, 'sleepThreshold', 0.01, 0.5, 0.01).name('Sleep threshold');
  fPhysics.add(physicsParams, 'textureDelay', 0, 3, 0.1).name('Texture delay (s)');

  return gui;
}
