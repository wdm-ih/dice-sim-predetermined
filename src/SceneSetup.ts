import * as THREE from 'three';

export interface SceneContext {
  scene: THREE.Scene;
  camera: THREE.OrthographicCamera;
  renderer: THREE.WebGLRenderer;
  boardWidth: number;
  boardHeight: number;
  dispose: () => void;
}

export function createScene(container: HTMLElement, frustumSize: number): SceneContext {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x16213e);

  const aspect = window.innerWidth / window.innerHeight;
  const camera = new THREE.OrthographicCamera(
    -frustumSize * aspect / 2, frustumSize * aspect / 2,
    frustumSize / 2, -frustumSize / 2, 0.1, 100,
  );
  camera.position.set(0, 20, 0);
  camera.lookAt(0, 0, 0);

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  container.appendChild(renderer.domElement);

  // Lighting
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

  const boardWidth = frustumSize * aspect - 4;
  const boardHeight = frustumSize - 4;

  const onResize = (): void => {
    const a = window.innerWidth / window.innerHeight;
    camera.left = -frustumSize * a / 2;
    camera.right = frustumSize * a / 2;
    camera.top = frustumSize / 2;
    camera.bottom = -frustumSize / 2;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  };

  window.addEventListener('resize', onResize);

  return {
    scene,
    camera,
    renderer,
    boardWidth,
    boardHeight,
    dispose: () => {
      window.removeEventListener('resize', onResize);
      renderer.dispose();
      container.removeChild(renderer.domElement);
    },
  };
}
