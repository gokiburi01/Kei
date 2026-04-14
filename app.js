const video = document.getElementById("video");
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");
const loader = document.getElementById("loader");

let detector;
let running = false;
let frameSkip = 0;

// ===== カメラ起動 =====
async function startCamera() {
  const stream = await navigator.mediaDevices.getUserMedia({
    video: {
      facingMode: "user",
      width: 640,
      height: 480
    }
  });

  video.srcObject = stream;

  await new Promise(resolve => {
    video.onloadedmetadata = resolve;
  });

  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
}

// ===== モデル読み込み（1人専用）=====
async function loadModel() {
  const vision = await FilesetResolver.forVisionTasks(
    "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.0.3/wasm"
  );

  detector = await PoseLandmarker.createFromOptions(vision, {
    baseOptions: {
      modelAssetPath:
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.0.3/models/pose_landmarker_lite.task",
      delegate: "GPU"
    },
    runningMode: "video",
    numPoses: 1   // ← 1人に最適化
  });
}

// ===== 棒人間描画 =====
function drawPose(landmarks) {
  const CONNS = PoseLandmarker.POSE_LANDMARKS_FULL;

  ctx.strokeStyle = "cyan";
  ctx.lineWidth = 2;

  for (const [a, b] of CONNS) {
    const p1 = landmarks[a];
    const p2 = landmarks[b];

    if (!p1 || !p2) continue;

    ctx.beginPath();
    ctx.moveTo(p1.x * canvas.width, p1.y * canvas.height);
    ctx.lineTo(p2.x * canvas.width, p2.y * canvas.height);
    ctx.stroke();
  }
}

// ===== メインループ =====
async function loop() {
  if (!running) return;

  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

  frameSkip++;
  if (frameSkip % 2 === 0) { // ← 超軽量化ポイント
    const now = performance.now();
    const result = await detector.detectForVideo(video, now);

    ctx.beginPath();

    if (result?.landmarks[0]) {
      drawPose(result.landmarks[0]);
    }
  }

  requestAnimationFrame(loop);
}

// ===== 実行 =====
(async () => {
  await startCamera();

  // カメラが起動してからモデルを読む＝黒画面対策
  setTimeout(async () => {
    await loadModel();
    loader.style.opacity = 0;
    setTimeout(() => loader.style.display = "none", 500);

    running = true;
    loop();
  }, 300);
})();
