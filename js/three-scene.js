// ============================
// THREE.JS: 3D-ДОШКА ТА ФІШКИ
// ============================

let scene3D = null;
let camera3D = null;
let renderer3D = null;
let pieces3D = new Map();
let boardSquares3D = [];
let moveMarkers3D = [];
let selectedMarker3D = null;
let cameraAngle = Math.PI / 1;
let cameraDistance = 15;
let targetCameraDistance = 15;
let cameraPitch = 1;
let cameraFocusAnimation = null;
let cameraZoomAnimation = null;
let cameraFocusTarget = null;
let dragStart = null;
let dragMoved = false;

const MIN_CAMERA_DISTANCE = 9.5;
const MAX_CAMERA_DISTANCE = 16;
const CAMERA_ZOOM_STEP = 1.2;

function init3DScene() {
  if (scene3D) return;
  if (!window.THREE) {
    board3d.innerHTML =
      '<div class="three-error">Failed to load Three.js. Check your internet connection and restart the game.</div>';
    return;
  }

  const THREE = window.THREE;
  scene3D = new THREE.Scene();
  scene3D.background = new THREE.Color("#171b24");
  scene3D.fog = new THREE.Fog("#171b24", 15, 28);

  camera3D = new THREE.PerspectiveCamera(38, 1, 0.1, 100);

  cameraAngle = 0.24;
  cameraPitch = 0.84;

  update3DCamera();

  renderer3D = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  renderer3D.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer3D.shadowMap.enabled = true;
  renderer3D.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer3D.outputColorSpace = THREE.SRGBColorSpace;
  renderer3D.toneMapping = THREE.ACESFilmicToneMapping;
  renderer3D.toneMappingExposure = 1.15;
  board3d.appendChild(renderer3D.domElement);

  scene3D.add(new THREE.HemisphereLight(0xe5efff, 0x44301f, 2.0));
  const keyLight = new THREE.DirectionalLight(0xffe4bd, 3.4);
  keyLight.position.set(-4, 10, 5);
  keyLight.castShadow = true;
  keyLight.shadow.mapSize.set(2048, 2048);
  keyLight.shadow.camera.left = -7;
  keyLight.shadow.camera.right = 7;
  keyLight.shadow.camera.top = 7;
  keyLight.shadow.camera.bottom = -7;
  scene3D.add(keyLight);
  const rimLight = new THREE.PointLight(0x7aa9ff, 30, 18);
  rimLight.position.set(5, 5, -4);
  scene3D.add(rimLight);

  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(200, 200),
    new THREE.MeshStandardMaterial({ color: "#171b24", roughness: 0.92 }),
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -0.38;
  floor.receiveShadow = true;
  scene3D.add(floor);

  const woodBase = new THREE.Mesh(
    new THREE.BoxGeometry(8.35, 0.38, 8.35),
    new THREE.MeshStandardMaterial({
      color: "#40271d",
      roughness: 0.3,
      metalness: 0.08,
    }),
  );
  woodBase.position.y = -0.12;
  woodBase.castShadow = true;
  woodBase.receiveShadow = true;
  scene3D.add(woodBase);

  const trim = new THREE.Mesh(
    new THREE.BoxGeometry(8.12, 0.08, 8.12),
    new THREE.MeshStandardMaterial({
      color: "#b27b43",
      roughness: 0.28,
      metalness: 0.35,
    }),
  );
  trim.position.y = 0.095;
  scene3D.add(trim);

  boardSquares3D = [];
  const lightMat = new THREE.MeshStandardMaterial({
    color: "#e7d2aa",
    roughness: 0.72,
  });
  const darkMat = new THREE.MeshStandardMaterial({
    color: "#70452f",
    roughness: 0.48,
  });
  for (let row = 0; row < SIZE; row++) {
    for (let col = 0; col < SIZE; col++) {
      const square = new THREE.Mesh(
        new THREE.BoxGeometry(0.99, 0.09, 0.99),
        (row + col) % 2 === 0 ? lightMat : darkMat,
      );
      square.position.set(col - 3.5, 0.17, row - 3.5);
      square.userData.row = row;
      square.userData.col = col;
      square.receiveShadow = true;
      square.castShadow = true;
      scene3D.add(square);
      boardSquares3D.push(square);
    }
  }

  // Decorative brass corners make the board visibly thick and finished.
  const cornerMat = new THREE.MeshStandardMaterial({
    color: "#d7a45b",
    metalness: 0.72,
    roughness: 0.25,
  });
  for (const [x, z] of [
    [-3.92, -3.92],
    [3.92, -3.92],
    [-3.92, 3.92],
    [3.92, 3.92],
  ]) {
    const corner = new THREE.Mesh(
      new THREE.BoxGeometry(0.16, 0.12, 0.16),
      cornerMat,
    );
    corner.position.set(x, 0.11, z);
    corner.castShadow = true;
    scene3D.add(corner);
  }

  resize3D();
  window.addEventListener("resize", resize3D);

  // Mouse middle-button drag rotates the camera.
  board.addEventListener("pointerdown", (event) => {
    if (event.pointerType === "touch" || event.button !== 1) return;

    event.preventDefault();

    if (cameraFocusAnimation) {
      cancelAnimationFrame(cameraFocusAnimation);
      cameraFocusAnimation = null;
    }

    cameraFocusTarget = null;
    dragStart = {
      x: event.clientX,
      y: event.clientY,
      angle: cameraAngle,
      pitch: cameraPitch,
      pointerId: event.pointerId,
    };
    dragMoved = false;

    try {
      board.setPointerCapture(event.pointerId);
    } catch (_) {}
  });

  board.addEventListener("pointermove", (event) => {
    if (
      !dragStart ||
      dragStart.pointerId !== event.pointerId ||
      !(event.buttons & 4)
    )
      return;

    if (
      Math.hypot(event.clientX - dragStart.x, event.clientY - dragStart.y) > 4
    ) {
      dragMoved = true;
    }

    cameraAngle = dragStart.angle + (event.clientX - dragStart.x) * 0.008;
    cameraPitch = Math.max(
      0.35,
      Math.min(1.25, dragStart.pitch + (event.clientY - dragStart.y) * 0.004),
    );
    update3DCamera();
  });

  window.addEventListener("pointerup", (event) => {
    if (dragStart && event.pointerId === dragStart.pointerId) {
      dragStart = null;
    }
  });

  board.addEventListener("auxclick", (event) => {
    if (event.button === 1) event.preventDefault();
  });

  // Mobile: use board touches only for selecting and moving pieces.
  // Camera rotation is handled by the left/right buttons.
  board.addEventListener(
    "touchstart",
    (event) => {
      if (cameraFocusAnimation) {
        cancelAnimationFrame(cameraFocusAnimation);
        cameraFocusAnimation = null;
      }

      cameraFocusTarget = null;

      if (event.touches.length > 1) {
        event.preventDefault();
      }

      dragMoved = false;
    },
    { passive: false },
  );

  board.addEventListener(
    "touchmove",
    (event) => {
      // Do not rotate the camera when a finger moves on the board.
      if (event.touches.length > 1) {
        event.preventDefault();
      }
    },
    { passive: false },
  );

  board.addEventListener("touchend", () => {
    // Allow the next tap to select a piece or destination.
    dragMoved = false;
  });

  board.addEventListener("touchcancel", () => {
    dragMoved = false;
  });

  const cameraStep = 0.22;

  document.getElementById("cameraLeftBtn").addEventListener("click", () => {
    cameraAngle -= cameraStep;
    update3DCamera();
  });

  document.getElementById("cameraRightBtn").addEventListener("click", () => {
    cameraAngle += cameraStep;
    update3DCamera();
  });

  const zoomInBtn = document.getElementById("zoomInBtn");
  const zoomOutBtn = document.getElementById("zoomOutBtn");

  function changeCameraZoom(amount) {
    if (!window.matchMedia("(max-width: 760px)").matches) return;

    targetCameraDistance = Math.max(
      MIN_CAMERA_DISTANCE,
      Math.min(MAX_CAMERA_DISTANCE, targetCameraDistance + amount),
    );

    startCameraZoomAnimation();
  }

  zoomInBtn?.addEventListener("click", () => {
    changeCameraZoom(-CAMERA_ZOOM_STEP);
  });

  zoomOutBtn?.addEventListener("click", () => {
    changeCameraZoom(CAMERA_ZOOM_STEP);
  });

  // Select board squares. A camera gesture must not trigger a move.
  renderer3D.domElement.addEventListener("click", (event) => {
    console.log("BOARD CLICK", {
      gameStarted,
      gameMode,
      onlineColor,
      currentPlayer,
      dragMoved,
    });

    if (dragMoved || !gameStarted) {
      dragMoved = false;
      return;
    }

    const rect = renderer3D.domElement.getBoundingClientRect();

    const pointer = new THREE.Vector2(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      -((event.clientY - rect.top) / rect.height) * 2 + 1,
    );

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(pointer, camera3D);

    const hit = raycaster.intersectObjects(boardSquares3D, false)[0];
    console.log(
      "RAYCAST",
      hit
        ? {
            row: hit.object.userData.row,
            col: hit.object.userData.col,
          }
        : "NO HIT",
    );

    if (hit && hit.object.userData.row !== undefined) {
      handleCellClick(hit.object.userData.row, hit.object.userData.col);
    }

    dragMoved = false;
  });

  // Mouse wheel zoom on desktop.
  board.addEventListener(
    "wheel",
    (event) => {
      event.preventDefault();

      targetCameraDistance = Math.max(
        MIN_CAMERA_DISTANCE,
        Math.min(
          MAX_CAMERA_DISTANCE,
          targetCameraDistance + event.deltaY * 0.008,
        ),
      );

      startCameraZoomAnimation();
    },
    { passive: false },
  );

  render3D();
}

