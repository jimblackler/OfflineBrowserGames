import {BackSide} from "../threejs/src/constants.js";
import {Color} from "../threejs/src/math/Color.js";
import {DirectionalLight} from "../threejs/src/lights/DirectionalLight.js";
import {Mesh} from "../threejs/src/objects/Mesh.js";
import {ObjectLoader} from "../threejs/src/loaders/ObjectLoader.js";
import {OrbitControls} from "../threejs/controls/OrbitControls.js";
import {PerspectiveCamera} from "../threejs/src/cameras/PerspectiveCamera.js";
import {Scene} from "../threejs/src/scenes/Scene.js";
import {ShaderMaterial} from "../threejs/src/materials/ShaderMaterial.js";
import {SphereBufferGeometry} from "../threejs/src/geometries/SphereGeometry.js";
import {WebGLRenderer} from "../threejs/src/renderers/WebGLRenderer.js";
const SCREEN_WIDTH = window.innerWidth;
const SCREEN_HEIGHT = window.innerHeight;

let container;
let camera, scene, renderer;

init();
animate();

function init() {

  container = document.createElement('div');
  document.body.appendChild(container);

  // CAMERA

  camera = new PerspectiveCamera(40, SCREEN_WIDTH / SCREEN_HEIGHT, 1, 10000);
  camera.position.set(700, 200, -500);

  // SCENE

  scene = new Scene();

  // CONTROLS

  const controls = new OrbitControls(camera);
  controls.maxPolarAngle = 0.9 * Math.PI / 2;
  controls.enableZoom = false;

  // LIGHTS

  const light = new DirectionalLight(0xaabbff, 0.3);
  light.position.x = 300;
  light.position.y = 250;
  light.position.z = -500;
  scene.add(light);

  // SKYDOME

  //language=GLSL
  const vertexShader = `
    varying vec3 vWorldPosition;
    
    void main() {
      vec4 worldPosition = modelMatrix * vec4(position, 1.0);
      vWorldPosition = worldPosition.xyz;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `;

  //language=GLSL
  const fragmentShader = `
    uniform vec3 topColor;
    uniform vec3 bottomColor;
    uniform float offset;
    uniform float exponent;
    
    varying vec3 vWorldPosition;
    
    void main() {
      float h = normalize(vWorldPosition + offset).y;
      gl_FragColor = vec4(mix(bottomColor, topColor, max(pow(max(h, 0.0), exponent), 0.0)), 1.0);
    }
  `;
  const uniforms = {
    topColor: {type: "c", value: new Color(0x0077ff)},
    bottomColor: {type: "c", value: new Color(0xffffff)},
    offset: {type: "f", value: 400},
    exponent: {type: "f", value: 0.6}
  };
  uniforms.topColor.value.copy(light.color);

  const skyGeo = new SphereBufferGeometry(4000, 32, 15);
  const skyMat = new ShaderMaterial({
    uniforms: uniforms,
    vertexShader: vertexShader,
    fragmentShader: fragmentShader,
    side: BackSide
  });

  const sky = new Mesh(skyGeo, skyMat);
  scene.add(sky);

  // RENDERER
  renderer = new WebGLRenderer({antialias: true});
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(SCREEN_WIDTH, SCREEN_HEIGHT);
  container.appendChild(renderer.domElement);

  renderer.gammaInput = true;
  renderer.gammaOutput = true;

  // MODEL
  const loader = new ObjectLoader();
  loader.load("data/lightmap.json", function (object) {
    scene.add(object);
  });

  window.addEventListener('resize', onWindowResize, false);
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
  requestAnimationFrame(animate);
  renderer.render(scene, camera);
}
