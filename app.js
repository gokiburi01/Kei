const video = document.getElementById("video");
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

const loading = document.getElementById("loading");
const warning = document.getElementById("warning");
const counterText = document.getElementById("counter");
const jumpCounterText = document.getElementById("jumpCounter");
const resetBtn = document.getElementById("resetBtn");

let detector;

// ===== 状態 =====
let squatCount = 0;
let jumpCount = 0;

let squatState = "up";
let isJumping = false;

let prevHipY = null;

// ===== カメラ =====
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

// ===== モデル =====
async function loadModel() {
  detector = await poseDetection.createDetector(
    poseDetection.SupportedModels.MoveNet,
    { modelType: "SinglePose.Lightning" }
  );
}

// ===== 骨格 =====
const LINES = [
  [5,6],
  [5,7],[7,9],
  [6,8],[8,10],
  [5,11],[6,12],
  [11,12],
  [11,13],[13,15],
  [12,14],[14,16]
];

function drawSkeleton(kp) {
  ctx.strokeStyle = "lime";
  ctx.lineWidth = 3;

  LINES.forEach(([a,b]) => {
    if (kp[a].score > 0.3 && kp[b].score > 0.3) {
      ctx.beginPath();
      ctx.moveTo(kp[a].x, kp[a].y);
      ctx.lineTo(kp[b].x, kp[b].y);
      ctx.stroke();
    }
  });
}

// ===== 全身チェック =====
function isFullBodyVisible(kp) {
  const needed = [5,6,11,12,13,14,15,16];
  return needed.every(i => kp[i].score > 0.3);
}

// ===== スクワット検出 =====
function detectSquat(kp) {
  const hip = (kp[11].y + kp[12].y) / 2;
  const knee = (kp[13].y + kp[14].y) / 2;

  const isDown = hip > knee - 10;

  if (squatState === "up" && isDown) {
    squatState = "down";
  }

  if (squatState === "down" && !isDown) {
    squatState = "up";
    squatCount++;
    counterText.innerText = "スクワット：" + squatCount;
  }
}

// ===== ジャンプ検出 =====
function detectJump(kp) {
  const hip = (kp[11].y + kp[12].y) / 2;

  if (prevHipY === null) {
    prevHipY = hip;
    return;
  }

  const diff = prevHipY - hip;

  if (diff > 20 && !isJumping) {
    isJumping = true;
  }

  if (isJumping && diff < 5) {
    jumpCount++;
    jumpCounterText.innerText = "ジャンプ：" + jumpCount;
    isJumping = false;
  }

  prevHipY = hip;
}

// ===== ループ =====
async function loop() {
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

  const poses = await detector.estimatePoses(video);

  if (poses[0]) {
    const kp = poses[0].keypoints;

    // 全身チェック
    if (!isFullBodyVisible(kp)) {
      warning.innerText = "全身が映っていません";
    } else {
      warning.innerText = "";
    }

    drawSkeleton(kp);
    detectSquat(kp);
    detectJump(kp);
  }

  requestAnimationFrame(loop);
}

// ===== リセット =====
resetBtn.addEventListener("click", () => {
  squatCount = 0;
  jumpCount = 0;
  squatState = "up";
  isJumping = false;
  prevHipY = null;

  counterText.innerText = "スクワット：0";
  jumpCounterText.innerText = "ジャンプ：0";
});

// ===== 初期化 =====
async function init() {
  await tf.setBackend("webgl");
  await tf.ready();

  await setupCamera();
  await loadModel();

  loading.style.display = "none";

  loop();
}

init();
