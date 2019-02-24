import {BaseRenderer} from "../../commonScripts/baseRenderer.js";
import {ObjectLoader} from "../threejs/src/loaders/ObjectLoader.js";
import {OrbitControls} from "../threejs/controls/OrbitControls.js";
import {PCFSoftShadowMap} from "../threejs/src/constants.js";
import {Scene} from "../threejs/src/scenes/Scene.js";
import {Vector2} from "../threejs/src/math/Vector2.js";
import {WebGLRenderer} from "../threejs/src/renderers/WebGLRenderer.js";

export class V2Renderer extends BaseRenderer {
  constructor() {
    super();

    const container = document.createElement('div');
    document.body.appendChild(container);

    const scene = new Scene();

    const renderer = new WebGLRenderer({antialias: true});
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);

    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = PCFSoftShadowMap; // default THREE.PCFShadowMap

    container.appendChild(renderer.domElement);

    renderer.gammaInput = true;
    renderer.gammaOutput = true;

    const TEXTURE_WIDTH = 1339;
    const TEXTURE_HEIGHT = 900;

    const loader = new ObjectLoader();
    loader.load('data/app.json', object => {
      scene.add(object);
      const card = scene.getObjectByName('Card');
      const front = card.getObjectByName('Front');

      const suit = 3;
      const type = 12;

      const map = front.material.map;
      map.repeat = new Vector2(this.CARD_WIDTH / TEXTURE_WIDTH, this.CARD_HEIGHT / TEXTURE_HEIGHT);
      map.offset = new Vector2((this.CARD_WIDTH * type) / TEXTURE_WIDTH,
          1 - (this.CARD_HEIGHT * suit + this.CARD_HEIGHT) / TEXTURE_HEIGHT);

      loader.load('data/camera.json', camera => {
        scene.add(camera);
        const controls = new OrbitControls(camera);
        controls.target = card.position.clone();

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
  }
}