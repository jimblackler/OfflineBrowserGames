import {ObjectLoader} from "../threejs/src/loaders/ObjectLoader.js";
import {OrbitControls} from "../threejs/controls/OrbitControls.js";
import {PCFSoftShadowMap} from "../threejs/src/constants.js";
import {Scene} from "../threejs/src/scenes/Scene.js";
import {Vector2} from "../threejs/src/math/Vector2.js";
import {Vector3} from "../threejs/src/math/Vector3.js";
import {WebGLRenderer} from "../threejs/src/renderers/WebGLRenderer.js";

const TEXTURE_WIDTH = 1339;
const TEXTURE_HEIGHT = 900;

const CARD_WIDTH = 103;
const CARD_HEIGHT = 143;

export class V2Renderer {

  constructor(container) {

    const scene = new Scene();

    const renderer = new WebGLRenderer({antialias: true});
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);

    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = PCFSoftShadowMap; // default THREE.PCFShadowMap

    container.appendChild(renderer.domElement);

    renderer.gammaInput = true;
    renderer.gammaOutput = true;

    const loader = new ObjectLoader();
    loader.load('data/app.json', object => {
      scene.add(object);
      const originalCard = scene.getObjectByName('Card');
      this.paintCard(originalCard.getObjectByName('Back').material.map, 4, 0);
      const card = originalCard.clone();

      const front = card.getObjectByName('Front');
      front.material = front.material.clone();
      front.material.map = front.material.map.clone();
      this.paintCard(front.material.map, 3, 12);

      card.position.x = 10;
      card.position.z = 10;
      scene.add(card);

      originalCard.visible = false;

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

  paintCard(map, suit, type) {
    map.repeat = new Vector2(CARD_WIDTH / TEXTURE_WIDTH, CARD_HEIGHT / TEXTURE_HEIGHT);
    map.offset = new Vector2((CARD_WIDTH * type) / TEXTURE_WIDTH,
        1 - (CARD_HEIGHT * suit + CARD_HEIGHT) / TEXTURE_HEIGHT);
    map.needsUpdate = true;
  }

  placeHolder(x, y) {

  }

  makeOverlay(x, y) {

  }

  faceDown(cardNumber) {
  }

  faceUp(cardNumber) {
  }

  setClick(element, clickFunction) {
  }

  setCardDraggable(cardNumber, cards, start) {
  }

  setCardNotDraggable(cardNumber) {
  }

  raiseCard(cardNumber) {
  }

  getCardPosition(cardNumber) {
    return [0, 0, 0];
  }

  positionCard(cardNumber, x, y, v) {
  }


}