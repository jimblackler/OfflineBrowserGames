import {type Object3D, type Texture, AmbientLight, BoxGeometry, DirectionalLight, DoubleSide, LinearFilter, LinearMipmapLinearFilter, Mesh, MeshBasicMaterial, MeshStandardMaterial, PCFSoftShadowMap, PerspectiveCamera, Plane, PlaneGeometry, Raycaster, Scene, SRGBColorSpace, TextureLoader, Vector2, Vector3, WebGLRenderer} from 'three';
import {assertDefined} from '../common/check/defined';
import type {Renderer, DragHandler} from './renderer';
import {getSuit, getType, NUMBER_CARDS} from './rules';
import {BLANK_ROW, CARDBACK_COLUMN, CARD_HEIGHT, CARD_WIDTH, INDICATOR_HEIGHT, INDICATOR_WIDTH, INDICATOR_X, INDICATOR_Y, PLACEHOLDER_COLUMN, SHEET_WIDTH, SHEET_HEIGHT} from './spriteConstants';

type ClickablePlaceholder = {
  mesh: Mesh;
  material: MeshBasicMaterial;
  onClick?(ev: MouseEvent): void;
};

export async function createThreeRenderer(gameDiv: HTMLElement): Promise<Renderer> {
  const scene = new Scene();
  const camera = new PerspectiveCamera(45, 1, 100, 5000);
  const webGLRenderer = new WebGLRenderer({antialias: true, alpha: true});
  webGLRenderer.shadowMap.enabled = true;
  webGLRenderer.shadowMap.type = PCFSoftShadowMap;
  webGLRenderer.setPixelRatio(window.devicePixelRatio);

  const {domElement: canvas} = webGLRenderer;
  canvas.style.position = 'absolute';
  canvas.style.top = '0';
  canvas.style.left = '0';
  canvas.style.width = '100%';
  canvas.style.height = '100%';
  gameDiv.appendChild(canvas);

  scene.add(new AmbientLight(0xFFFFFF, 3));

  const directionalLight = new DirectionalLight(0xFFFFFF, 2.5);
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

  const floorMaterial = new MeshStandardMaterial({
    color: 0x2B7E42,
    roughness: 0.9,
    metalness: 0.1
  });
  const floorMesh = new Mesh(new PlaneGeometry(3000, 3000), floorMaterial);
  floorMesh.position.set(450, -400, -2);
  floorMesh.receiveShadow = true;
  scene.add(floorMesh);

  const cardGeometry = new BoxGeometry(CARD_WIDTH, CARD_HEIGHT, 1.5);
  const edgeMaterial = new MeshStandardMaterial({
    color: 0x000000,
    roughness: 0.5,
    transparent: true,
    opacity: 0,
    depthWrite: false
  });
  const backMaterial = new MeshStandardMaterial({
    color: 0xD32F2F,
    roughness: 0.3,
    transparent: true,
    depthWrite: false
  });
  const cardMaterials = Array.from({length: NUMBER_CARDS}, () => [
    edgeMaterial, // +X
    edgeMaterial, // -X
    edgeMaterial, // +Y
    edgeMaterial, // -Y
    new MeshStandardMaterial({
      color: 0xFFFFFF,
      roughness: 0.2,
      transparent: true,
      depthWrite: false
    }), // +Z (Front)
    backMaterial  // -Z (Back)
  ]);
  const cardMeshes = cardMaterials.map(materials => {
    const mesh = new Mesh(cardGeometry, materials);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.rotation.y = Math.PI;
    mesh.position.set(-200, 200, 0);
    scene.add(mesh);
    return mesh;
  });
  const draggableCards = new Uint8Array(NUMBER_CARDS);
  const placeholders: ClickablePlaceholder[] = [];

  const indicatorGeometry = new PlaneGeometry(INDICATOR_WIDTH, INDICATOR_HEIGHT);
  const indicatorMaterial = new MeshBasicMaterial({
    color: 0xFFFFFF,
    transparent: true,
    depthWrite: false
  });
  const indicatorMesh = new Mesh(indicatorGeometry, indicatorMaterial);
  indicatorMesh.visible = false;
  scene.add(indicatorMesh);

  const textureLoader = new TextureLoader();

  const texture = await new Promise<Texture>(resolve => {
    textureLoader.load('images/cards206x286.png', resolve);
  });
  texture.colorSpace = SRGBColorSpace;
  texture.generateMipmaps = true;
  texture.minFilter = LinearMipmapLinearFilter;
  texture.magFilter = LinearFilter;
  texture.anisotropy = webGLRenderer.capabilities.getMaxAnisotropy();

  const backTexture = texture.clone();
  backTexture.repeat.set(CARD_WIDTH / SHEET_WIDTH, CARD_HEIGHT / SHEET_HEIGHT);
  backTexture.offset.set(
      CARD_WIDTH * CARDBACK_COLUMN / SHEET_WIDTH,
      1 - CARD_HEIGHT * (BLANK_ROW + 1) / SHEET_HEIGHT);
  backTexture.needsUpdate = true;

  backMaterial.map = backTexture;
  backMaterial.color.set(0xFFFFFF);
  backMaterial.transparent = true;
  backMaterial.depthWrite = false;
  backMaterial.needsUpdate = true;

  const placeholderTexture = texture.clone();
  placeholderTexture.repeat.set(CARD_WIDTH / SHEET_WIDTH, CARD_HEIGHT / SHEET_HEIGHT);
  placeholderTexture.offset.set(
      CARD_WIDTH * PLACEHOLDER_COLUMN / SHEET_WIDTH,
      1 - CARD_HEIGHT * (BLANK_ROW + 1) / SHEET_HEIGHT);
  placeholderTexture.needsUpdate = true;

  cardMaterials.forEach((materials, index) => {
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
    frontMaterial.transparent = true;
    frontMaterial.depthWrite = false;
    frontMaterial.needsUpdate = true;
  });

  const indicatorTexture = texture.clone();
  indicatorTexture.repeat.set(INDICATOR_WIDTH / SHEET_WIDTH, INDICATOR_HEIGHT / SHEET_HEIGHT);
  indicatorTexture.offset.set(
      INDICATOR_X / SHEET_WIDTH,
      1 - (INDICATOR_Y + INDICATOR_HEIGHT) / SHEET_HEIGHT
  );
  indicatorTexture.needsUpdate = true;
  indicatorMaterial.map = indicatorTexture;
  indicatorMaterial.needsUpdate = true;

  let dragHandler: DragHandler;
  let isDragging = false;
  let click = false;
  const dragPlane = new Plane(new Vector3(0, 0, 1), 0);
  const dragIntersection = new Vector3();
  const dragStartIntersection = new Vector3();

  function getMouseCoords(event: MouseEvent) {
    const rectangle = canvas.getBoundingClientRect();
    return new Vector2(
        (event.clientX - rectangle.left) / rectangle.width * 2 - 1,
        -(event.clientY - rectangle.top) / rectangle.height * 2 + 1
    );
  }

  function positionCard(cardNumber: number, x: number, y: number, elevation: number) {
    assertDefined(cardMeshes[cardNumber]).position.set(
        x + CARD_WIDTH / 2,
        -(y + CARD_HEIGHT / 2),
        elevation
    );
  }

  function getRaycastIntersect(event: MouseEvent) {
    const raycaster = new Raycaster();
    raycaster.setFromCamera(getMouseCoords(event), camera);

    const candidates: Object3D[] = [];
    const meshToCardMap = new Map<Object3D, number>();

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

    const [firstIntersect] = raycaster.intersectObjects(candidates);
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
    return {};
  }

  function onMouseDown(event: MouseEvent) {
    if (event.button !== 0) {
      return;
    }
    const {card, placeholder} = getRaycastIntersect(event);
    if (typeof card === 'number') {
      dragHandler.startDrag(card);
      isDragging = true;
      click = true;
      indicatorMesh.visible = false;

      const firstMesh = assertDefined(cardMeshes[card]);
      dragPlane.setFromNormalAndCoplanarPoint(new Vector3(0, 0, 1), firstMesh.position);
      const raycaster = new Raycaster();
      raycaster.setFromCamera(getMouseCoords(event), camera);
      raycaster.ray.intersectPlane(dragPlane, dragStartIntersection);
    } else {
      placeholder?.onClick?.(event);
    }
  }

  function onMouseMove(event: MouseEvent) {
    if (isDragging) {
      click = false;
      const raycaster = new Raycaster();
      raycaster.setFromCamera(getMouseCoords(event), camera);
      raycaster.ray.intersectPlane(dragPlane, dragIntersection);

      const dx = dragIntersection.x - dragStartIntersection.x;
      const dy = -(dragIntersection.y - dragStartIntersection.y);
      dragHandler.drag(dx, dy);
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
      dragHandler.endDrag(click);
      isDragging = false;
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

    camera.position.set(450, -500, 450 / Math.tan(camera.fov * Math.PI / 360) * 0.8);
    camera.lookAt(460, -380, 0);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  }

  window.addEventListener('resize', resize);
  resize();

  return {
    placeHolder(x, y, onClick) {
      const material = new MeshBasicMaterial({
        color: 0x228B22,
        transparent: true,
        opacity: 0.3,
        side: DoubleSide
      });

      material.map = placeholderTexture;
      material.color.set(0xFFFFFF);
      material.opacity = 1;

      const placeholderGeometry = new PlaneGeometry(CARD_WIDTH, CARD_HEIGHT);
      const mesh = new Mesh(placeholderGeometry, material);
      mesh.position.set(x + CARD_WIDTH / 2, -(y + CARD_HEIGHT / 2), 0.1);
      mesh.receiveShadow = true;
      scene.add(mesh);

      placeholders.push({mesh, onClick, material});
    },

    setFaceUp(cardNumber, faceUp) {
      const mesh = assertDefined(cardMeshes[cardNumber]);
      mesh.rotation.y = faceUp ? 0 : Math.PI;
    },

    setDraggable(cardNumber, draggable) {
      draggableCards[cardNumber] = draggable ? 1 : 0;
    },

    positionCard,

    setDragHandler(handler) {
      dragHandler = handler;
    }
  };
}