function focusCameraOnTurn(player, immediate = false) {
  if (!camera3D) return;

  // White sits at row 7 (positive Z); black sits at row 0 (negative Z).
  // Keep the camera slightly off-axis and above the board so the pieces remain visibly 3D.
  cameraFocusTarget = {
    angle: player === "white" ? 0 : Math.PI,
    pitch: 0.84,
  };

  if (cameraFocusAnimation) {
    cancelAnimationFrame(cameraFocusAnimation);
    cameraFocusAnimation = null;
  }

  if (immediate) {
    cameraAngle = cameraFocusTarget.angle;
    cameraPitch = cameraFocusTarget.pitch;
    update3DCamera();
    return;
  }

  const animateFocus = () => {
    if (!camera3D || !cameraFocusTarget) return;
    // Rotate along the shortest direction to avoid a full extra spin at the 0/2π boundary.
    const targetAngle = cameraFocusTarget.angle;
    const delta = Math.atan2(
      Math.sin(targetAngle - cameraAngle),
      Math.cos(targetAngle - cameraAngle),
    );
    cameraAngle += delta * 0.14;
    cameraPitch += (cameraFocusTarget.pitch - cameraPitch) * 0.14;

    if (
      Math.abs(delta) < 0.002 &&
      Math.abs(cameraFocusTarget.pitch - cameraPitch) < 0.002
    ) {
      cameraAngle = targetAngle;
      cameraPitch = cameraFocusTarget.pitch;
      cameraFocusAnimation = null;
      update3DCamera();
      return;
    }

    update3DCamera();
    cameraFocusAnimation = requestAnimationFrame(animateFocus);
  };
  cameraFocusAnimation = requestAnimationFrame(animateFocus);
}

