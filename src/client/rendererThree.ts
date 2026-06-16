import * as THREE from 'three';
import {assertDefined} from '../common/check/defined';
import type {Renderer, DragHandler} from './renderer';
import {getSuit, getType, NUMBER_CARDS} from './rules';
import {BLANK_ROW, CARDBACK_COLUMN, CARD_HEIGHT, CARD_WIDTH, INDICATOR_HEIGHT, INDICATOR_WIDTH, INDICATOR_X, INDICATOR_Y, PLACEHOLDER_COLUMN, SHEET_WIDTH, SHEET_HEIGHT} from './spriteConstants';

type ClickablePlaceholder = {
  mesh: THREE.Mesh;
  material: THREE.MeshBasicMaterial;
  onClick?(ev: MouseEvent): void;
};

export function createThreeRenderer(gameDiv: HTMLElement): Renderer {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(45, 1, 10, 5000);
  const webGLRenderer = new THREE.WebGLRenderer({antialias: true, alpha: true});
  webGLRenderer.shadowMap.enabled = true;
  webGLRenderer.shadowMap.type = THREE.PCFSoftShadowMap;
  webGLRenderer.setPixelRatio(window.devicePixelRatio);

  const {domElement: canvas} = webGLRenderer;
  canvas.style.position = 'absolute';
  canvas.style.top = '0';
  canvas.style.left = '0';
  canvas.style.width = '100%';
  canvas.style.height = '100%';
  gameDiv.appendChild(canvas);

  camera.position.set(500, -550, 900);
  camera.lookAt(500, -380, 0);

  scene.add(new THREE.AmbientLight(0xFFFFFF, 3));

  const directionalLight = new THREE.DirectionalLight(0xFFFFFF, 2.5);
  directionalLight.position.set(450, -200, 800);
  directionalLight.castShadow = true;
  directionalLight.shadow.mapSize.width = 1024;
  directionalLight.shadow.mapSize.height = 1024;
  directionalLight.shadow.camera.near = 10;
  directionalLight.shadow.camera.far = 2000;
  directionalLight.shadow.camera.left = -500;
  directionalLight.shadow.camera.right = 1500;
  directionalLight.shadow.camera.top = 500;
  directionalLight.shadow.camera.bottom = -1500;
  directionalLight.shadow.bias = -0.001;
  scene.add(directionalLight);

  const floorMaterial = new THREE.MeshStandardMaterial({
    color: 0x2B7E42,
    roughness: 0.9,
    metalness: 0.1
  });
  const floorMesh = new THREE.Mesh(new THREE.PlaneGeometry(3000, 3000), floorMaterial);
  floorMesh.position.set(450, -400, -2);
  floorMesh.receiveShadow = true;
  scene.add(floorMesh);

  const cardGeometry = new THREE.BoxGeometry(CARD_WIDTH, CARD_HEIGHT, 1.5);
  const edgeMaterial = new THREE.MeshStandardMaterial({color: 0xDDDDDD, roughness: 0.5});
  const cardMaterials = Array.from({length: NUMBER_CARDS}, () => [
    edgeMaterial, // +X
    edgeMaterial, // -X
    edgeMaterial, // +Y
    edgeMaterial, // -Y
    new THREE.MeshStandardMaterial({color: 0xFFFFFF, roughness: 0.2}), // +Z (Front)
    new THREE.MeshStandardMaterial({color: 0xD32F2F, roughness: 0.3})  // -Z (Back)
  ]);
  const cardMeshes = cardMaterials.map(materials => {
    const mesh = new THREE.Mesh(cardGeometry, materials);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.rotation.y = Math.PI;
    mesh.position.set(-200, 200, 0);
    scene.add(mesh);
    return mesh;
  });
  const cardOrder = Array.from({length: NUMBER_CARDS}, (_, index) => index);

  const draggableCards = new Uint8Array(NUMBER_CARDS);
  const placeholders: ClickablePlaceholder[] = [];

  const indicatorGeometry = new THREE.PlaneGeometry(INDICATOR_WIDTH, INDICATOR_HEIGHT);
  const indicatorMaterial = new THREE.MeshBasicMaterial({
    color: 0xFFFFFF,
    transparent: true,
    depthWrite: false
  });
  const indicatorMesh = new THREE.Mesh(indicatorGeometry, indicatorMaterial);
  indicatorMesh.visible = false;
  scene.add(indicatorMesh);

  const textureLoader = new THREE.TextureLoader();
  let textureSheet: THREE.Texture | undefined;

  textureLoader.load('images/cards206x286.png', texture => {
    textureSheet = texture;
    texture.colorSpace = THREE.SRGBColorSpace;

    for (let index = 0; index < NUMBER_CARDS; index++) {
      const materials = assertDefined(cardMaterials[index]);

      const frontTexture = texture.clone();
      frontTexture.repeat.set(CARD_WIDTH / SHEET_WIDTH, CARD_HEIGHT / SHEET_HEIGHT);
      frontTexture.offset.set(
          CARD_WIDTH * getType(index) / SHEET_WIDTH,
          1 - CARD_HEIGHT * (getSuit(index) + 1) / SHEET_HEIGHT
      );
      frontTexture.needsUpdate = true;
      const frontMaterial = assertDefined(materials[4]);
      frontMaterial.map = frontTexture;
      frontMaterial.color.set(0xFFFFFF);
      frontMaterial.needsUpdate = true;

      const backTexture = texture.clone();
      backTexture.repeat.set(CARD_WIDTH / SHEET_WIDTH, CARD_HEIGHT / SHEET_HEIGHT);
      backTexture.offset.set(
          CARD_WIDTH * CARDBACK_COLUMN / SHEET_WIDTH,
          1 - CARD_HEIGHT * (BLANK_ROW + 1) / SHEET_HEIGHT
      );
      backTexture.needsUpdate = true;
      const backMaterial = assertDefined(materials[5]);
      backMaterial.map = backTexture;
      backMaterial.color.set(0xFFFFFF);
      backMaterial.needsUpdate = true;
    }

    const indicatorTexture = texture.clone();
    indicatorTexture.repeat.set(INDICATOR_WIDTH / SHEET_WIDTH, INDICATOR_HEIGHT / SHEET_HEIGHT);
    indicatorTexture.offset.set(
        INDICATOR_X / SHEET_WIDTH,
        1 - (INDICATOR_Y + INDICATOR_HEIGHT) / SHEET_HEIGHT
    );
    indicatorTexture.needsUpdate = true;
    indicatorMaterial.map = indicatorTexture;
    indicatorMaterial.needsUpdate = true;

    for (const placeholder of placeholders) {
      const placeholderTexture = texture.clone();
      placeholderTexture.repeat.set(CARD_WIDTH / SHEET_WIDTH, CARD_HEIGHT / SHEET_HEIGHT);
      placeholderTexture.offset.set(
          CARD_WIDTH * PLACEHOLDER_COLUMN / SHEET_WIDTH,
          1 - CARD_HEIGHT * (BLANK_ROW + 1) / SHEET_HEIGHT
      );
      placeholderTexture.needsUpdate = true;
      placeholder.material.map = placeholderTexture;
      placeholder.material.color.set(0xFFFFFF);
      placeholder.material.opacity = 1;
      placeholder.material.needsUpdate = true;
    }
  });

  let dragHandler: DragHandler;
  let draggingCards: number[] = [];
  let isDragging = false;
  let click = false;
  const raycaster = new THREE.Raycaster();
  const mouse = new THREE.Vector2();
  const dragPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
  const dragIntersection = new THREE.Vector3();
  const dragOffsets: THREE.Vector3[] = [];

  const cardX = new Float32Array(NUMBER_CARDS);
  const cardY = new Float32Array(NUMBER_CARDS);
  const cardElevation = new Float32Array(NUMBER_CARDS);

  function getCardPosition(cardNumber: number): [number, number, number] {
    const x = assertDefined(cardX[cardNumber]);
    const y = assertDefined(cardY[cardNumber]);
    const elevation = assertDefined(cardElevation[cardNumber]);
    return [x, y + elevation, elevation];
  }

  function positionCard(cardNumber: number, x: number, y: number, elevation: number) {
    cardX[cardNumber] = x;
    cardY[cardNumber] = y - elevation;
    cardElevation[cardNumber] = elevation;

    assertDefined(cardMeshes[cardNumber]).position.set(
        x + CARD_WIDTH / 2, -(y + CARD_HEIGHT / 2), elevation + cardOrder.indexOf(cardNumber) * 0.1);
  }

  function getRaycastIntersect(event: MouseEvent) {
    const rectangle = canvas.getBoundingClientRect();
    mouse.x = (event.clientX - rectangle.left) / rectangle.width * 2 - 1;
    mouse.y = -(event.clientY - rectangle.top) / rectangle.height * 2 + 1;

    raycaster.setFromCamera(mouse, camera);

    const candidates: THREE.Object3D[] = [];
    const meshToCardMap = new Map<THREE.Object3D, number>();

    for (let index = 0; index < NUMBER_CARDS; index++) {
      if (draggableCards[index]) {
        const mesh = assertDefined(cardMeshes[index]);
        candidates.push(mesh);
        meshToCardMap.set(mesh, index);
      }
    }

    for (const placeholder of placeholders) {
      if (placeholder.onClick) {
        candidates.push(placeholder.mesh);
      }
    }

    const intersects = raycaster.intersectObjects(candidates);
    if (intersects.length > 0) {
      const [firstIntersect] = intersects;
      if (firstIntersect) {
        const {object: hitObject} = firstIntersect;
        const cardIndex = meshToCardMap.get(hitObject);
        if (cardIndex !== undefined) {
          return {card: cardIndex};
        }
        const placeholder = placeholders.find(placeholder => placeholder.mesh === hitObject);
        if (placeholder) {
          return {placeholder};
        }
      }
    }
    return {};
  }

  function onMouseDown(event: MouseEvent) {
    if (event.button !== 0) {
      return;
    }
    const {card, placeholder} = getRaycastIntersect(event);
    if (typeof card === 'number') {
      const cards = dragHandler.startDrag(card);
      draggingCards = cards;
      isDragging = true;
      click = true;
      indicatorMesh.visible = false;

      const firstMesh = assertDefined(cardMeshes[card]);
      dragPlane.setFromNormalAndCoplanarPoint(new THREE.Vector3(0, 0, 1), firstMesh.position);
      raycaster.setFromCamera(mouse, camera);
      raycaster.ray.intersectPlane(dragPlane, dragIntersection);

      dragOffsets.length = 0;
      for (const cardNumber of draggingCards) {
        const mesh = assertDefined(cardMeshes[cardNumber]);
        dragOffsets.push(mesh.position.clone().sub(dragIntersection));
      }
    } else {
      placeholder?.onClick?.(event);
    }
  }

  function onMouseMove(event: MouseEvent) {
    const rectangle = canvas.getBoundingClientRect();
    mouse.x = (event.clientX - rectangle.left) / rectangle.width * 2 - 1;
    mouse.y = -(event.clientY - rectangle.top) / rectangle.height * 2 + 1;
    raycaster.setFromCamera(mouse, camera);

    if (isDragging) {
      click = false;
      raycaster.ray.intersectPlane(dragPlane, dragIntersection);

      for (let index = 0; index < draggingCards.length; index++) {
        const cardNumber = assertDefined(draggingCards[index]);
        const newPosition = dragIntersection.clone().add(assertDefined(dragOffsets[index]));
        assertDefined(cardMeshes[cardNumber]).position.copy(newPosition);

        const zIndex = cardOrder.indexOf(cardNumber);
        const elevation = newPosition.z - zIndex * 0.1;
        cardX[cardNumber] = newPosition.x - CARD_WIDTH / 2;
        cardY[cardNumber] = -newPosition.y - CARD_HEIGHT / 2 - elevation;
        cardElevation[cardNumber] = elevation;
      }
    } else {
      const {card, placeholder} = getRaycastIntersect(event);
      if (typeof card === 'number') {
        const mesh = assertDefined(cardMeshes[card]);
        indicatorMesh.position.set(mesh.position.x, mesh.position.y, mesh.position.z + 0.1);
        indicatorMesh.visible = true;
      } else if (placeholder) {
        const {mesh} = placeholder;
        indicatorMesh.position.set(mesh.position.x, mesh.position.y, mesh.position.z + 0.1);
        indicatorMesh.visible = true;
      } else {
        indicatorMesh.visible = false;
      }
    }
  }

  function onMouseUp() {
    if (isDragging) {
      if (draggingCards.length > 0) {
        dragHandler.cardClickedOrDropped(assertDefined(draggingCards[0]), click);
      }
      isDragging = false;
      draggingCards = [];
    }
  }

  gameDiv.addEventListener('mousedown', onMouseDown);
  window.addEventListener('mousemove', onMouseMove);
  window.addEventListener('mouseup', onMouseUp);

  function renderLoop() {
    requestAnimationFrame(renderLoop);
    webGLRenderer.render(scene, camera);
  }

  renderLoop();

  function resize() {
    const {innerWidth: width, innerHeight: height} = window;
    webGLRenderer.setSize(width, height);

    const verticalHeight = 800;
    camera.fov = 45;
    const distance = verticalHeight / 2 / Math.tan(camera.fov * Math.PI / 360);
    camera.position.set(500, -550, distance * 0.9);
    camera.lookAt(500, -380, 0);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  }

  window.addEventListener('resize', resize);
  resize();

  return {
    placeHolder(x: number, y: number, onClick?: (event: MouseEvent) => void) {
      const material = new THREE.MeshBasicMaterial({
        color: 0x228B22,
        transparent: true,
        opacity: 0.3,
        side: THREE.DoubleSide
      });

      if (textureSheet) {
        const texture = textureSheet.clone();
        texture.repeat.set(CARD_WIDTH / SHEET_WIDTH, CARD_HEIGHT / SHEET_HEIGHT);
        texture.offset.set(
            CARD_WIDTH * PLACEHOLDER_COLUMN / SHEET_WIDTH,
            1 - CARD_HEIGHT * (BLANK_ROW + 1) / SHEET_HEIGHT
        );
        texture.needsUpdate = true;
        material.map = texture;
        material.color.set(0xFFFFFF);
        material.opacity = 1;
      }

      const placeholderGeometry = new THREE.PlaneGeometry(CARD_WIDTH, CARD_HEIGHT);
      const mesh = new THREE.Mesh(placeholderGeometry, material);
      mesh.position.set(x + CARD_WIDTH / 2, -(y + CARD_HEIGHT / 2), 0.1);
      mesh.receiveShadow = true;
      scene.add(mesh);

      placeholders.push({mesh, onClick, material});
    },

    hideIndicator() {
      indicatorMesh.visible = false;
    },

    faceDown(cardNumber: number) {
      const mesh = assertDefined(cardMeshes[cardNumber]);
      mesh.rotation.y = Math.PI;
    },

    faceUp(cardNumber: number) {
      const mesh = assertDefined(cardMeshes[cardNumber]);
      mesh.rotation.y = 0;
    },

    setDraggable(cardNumber: number, draggable: boolean) {
      draggableCards[cardNumber] = draggable ? 1 : 0;
    },

    raiseCard(cardNumber: number) {
      const positionIndex = cardOrder.indexOf(cardNumber);
      if (positionIndex > -1) {
        cardOrder.splice(positionIndex, 1);
        cardOrder.push(cardNumber);
      }
    },

    getCardPosition,
    positionCard,

    setDragHandler(handler: DragHandler) {
      dragHandler = handler;
    }
  };
}
