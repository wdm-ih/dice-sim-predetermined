import * as CANNON from 'cannon-es';
import type * as THREE from 'three';
import type { DiceValue, ITextureProvider } from './types';

export function getTopSlot(body: CANNON.Body, faceNormals: CANNON.Vec3[]): number {
  const up = new CANNON.Vec3(0, 1, 0);
  let bestDot = -Infinity;
  let bestSlot = 0;
  for (let i = 0; i < faceNormals.length; i++) {
    const wn = body.quaternion.vmult(faceNormals[i]);
    const dot = wn.dot(up);
    if (dot > bestDot) { bestDot = dot; bestSlot = i; }
  }
  return bestSlot;
}

export function oppositeSlot(slot: number): number {
  return slot % 2 === 0 ? slot + 1 : slot - 1;
}

export function remapDiceTextures(
  mesh: THREE.Mesh,
  body: CANNON.Body,
  desiredTopValue: DiceValue,
  faceNormals: CANNON.Vec3[],
  textureProvider: ITextureProvider,
): void {
  const materials = mesh.material as THREE.MeshStandardMaterial[];
  const topSlot = getTopSlot(body, faceNormals);
  const bottomSlot = oppositeSlot(topSlot);
  const bottomValue = (7 - desiredTopValue) as DiceValue;

  materials[topSlot].map = textureProvider.getTexture(desiredTopValue);
  materials[topSlot].needsUpdate = true;
  materials[bottomSlot].map = textureProvider.getTexture(bottomValue);
  materials[bottomSlot].needsUpdate = true;

  const usedValues = new Set<DiceValue>([desiredTopValue, bottomValue]);
  const sideValues = ([1, 2, 3, 4, 5, 6] as DiceValue[]).filter(v => !usedValues.has(v));

  for (let i = sideValues.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [sideValues[i], sideValues[j]] = [sideValues[j], sideValues[i]];
  }

  let sideIdx = 0;
  for (let i = 0; i < materials.length; i++) {
    if (i === topSlot || i === bottomSlot) continue;
    materials[i].map = textureProvider.getTexture(sideValues[sideIdx++]);
    materials[i].needsUpdate = true;
  }
}

export function resetDiceTextures(
  mesh: THREE.Mesh,
  defaultFaceValues: DiceValue[],
  textureProvider: ITextureProvider,
): void {
  const materials = mesh.material as THREE.MeshStandardMaterial[];
  for (let i = 0; i < materials.length; i++) {
    materials[i].map = textureProvider.getTexture(defaultFaceValues[i]);
    materials[i].needsUpdate = true;
  }
}
