import type { Texture } from 'three';
import {
  AmbientLight,
  AxesHelper,
  Box3,
  BoxGeometry,
  Color,
  DirectionalLight,
  EquirectangularReflectionMapping,
  GridHelper,
  Group,
  Mesh,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  PerspectiveCamera,
  PlaneGeometry,
  Scene,
} from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { TransformControls } from 'three/examples/jsm/controls/TransformControls.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { EXRLoader } from 'three/examples/jsm/loaders/EXRLoader';
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader';
import Stats from 'three/examples/jsm/libs/stats.module';
import WebGPURenderer from 'three/examples/jsm/renderers/webgpu/WebGPURenderer.js';
import { GUI } from 'dat.gui';

export const helloCube = (canvas: HTMLCanvasElement) => {
  const renderer = new WebGPURenderer({
    canvas,
    antialias: true,
    alpha: true,
  });
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(window.devicePixelRatio);

  const camera = new PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    100
  );
  camera.position.y = 4;
  camera.position.z = 8;
  const controls = new OrbitControls(camera, renderer.domElement);

  const exrLoader = new EXRLoader();
  const rgbeLoader = new RGBELoader();
  const scene = new Scene();
  scene.background = new Color(0xc0c0c0);
  scene.background = new Color(0xffffff);

  const gridHelper = new GridHelper(10, 10);
  scene.add(gridHelper);
  const axesHelper = new AxesHelper(2);
  scene.add(axesHelper);

  const ambientLight = new AmbientLight(0xffffff, 0.5);
  scene.add(ambientLight);

  const directionalLight = new DirectionalLight(0xffffff, 0.5);
  directionalLight.position.set(1, 3, 1);
  directionalLight.castShadow = true;
  scene.add(directionalLight);
  const lightTransformControl = new TransformControls(
    camera,
    renderer.domElement
  );
  lightTransformControl.addEventListener('dragging-changed', (event: any) => {
    controls.enabled = !event.value;
  });
  lightTransformControl.attach(directionalLight);
  lightTransformControl.visible = false;
  scene.add(lightTransformControl);

  const groundGeometry = new PlaneGeometry(10, 10);
  groundGeometry.rotateX(-Math.PI / 2);
  const groundMaterial = new MeshPhysicalMaterial({ color: 0xc0c0c0 });
  const groundMesh = new Mesh(groundGeometry, groundMaterial);
  groundMesh.receiveShadow = true;
  scene.add(groundMesh);

  const meshGroup = new Group();
  scene.add(meshGroup);
  const geometry = new BoxGeometry(1, 1, 1);
  const material = new MeshPhysicalMaterial({ color: 0xe02020 });
  const mesh = new Mesh(geometry, material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.position.y = 0.5;
  meshGroup.add(mesh);
  const meshTransformControl = new TransformControls(
    camera,
    renderer.domElement
  );
  meshTransformControl.addEventListener('dragging-changed', (event: any) => {
    controls.enabled = !event.value;
  });
  meshTransformControl.attach(meshGroup);
  meshTransformControl.visible = false;
  scene.add(meshTransformControl);

  const stats = new Stats();
  document.body.appendChild(stats.dom);
  const gui = new GUI();
  const uiProperties = {
    'mesh transform control': meshTransformControl.visible,
    'light transform control': lightTransformControl.visible,
  };
  gui
    .add(uiProperties, 'mesh transform control')
    .onChange((value: any) => (meshTransformControl.visible = value));
  gui
    .add(uiProperties, 'light transform control')
    .onChange((value: any) => (lightTransformControl.visible = value));

  window.addEventListener(
    'resize',
    () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    },
    false
  );

  let previousTimeStamp: number | undefined;
  const animate = (timestamp: number) => {
    const deltaTimeMs = timestamp - (previousTimeStamp ?? timestamp);
    previousTimeStamp = timestamp;
    requestAnimationFrame(animate);
    meshGroup.rotation.y += (((45 * Math.PI) / 180) * deltaTimeMs) / 1000;
    controls.update();
    render();
    stats.update();
  };

  const loadGLTF = async (resource: string) => {
    const gltfLoader = new GLTFLoader();
    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath('./draco/');
    dracoLoader.setDecoderConfig({ type: 'js' });
    const gltf = await gltfLoader.loadAsync(resource);
    gltf.scene.traverse((child) => {
      if (child instanceof Mesh) {
        if (child.isMesh) {
          const childMaterial = child.material;
          if (childMaterial instanceof MeshStandardMaterial) {
            if (childMaterial.transparent === false) {
              child.castShadow = true;
              child.receiveShadow = true;
            }
          }
        }
        if (child.material instanceof MeshStandardMaterial) {
          child.material.envMapIntensity = 1;
          child.material.needsUpdate = true;
        }
      }
    });
    const meshBox = new Box3().setFromObject(gltf.scene);
    gltf.scene.position.y = -meshBox.min.y;
    meshGroup.clear();
    meshGroup.add(gltf.scene);
  };

  const loadResource = (resourceName: string, resource: string) => {
    const lowerName = resourceName.toLowerCase();
    if (lowerName.endsWith('.exr')) {
      exrLoader.load(
        resource,
        (equirectTexture: Texture, _textureData: any) => {
          equirectTexture.mapping = EquirectangularReflectionMapping;
          scene.background = equirectTexture;
          //scene.backgroundBlurriness = 1; // @TODO: Needs PMREM
          scene.environment = equirectTexture;
          ambientLight.intensity = 0;
        }
      );
    } else if (lowerName.endsWith('.hdr')) {
      rgbeLoader.load(
        resource,
        (equirectTexture: Texture, _textureData: any) => {
          equirectTexture.mapping = EquirectangularReflectionMapping;
          scene.background = equirectTexture;
          //scene.backgroundBlurriness = 1; // @TODO: Needs PMREM
          scene.environment = equirectTexture;
          ambientLight.intensity = 0;
        }
      );
    } else if (lowerName.endsWith('.glb') || lowerName.endsWith('.gltf')) {
      void loadGLTF(resource);
    }
  };

  setupDragDrop(
    'holder',
    'hover',
    (file: File, event: ProgressEvent<FileReader>) => {
      loadResource(file.name, (event.target?.result as string) ?? '');
    }
  );

  const render = () => {
    void renderer.render(scene, camera);
  };
  requestAnimationFrame(animate);
};

const setupDragDrop = (
  elementId: string,
  className: string,
  load: (file: File, event: ProgressEvent<FileReader>) => void
) => {
  const holder = document.getElementById(elementId);
  if (!holder) {
    return;
  }
  holder.ondragover = function () {
    (this as HTMLElement).className = className;
    return false;
  };
  holder.ondragend = function () {
    (this as HTMLElement).className = '';
    return false;
  };
  holder.ondrop = function (e) {
    (this as HTMLElement).className = '';
    e.preventDefault();
    const file = e.dataTransfer?.files[0] as File;
    const reader = new FileReader();
    reader.onload = (event) => load(file, event);
    reader.readAsDataURL(file);
  };
};

const threeCanvas = document.getElementById('three_canvas');
if (threeCanvas === null) {
  throw new Error('three_canvas not found');
}
helloCube(threeCanvas as HTMLCanvasElement);
