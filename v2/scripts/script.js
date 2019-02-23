import {ObjectLoader} from "../threejs/src/loaders/ObjectLoader.js";
import {OrbitControls} from "../threejs/controls/OrbitControls.js";
import {PCFSoftShadowMap} from "../threejs/src/constants.js";
import {Scene} from "../threejs/src/scenes/Scene.js";
import {WebGLRenderer} from "../threejs/src/renderers/WebGLRenderer.js";

const SCREEN_WIDTH = window.innerWidth;
const SCREEN_HEIGHT = window.innerHeight;

const container = document.createElement('div');
document.body.appendChild(container);

const scene = new Scene();

const renderer = new WebGLRenderer({antialias: true});
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(SCREEN_WIDTH, SCREEN_HEIGHT);

renderer.shadowMap.enabled = true;
renderer.shadowMap.type = PCFSoftShadowMap; // default THREE.PCFShadowMap

container.appendChild(renderer.domElement);

renderer.gammaInput = true;
renderer.gammaOutput = true;

const loader = new ObjectLoader();
loader.load('data/app.json', object => {
  scene.add(object);
  loader.load('data/camera.json', camera => {
    scene.add(camera);
    const controls = new OrbitControls(camera);
    controls.target = scene.getObjectByName('Card').position;
    controls.maxPolarAngle = 0.9 * Math.PI / 2;
    controls.update();

    function setAspect() {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    }

    function animate() {
      requestAnimationFrame(animate);
      renderer.render(scene, camera);
    }
    window.addEventListener('resize', setAspect, false);
    setAspect();
    animate();
  });
});



