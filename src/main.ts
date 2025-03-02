import {
  AxesHelper,
  BoxGeometry,
  DirectionalLight,
  GridHelper,
  HemisphereLight,
  Mesh,
  MeshPhysicalMaterial,
  NeutralToneMapping,
  PerspectiveCamera,
  PlaneGeometry,
  Scene,
  WebGPURenderer,
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-expect-error
} from 'three/webgpu';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';

export const renderScene = async (container: HTMLDivElement) => {
  const renderer = new WebGPURenderer({
    antialias: true,
    alpha: true,
  });
  renderer.setPixelRatio(window.devicePixelRatio);
  container.appendChild(renderer.domElement);
  renderer.toneMapping = NeutralToneMapping;
  renderer.shadowMap.enabled = true;
  const width = window.innerWidth;
  const height = window.innerHeight;
  renderer.setSize(width, height);

  const camera = new PerspectiveCamera(75, width / height, 0.1, 50);
  camera.position.set(0, 3, 5);
  const orbitControls = new OrbitControls(camera, renderer.domElement);

  const scene = new Scene();
  const cubeGeometry = new BoxGeometry();
  const cubeMaterials = [
    new MeshPhysicalMaterial({ color: 0xff0000 }), // Red
    new MeshPhysicalMaterial({ color: 0x00ff00 }), // Green
    new MeshPhysicalMaterial({ color: 0x0000ff }), // Blue
    new MeshPhysicalMaterial({ color: 0xffff00 }), // Yellow
    new MeshPhysicalMaterial({ color: 0xff8000 }), // Orange
    new MeshPhysicalMaterial({ color: 0xff00ff }), // Magenta
  ];
  const cube = new Mesh(cubeGeometry, cubeMaterials);
  cube.position.y = 1.5;
  cube.castShadow = true;
  cube.receiveShadow = true;
  scene.add(cube);

  const groundGeometry = new PlaneGeometry(10, 10);
  groundGeometry.rotateX(-Math.PI / 2);
  // ShadowMaterial is only supported in webgl (three.js 174)
  const groundMaterial = new MeshPhysicalMaterial({ color: 0xffffff });
  const groundMesh = new Mesh(groundGeometry, groundMaterial);
  groundMesh.receiveShadow = true;
  scene.add(groundMesh);

  const environmentLight = new HemisphereLight(0xffffff, 0x080808, 0.5);
  scene.add(environmentLight);
  const lightSource = new DirectionalLight(0xffffff, 1);
  lightSource.position.set(100, 150, 100);
  lightSource.castShadow = true;
  lightSource.shadow.mapSize.width = 1024;
  lightSource.shadow.mapSize.height = 1024;
  lightSource.shadow.camera.near = 50;
  lightSource.shadow.camera.far = 300;
  lightSource.shadow.camera.lookAt(0, 0, 0);
  scene.add(lightSource);

  const gridHelper = new GridHelper(10, 10);
  scene.add(gridHelper);
  const axesHelper = new AxesHelper(2);
  scene.add(axesHelper);

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
    const deltaTimeInMs = timestamp - (previousTimeStamp ?? timestamp);
    previousTimeStamp = timestamp;
    cube.rotation.x += (deltaTimeInMs / 1000) * Math.PI;
    cube.rotation.y += (deltaTimeInMs / 1000) * (Math.PI / 2);
    orbitControls.update();
    renderer.renderAsync(scene, camera);
  };
  renderer.setAnimationLoop(animate);
};

const container = document.getElementById('container') as HTMLDivElement;
renderScene(container);
