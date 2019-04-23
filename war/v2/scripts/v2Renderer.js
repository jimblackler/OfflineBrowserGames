import {PerspectiveCamera} from '../threejs/src/cameras/PerspectiveCamera.js';
import {ObjectLoader} from "../threejs/src/loaders/ObjectLoader.js";
import {OrbitControls} from "../threejs/controls/OrbitControls.js";
import {PCFSoftShadowMap} from "../threejs/src/constants.js";
import {Rules} from "../../commonScripts/rules.js";
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
    this.cardObjects = [];
    this.cardVPos = []; // needed??

    const renderer = new WebGLRenderer({antialias: true});
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);

    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = PCFSoftShadowMap; // default THREE.PCFShadowMap

    container.appendChild(renderer.domElement);

    renderer.gammaInput = true;
    renderer.gammaOutput = true;
    this.renderer = renderer;
  }

  init() {
    const scene = new Scene();
    this.scene = scene;
    const loader = new ObjectLoader();
    return new Promise((resolve, reject) => {
      loader.load('data/app.json', object => {
        scene.add(object);
        const originalCard = scene.getObjectByName('Card');

        originalCard.visible = false;
        const back = originalCard.getObjectByName('Back');
        this.paintCard(back.material.map, 4, 0);

        for (let cardNumber = 0; cardNumber !== Rules.NUMBER_CARDS; cardNumber++) {
          const card = originalCard.clone();

          this.cardObjects[cardNumber] = card;
          this.cardVPos[cardNumber] = 0;

          const front = card.getObjectByName('Front');
          front.material = front.material.clone();
          front.material.map = front.material.map.clone();
          const suit = Rules.getSuit(cardNumber);
          const type = Rules.getType(cardNumber);
          this.paintCard(front.material.map, suit, type);

          card.visible = true;
          scene.add(card);
        }

        loader.load('data/camera.json', object => {
          const camera = object || {};
          scene.add(camera);
          const controls = new OrbitControls(camera);
          controls.update();

          const setAspect = () => {
            camera.aspect = window.innerWidth / window.innerHeight;
            camera.updateProjectionMatrix();
            this.renderer.setSize(window.innerWidth, window.innerHeight);
          };

          const animate = () => {
            requestAnimationFrame(animate);
            this.renderer.render(scene, camera);
          };

          window.addEventListener('resize', setAspect, false);
          setAspect();
          animate();
          resolve();
        });
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
    const card = this.cardObjects[cardNumber];
    card.rotation.z = Math.PI;
  }

  faceUp(cardNumber) {
    const card = this.cardObjects[cardNumber];
    card.rotation.z = 0;
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
    const card = this.cardObjects[cardNumber];
    return [card.position.x * 10, card.position.z * 10, 0];
  }

  positionCard(cardNumber, x, y, v) {
    const card = this.cardObjects[cardNumber];
    card.position.x = x / 10;
    card.position.z = y / 10;
  }
}