import {Group} from '../threejs/src/objects/Group.js';
import {PerspectiveCamera} from '../threejs/src/cameras/PerspectiveCamera.js';
import {ObjectLoader} from "../threejs/src/loaders/ObjectLoader.js";
import {OrbitControls} from "../threejs/controls/OrbitControls.js";
import {PCFSoftShadowMap} from "../threejs/src/constants.js";
import {Raycaster} from '../threejs/src/core/Raycaster.js';
import {Rules} from "../../commonScripts/rules.js";
import {Scene} from "../threejs/src/scenes/Scene.js";
import {Vector2} from "../threejs/src/math/Vector2.js";
import {Vector3} from "../threejs/src/math/Vector3.js";
import {WebGLRenderer} from "../threejs/src/renderers/WebGLRenderer.js";

const TEXTURE_WIDTH = 1339;
const TEXTURE_HEIGHT = 900;

const CARD_WIDTH = 103;
const CARD_HEIGHT = 143;

const HEIGHT_MULTIPLIER = 4;

const INDICATOR_WIDTH = 109;
const INDICATOR_HEIGHT = 149;
const INDICATOR_X = 1;
const INDICATOR_Y = 716;
const INDICATOR_OFFSET_X = -4;
const INDICATOR_OFFSET_Y = -3;

export class V2Renderer {

  constructor(container) {
    this.cardObjects = [];
    this.clicks = [];
    this.raycaster = new Raycaster();

    const renderer = new WebGLRenderer({antialias: true});
    this.renderer = renderer;

    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);

    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = PCFSoftShadowMap; // default THREE.PCFShadowMap

    container.appendChild(renderer.domElement);

    renderer.gammaInput = true;
    renderer.gammaOutput = true;
  }

  init() {
    const scene = new Scene();
    this.scene = scene;
    this.cardGroup = new Group();
    this.cardGroup.position.set(CARD_WIDTH / 2 / 10, 0, CARD_HEIGHT / 2 / 10);
    this.cardGroup.scale.set(1 / 10, 1 / HEIGHT_MULTIPLIER, 1 / 10);

    scene.add(this.cardGroup);
    const loader = new ObjectLoader();
    return new Promise((resolve, reject) => {
      loader.load('data/app.json', object => {
        scene.add(object);

        const indicator = scene.getObjectByName('Indicator');
        indicator.material.map = indicator.material.map.clone();
        const map = indicator.material.map;
        map.repeat = new Vector2(INDICATOR_WIDTH / TEXTURE_WIDTH, INDICATOR_HEIGHT / TEXTURE_HEIGHT);
        map.offset = new Vector2(INDICATOR_X / TEXTURE_WIDTH, 1 - (INDICATOR_Y + INDICATOR_HEIGHT) / TEXTURE_HEIGHT);
        map.needsUpdate = true;
        indicator.visible = false;

        const originalCard = scene.getObjectByName('Card');
        originalCard.visible = false;
        const back = originalCard.getObjectByName('Back');
        this.paintCard(back.material.map, 4, 0);

        for (let cardNumber = 0; cardNumber !== Rules.NUMBER_CARDS; cardNumber++) {
          const card = originalCard.clone();
          card.scale.set(10, HEIGHT_MULTIPLIER, 10);
          this.cardObjects[cardNumber] = card;

          const front = card.getObjectByName('Front');
          front.material = front.material.clone();
          front.material.map = front.material.map.clone();
          const suit = Rules.getSuit(cardNumber);
          const type = Rules.getType(cardNumber);
          this.paintCard(front.material.map, suit, type);

          card.visible = true;
          this.cardGroup.add(card);
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

          const onDocumentMouseMove = event => {
            event.preventDefault();
            const mouse = new Vector2((event.clientX / window.innerWidth) * 2 - 1,
                -(event.clientY / window.innerHeight) * 2 + 1);
            this.raycaster.setFromCamera(mouse, camera);
            const intersects = this.raycaster.intersectObjects(this.cardObjects, true);
            const cardObject = this.findFirstCardObject(intersects);
            if (cardObject) {
              const cardNumber = this.cardObjects.indexOf(cardObject);
              const position = this.getCardPosition(cardNumber);
              indicator.position.x = (position[0] + INDICATOR_WIDTH / 2 + INDICATOR_OFFSET_X) / 10;
              indicator.position.y = 0;
              indicator.position.z = (position[1] + INDICATOR_HEIGHT / 2 + INDICATOR_OFFSET_Y) / 10;
              indicator.visible = true;
            }
          };

          const onDocumentMouseDown = event => {
            event.preventDefault();
            const mouse = new Vector2((event.clientX / window.innerWidth) * 2 - 1,
                -(event.clientY / window.innerHeight) * 2 + 1);
            this.raycaster.setFromCamera(mouse, camera);
            const intersects = this.raycaster.intersectObjects(this.cardObjects, true);
            const cardObject = this.findFirstCardObject(intersects);
            if (cardObject) {
              const cardNumber = this.cardObjects.indexOf(cardObject);
              const click = this.clicks[cardNumber];
              const release = click();
              release();
            }
          };

          const onDocumentMouseUp = event => {

          };

          this.renderer.domElement.addEventListener('mousemove', onDocumentMouseMove, false);
          this.renderer.domElement.addEventListener('mousedown', onDocumentMouseDown, false);
          this.renderer.domElement.addEventListener('mouseup', onDocumentMouseUp, false);

          resolve();
        });
      });
    });


  }

  findFirstCardObject(objects) {
    let intersected = null;
    for (const collided of objects) {
      let idx;
      let object = collided.object;
      while (true) {
        idx = this.cardGroup.children.indexOf(object);
        if (idx !== -1) {
          break;
        }
        object = object.parent;
      }
      if (!intersected || idx > this.cardGroup.children.indexOf(intersected)) {
        intersected = object;
      }
    }
    return intersected;
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
    this.clicks[cardNumber] = start;
  }

  setCardNotDraggable(cardNumber) {
    this.clicks[cardNumber] = null;
  }

  raiseCard(cardNumber) {
    const card = this.cardObjects[cardNumber];
    this.cardGroup.remove(card);
    this.cardGroup.add(card);
  }

  getCardPosition(cardNumber) {
    const card = this.cardObjects[cardNumber];
    return [card.position.x, card.position.z, card.position.y];
  }

  positionCard(cardNumber, x, y, v) {
    const card = this.cardObjects[cardNumber];
    card.position.x = x;
    card.position.y = v;
    card.position.z = y;
  }
}