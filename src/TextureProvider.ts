import * as THREE from 'three';
import type { DiceValue, ITextureProvider } from './types';

const pipLayouts: Record<DiceValue, [number, number][]> = {
  1: [[0, 0]],
  2: [[-0.25, -0.25], [0.25, 0.25]],
  3: [[-0.25, -0.25], [0, 0], [0.25, 0.25]],
  4: [[-0.25, -0.25], [0.25, -0.25], [-0.25, 0.25], [0.25, 0.25]],
  5: [[-0.25, -0.25], [0.25, -0.25], [0, 0], [-0.25, 0.25], [0.25, 0.25]],
  6: [[-0.25, -0.25], [0.25, -0.25], [-0.25, 0], [0.25, 0], [-0.25, 0.25], [0.25, 0.25]],
};

export class DefaultTextureProvider implements ITextureProvider {
  private textures: Record<DiceValue, THREE.CanvasTexture> =
    {} as Record<DiceValue, THREE.CanvasTexture>;
  private maxAnisotropy = 1;

  private readonly size: number;
  private readonly bgColor: string;
  private readonly pipColor: string;
  private readonly pipRadius: number;

  constructor(options?: {
    size?: number;
    bgColor?: string;
    pipColor?: string;
    pipRadius?: number;
  }) {
    this.size = options?.size ?? 256;
    this.bgColor = options?.bgColor ?? '#f5f5f0';
    this.pipColor = options?.pipColor ?? '#1a1a2e';
    this.pipRadius = options?.pipRadius ?? 0.08;
  }

  init(renderer: THREE.WebGLRenderer): void {
    this.maxAnisotropy = renderer.capabilities.getMaxAnisotropy();
    for (let v = 1; v <= 6; v++) {
      this.textures[v as DiceValue] = this.createTexture(v as DiceValue);
    }
  }

  getTexture(value: DiceValue): THREE.CanvasTexture {
    return this.textures[value];
  }

  private createTexture(value: DiceValue): THREE.CanvasTexture {
    const { size, bgColor, pipColor, pipRadius } = this;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;

    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, size, size);

    ctx.fillStyle = pipColor;
    for (const [px, py] of pipLayouts[value]) {
      ctx.beginPath();
      ctx.arc(size / 2 + px * size, size / 2 + py * size, size * pipRadius, 0, Math.PI * 2);
      ctx.fill();
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.anisotropy = this.maxAnisotropy;
    return texture;
  }
}
