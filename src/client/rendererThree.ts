import {type Object3D, AmbientLight, BackSide, DirectionalLight, Mesh, MeshBasicMaterial, MeshStandardMaterial, PCFSoftShadowMap, PerspectiveCamera, Plane, PlaneGeometry, Raycaster, Scene, SRGBColorSpace, TextureLoader, Vector2, Vector3, WebGLRenderer, DataTexture, RGBAFormat, RepeatWrapping} from 'three';
import {assertDefined} from '../common/check/defined';
import type {Renderer, DragHandler} from './renderer';
import {getSuit, getType, NUMBER_CARDS} from './rules';
import {BLANK_ROW, CARDBACK_COLUMN, CARD_HEIGHT, CARD_WIDTH, INDICATOR_HEIGHT, INDICATOR_WIDTH, INDICATOR_X, INDICATOR_Y, PLACEHOLDER_COLUMN, SHEET_WIDTH, SHEET_HEIGHT} from './spriteConstants';

type ClickablePlaceholder = {
  mesh: Mesh;
  material: MeshBasicMaterial;
  onClick(ev: MouseEvent): void;
};

export const defaultPreferences = {
  cameraX: 460,
  cameraY: -510,
  cameraZ: 450,
  deltaX: 0,
  deltaY: 180,
  deltaZ: -890,
  lightX: 520,
  lightY: -100,
  lightZ: 800
};

export type ThreePreferences = typeof defaultPreferences;

export type ThreeRenderer = Renderer & {
  receivePreferences(preferences: ThreePreferences): void;
};