function update3DCamera() {
  if (!camera3D) return;

  camera3D.position.set(
    Math.sin(cameraAngle) * cameraDistance * Math.cos(cameraPitch),
    cameraDistance * Math.sin(cameraPitch),
    Math.cos(cameraAngle) * cameraDistance * Math.cos(cameraPitch),
  );

  camera3D.lookAt(0, 0.1, 0);

  if (renderer3D && scene3D) {
    renderer3D.render(scene3D, camera3D);
  }
}

function animateCameraZoom() {
  if (!camera3D || !renderer3D || !scene3D) {
    cameraZoomAnimation = null;
    return;
  }

  const difference = targetCameraDistance - cameraDistance;

  if (Math.abs(difference) < 0.01) {
    cameraDistance = targetCameraDistance;
    cameraZoomAnimation = null;
    update3DCamera();
    return;
  }

  cameraDistance += difference * 0.18;

  update3DCamera();

  cameraZoomAnimation = requestAnimationFrame(animateCameraZoom);
}

function startCameraZoomAnimation() {
  if (cameraZoomAnimation !== null) return;

  cameraZoomAnimation = requestAnimationFrame(animateCameraZoom);
}

function resize3D() {
  if (!renderer3D || !camera3D) return;
  const width = board3d.clientWidth || 720;
  const height = board3d.clientHeight || 720;
  renderer3D.setSize(width, height, false);
  camera3D.aspect = width / height;
  camera3D.updateProjectionMatrix();
  render3D();
}

