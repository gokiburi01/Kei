const video = document.getElementById("video");
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");
const loading = document.getElementById("loading");

let detector;

// ==============================
// カメラ（極限軽量）
// ==============================
async function setupCamera() {
  const stream = await navigator.mediaDevices.getUserMedia({
    video: { width: 320, height: 240, facingMode: "user" }
  });

  video.srcObject = stream;

  return new Promise(res => {
    video.onloadedmetadata = () => {
      video.play();
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      res();
    };
  });
}

// ==============================
// Pose Detector
// ==============================
async function loadModel() {
  detector = await poseDetection.createDetector(
    poseDetection.SupportedModels.MoveNet,
    { modelType: "SinglePose.Lightning" }
  );
}

// ==============================
// 骨格ラインだけ描画（最軽量）
// ==============================
const LINES = [
  [5, 6],  // 肩
  [5, 7], [7, 9],  // 左腕
  [6, 8], [8, 10], // 右腕
  [5, 11], [6, 12], // 体幹
  [11, 12],
  [11, 13], [13, 15], // 左脚
  [12, 14], [14, 16]  // 右脚
];

function drawSkeleton(kp) {
  ctx.strokeStyle = "lime";
  ctx.lineWidth = 3;

  LINES.forEach(([a, b]) => {
    if (kp[a].score > 0.3 && kp[b].score > 0.3) {
      ctx.beginPath();
      ctx.moveTo(kp[a].x, kp[a].y);
      ctx.lineTo(kp[b].x, kp[b].y);
      ctx.stroke();
    }
  });
}

// ==============================
// 最軽量ループ（60fpsでは回さない）
// ==============================
async function loop() {
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

  const poses = await detector.estimatePoses(video);

  if (poses[0]) {
    drawSkeleton(poses[0].keypoints);
  }

  // **軽量化のため1フレーム遅延を入れる**
  requestAnimationFrame(loop);
}

// ==============================
// 初期化
// ==============================
async function init() {
  await tf.setBackend("webgl");
  await tf.ready();

  await setupCamera();
  await loadModel();

  loading.style.display = "none";

  loop();
}

init();