export async function createThreeRenderer(gameDiv: HTMLElement): Promise<ThreeRenderer> {
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

  scene.add(new AmbientLight(0xFFFFFF, Math.PI / 2));

  const directionalLight = new DirectionalLight(0xFFFFFF, Math.PI / 2);
  directionalLight.position.set(
      defaultPreferences.lightX, defaultPreferences.lightY, defaultPreferences.lightZ);
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

  const noiseSize = 512;
  const noiseData = new Uint8Array(noiseSize * noiseSize * 4);
  for (let i = 0; i < noiseSize * noiseSize * 4; i += 4) {
    const val = Math.random() * 255;
    noiseData[i] = val;
    noiseData[i + 1] = val;
    noiseData[i + 2] = val;
    noiseData[i + 3] = 255;
  }
  const noiseTexture = new DataTexture(noiseData, noiseSize, noiseSize, RGBAFormat);
  noiseTexture.needsUpdate = true;
  noiseTexture.wrapS = RepeatWrapping;
  noiseTexture.wrapT = RepeatWrapping;
  noiseTexture.repeat.set(5, 5);

  const floorMaterial = new MeshStandardMaterial({
    color: 0x40A040,
    roughness: 0.9,
    metalness: 0.1,
    bumpMap: noiseTexture,
    bumpScale: 0.75
  });
  const floorMesh = new Mesh(new PlaneGeometry(3000, 3000), floorMaterial);
  floorMesh.position.set(450, -400, -2);
  floorMesh.receiveShadow = true;
  scene.add(floorMesh);

  const cardGeometry = new PlaneGeometry(CARD_WIDTH, CARD_HEIGHT);
  cardGeometry.clearGroups();
  cardGeometry.addGroup(0, 6, 0);
  cardGeometry.addGroup(0, 6, 1);
  const backMaterial = new MeshStandardMaterial({
    color: 0xFFFFFF,
    roughness: 0.3,
    transparent: true,
    depthWrite: false,
    depthTest: false,
    side: BackSide
  });
  const texture = await new TextureLoader().loadAsync('images/cards206x286.png');
  texture.colorSpace = SRGBColorSpace;
  texture.anisotropy = webGLRenderer.capabilities.getMaxAnisotropy();
  texture.repeat.set(CARD_WIDTH / SHEET_WIDTH, CARD_HEIGHT / SHEET_HEIGHT);

  const cardMeshes = Array.from({length: NUMBER_CARDS}, (_, index) => {
    const frontTexture = texture.clone();
    frontTexture.offset.set(
        CARD_WIDTH * getType(index) / SHEET_WIDTH,
        1 - CARD_HEIGHT * (getSuit(index) + 1) / SHEET_HEIGHT
    );
    const material = new MeshStandardMaterial({
      color: 0xFFFFFF,
      roughness: 0.2,
      transparent: true,
      depthWrite: false,
      depthTest: false,
      map: frontTexture
    });
    const mesh = new Mesh(cardGeometry, [material, backMaterial]);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.rotation.y = Math.PI;
    scene.add(mesh);
    return mesh;
  });
  const draggableCards = new Uint8Array(NUMBER_CARDS);
  const clickablePlaceholders: ClickablePlaceholder[] = [];

  const indicatorGeometry = new PlaneGeometry(INDICATOR_WIDTH, INDICATOR_HEIGHT);
  const indicatorMaterial = new MeshBasicMaterial({
    color: 0xFFFFFF,
    transparent: true,
    depthWrite: false,
    depthTest: false
  });
  const indicatorMesh = new Mesh(indicatorGeometry, indicatorMaterial);
  indicatorMesh.visible = false;
  scene.add(indicatorMesh);

  const backTexture = texture.clone();
  backTexture.offset.set(
      CARD_WIDTH * CARDBACK_COLUMN / SHEET_WIDTH,
      1 - CARD_HEIGHT * (BLANK_ROW + 1) / SHEET_HEIGHT);

  backMaterial.map = backTexture;

  const placeholderTexture = texture.clone();
  placeholderTexture.offset.set(
      CARD_WIDTH * PLACEHOLDER_COLUMN / SHEET_WIDTH,
      1 - CARD_HEIGHT * (BLANK_ROW + 1) / SHEET_HEIGHT);

  const indicatorTexture = texture.clone();
  indicatorTexture.repeat.set(INDICATOR_WIDTH / SHEET_WIDTH, INDICATOR_HEIGHT / SHEET_HEIGHT);
  indicatorTexture.offset.set(
      INDICATOR_X / SHEET_WIDTH,
      1 - (INDICATOR_Y + INDICATOR_HEIGHT) / SHEET_HEIGHT
  );
  indicatorMaterial.map = indicatorTexture;

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

  let nextRenderOrder = 1;

  function positionCard(cardNumber: number, x: number, y: number, elevation: number) {
    assertDefined(cardMeshes[cardNumber]).renderOrder = nextRenderOrder++;
    assertDefined(cardMeshes[cardNumber]).position.set(
        x + CARD_WIDTH / 2,
        -(y + CARD_HEIGHT / 2),
        elevation
    );
  }

  function getRaycastIntersect(event: MouseEvent) {
    const raycaster = new Raycaster();
    raycaster.setFromCamera(getMouseCoords(event), camera);

    const meshToCardMap = new Map<Object3D, number>(
        cardMeshes
            .map((mesh, index) => [mesh, index] as const)
            .filter(([, index]) => draggableCards[index])
    );

    const intersects = raycaster.intersectObjects([
      ...meshToCardMap.keys(),
      ...clickablePlaceholders.map(p => p.mesh)
    ]);
    intersects.sort((a, b) => b.object.renderOrder - a.object.renderOrder);

    const [firstIntersect] = intersects;
    if (!firstIntersect) {
      return {};
    }
    const card = meshToCardMap.get(firstIntersect.object);
    if (card !== undefined) {
      return {card};
    }
    return {
      placeholder:
          clickablePlaceholders.find(placeholder => placeholder.mesh === firstIntersect.object)
    };
  }

  function onMouseDown(event: MouseEvent) {
    if (event.button !== 0) {
      return;
    }
    const {card, placeholder} = getRaycastIntersect(event);
    if (card === undefined) {
      placeholder?.onClick(event);
    } else {
      dragHandler.startDrag(card);
      isDragging = true;
      click = true;
      indicatorMesh.visible = false;

      const firstMesh = assertDefined(cardMeshes[card]);
      dragPlane.setFromNormalAndCoplanarPoint(new Vector3(0, 0, 1), firstMesh.position);
      const raycaster = new Raycaster();
      raycaster.setFromCamera(getMouseCoords(event), camera);
      raycaster.ray.intersectPlane(dragPlane, dragStartIntersection);
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
      const targetMesh = card === undefined ? placeholder?.mesh : assertDefined(cardMeshes[card]);
      if (targetMesh) {
        indicatorMesh.position.set(
            targetMesh.position.x, targetMesh.position.y, targetMesh.position.z);
        indicatorMesh.renderOrder = targetMesh.renderOrder + 1;
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
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  }

  window.addEventListener('resize', resize);
  resize();

  return {
    placeHolder(x, y, onClick) {
      const material = new MeshBasicMaterial({
        transparent: true,
        depthWrite: false,
        depthTest: false,
        map: placeholderTexture
      });

      const mesh = new Mesh(new PlaneGeometry(CARD_WIDTH, CARD_HEIGHT), material);
      mesh.position.set(x + CARD_WIDTH / 2, -(y + CARD_HEIGHT / 2), 0);
      mesh.receiveShadow = true;
      scene.add(mesh);

      if (onClick) {
        clickablePlaceholders.push({mesh, onClick, material});
      }
    },

    setFaceUp(cardNumber, faceUp) {
      assertDefined(cardMeshes[cardNumber]).rotation.y = faceUp ? 0 : Math.PI;
    },

    setDraggable(cardNumber, draggable) {
      draggableCards[cardNumber] = draggable ? 1 : 0;
    },

    positionCard,

    setDragHandler(handler) {
      dragHandler = handler;
    },

    receivePreferences(preferences: ThreePreferences) {
      camera.position.set(preferences.cameraX, preferences.cameraY,
          preferences.cameraZ / Math.tan(camera.fov * Math.PI / 360) * 0.8);
      camera.lookAt(
          preferences.cameraX + preferences.deltaX,
          preferences.cameraY + preferences.deltaY,
          preferences.cameraZ + preferences.deltaZ
      );
      camera.updateProjectionMatrix();
      directionalLight.position.set(preferences.lightX, preferences.lightY, preferences.lightZ);
    }
  };
}
