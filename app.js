const video = document.getElementById("video");
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");
const loader = document.getElementById("loader");
const loaderText = document.getElementById("loader-text");

let poseDetector;
let running = false;

// ===== モデル読み込み =====
async function initModel() {
  loaderText.innerText = "モデルを読み込んでいます…";

  const vision = await FilesetResolver.forVisionTasks(
    "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.0.3/wasm"
  );

  poseDetector = await PoseLandmarker.createFromOptions(vision, {
    baseOptions: {
      modelAssetPath:
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.0.3/models/pose_landmarker_full.task",
      delegate: "GPU",
    },
    runningMode: "video",
    numPoses: 3,
  });
}

// ===== カメラ =====
async function startCamera() {
  loaderText.innerText = "カメラを起動しています…";

  const stream = await navigator.mediaDevices.getUserMedia({
    video: { facingMode: "user" },
    audio: false,
  });

  video.srcObject = stream;

  await new Promise((resolve) => {
    video.onloadedmetadata = () => resolve();
  });

  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
}

// ===== メインループ =====
async function loop() {
  if (!running) return;

  const now = performance.now();
  const result = await poseDetector.detectForVideo(video, now);

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  if (result?.landmarks) {
    for (const pose of result.landmarks) {
      drawPose(pose);
    }
  }

  requestAnimationFrame(loop);
}

// ===== 棒人間描画 =====
function drawPose(landmarks) {
  ctx.strokeStyle = "cyan";
  ctx.lineWidth = 2;

  const CONNECTIONS = PoseLandmarker.POSE_LANDMARKS_FULL;

  for (const [start, end] of CONNECTIONS) {
    const p1 = landmarks[start];
    const p2 = landmarks[end];
    if (!p1 || !p2) continue;

    ctx.beginPath();
    ctx.moveTo(p1.x * canvas.width, p1.y * canvas.height);
    ctx.lineTo(p2.x * canvas.width, p2.y * canvas.height);
    ctx.stroke();
  }
}

// ===== 実行 =====
(async () => {
  await initModel();
  await startCamera();

  // ロード完了メッセージ
  loaderText.innerText = "ロード完了！";

  setTimeout(() => {
    loader.style.opacity = 0;
    setTimeout(() => loader.style.display = "none", 600);
  }, 500);

  running = true;
  requestAnimationFrame(loop);
})();