function makePiece3D(piece) {
  const THREE = window.THREE;
  const group = new THREE.Group();
  const isWhite = piece.color === "white";
  const bodyMat = new THREE.MeshStandardMaterial({
    color: isWhite ? "#e9edf3" : "#151c29",
    metalness: isWhite ? 0.28 : 0.42,
    roughness: isWhite ? 0.24 : 0.2,
  });
  const edgeMat = new THREE.MeshStandardMaterial({
    color: isWhite ? "#aeb9c8" : "#05080e",
    metalness: 0.58,
    roughness: 0.22,
  });
  const rim = new THREE.Mesh(
    new THREE.TorusGeometry(0.315, 0.035, 12, 48),
    edgeMat,
  );
  rim.rotation.x = Math.PI / 2;
  rim.position.y = 0.12;
  group.add(rim);
  const body = new THREE.Mesh(
    new THREE.CylinderGeometry(0.35, 0.38, 0.19, 48, 1),
    bodyMat,
  );
  body.position.y = 0.12;
  body.castShadow = true;
  body.receiveShadow = true;
  group.add(body);
  const top = new THREE.Mesh(
    new THREE.CylinderGeometry(0.31, 0.35, 0.055, 48),
    bodyMat,
  );
  top.position.y = 0.235;
  top.castShadow = true;
  group.add(top);
  const topRing = new THREE.Mesh(
    new THREE.TorusGeometry(0.265, 0.012, 8, 48),
    edgeMat,
  );
  topRing.rotation.x = Math.PI / 2;
  topRing.position.y = 0.266;
  group.add(topRing);

  if (piece.king) {
    const gold = new THREE.MeshStandardMaterial({
      color: "#f4c45e",
      metalness: 0.78,
      roughness: 0.2,
      emissive: "#5b3505",
      emissiveIntensity: 0.15,
    });
    const crownBase = new THREE.Mesh(
      new THREE.CylinderGeometry(0.19, 0.23, 0.055, 32),
      gold,
    );
    crownBase.position.y = 0.31;
    group.add(crownBase);
    const crownRing = new THREE.Mesh(
      new THREE.TorusGeometry(0.19, 0.025, 8, 32),
      gold,
    );
    crownRing.rotation.x = Math.PI / 2;
    crownRing.position.y = 0.35;
    group.add(crownRing);
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      const point = new THREE.Mesh(
        new THREE.SphereGeometry(0.045, 12, 12),
        gold,
      );
      point.position.set(Math.cos(a) * 0.17, 0.385, Math.sin(a) * 0.17);
      point.castShadow = true;
      group.add(point);
    }
  }
  group.userData.piece = piece;
  scene3D.add(group);
  return group;
}

function dispose3DObject(object) {
  object.traverse((child) => {
    if (child.geometry) child.geometry.dispose();
    if (child.material) {
      const materials = Array.isArray(child.material)
        ? child.material
        : [child.material];
      materials.forEach((material) => material.dispose());
    }
  });
}

function clearDynamic3D() {
  if (!scene3D) return;
  for (const group of pieces3D.values()) {
    scene3D.remove(group);
    dispose3DObject(group);
  }
  pieces3D.clear();
  for (const marker of moveMarkers3D) {
    scene3D.remove(marker);
    dispose3DObject(marker);
  }
  moveMarkers3D = [];
  if (selectedMarker3D) {
    scene3D.remove(selectedMarker3D);
    dispose3DObject(selectedMarker3D);
  }
  selectedMarker3D = null;
}

function render3D() {
  if (!scene3D || !renderer3D) return;
  clearDynamic3D();
    const THREE = window.THREE;
    const mandatoryCapture = hasAnyCapture(currentPlayer);
  pieces.forEach((piece) => {
    const group = makePiece3D(piece);
    group.position.set(piece.col - 3.5, 0.22, piece.row - 3.5);
    pieces3D.set(piece, group);
    // Highlight pieces that can make a mandatory capture.
    if (
      piece.color === currentPlayer &&
      mandatoryCapture &&
      getCaptures(piece).length > 0
    ) {
      const captureHalo = new THREE.Mesh(
        new THREE.TorusGeometry(0.43, 0.035, 10, 48),
        new THREE.MeshBasicMaterial({ color: "#f5c542" }),
      );

      captureHalo.rotation.x = Math.PI / 2;
      captureHalo.position.set(piece.col - 3.5, 0.25, piece.row - 3.5);

      scene3D.add(captureHalo);
      moveMarkers3D.push(captureHalo);
    }
    if (piece === selectedPiece) {
      const halo = new THREE.Mesh(
        new THREE.TorusGeometry(0.43, 0.035, 10, 48),
        new THREE.MeshBasicMaterial({ color: "#55f28b" }),
      );
      halo.rotation.x = Math.PI / 2;
      halo.position.set(piece.col - 3.5, 0.25, piece.row - 3.5);
      scene3D.add(halo);
      selectedMarker3D = halo;
    }
  });
  boardGrid.querySelectorAll(".cell.possible").forEach((cell) => {
    const row = Number(cell.dataset.row);
    const col = Number(cell.dataset.col);
    const marker = new THREE.Mesh(
      new THREE.CylinderGeometry(0.25, 0.25, 0.025, 32),
      new THREE.MeshStandardMaterial({
        color: "#40e879",
        emissive: "#087a32",
        emissiveIntensity: 0.7,
        transparent: true,
        opacity: 0.88,
      }),
    );
    marker.position.set(col - 3.5, 0.24, row - 3.5);
    scene3D.add(marker);
    moveMarkers3D.push(marker);
  });
  renderer3D.render(scene3D, camera3D);
}
