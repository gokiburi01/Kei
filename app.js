const video = document.getElementById("video");
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

const loading = document.getElementById("loading");
const warning = document.getElementById("warning");
const counterText = document.getElementById("counter");

let detector;

// ===== 骨格ライン =====
const LINES = [
  [5, 6],
  [5, 7], [7, 9],
  [6, 8], [8, 10],
  [5, 11], [6, 12],
  [11, 12],
  [11, 13], [13, 15],
  [12, 14], [14, 16]
];

// ===== カメラ起動 =====
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

// ===== モデル読み込み =====
async function loadModel() {
  detector = await poseDetection.createDetector(
    poseDetection.SupportedModels.MoveNet,
    { modelType: "SinglePose.Lightning" }
  );
}

// ===== 骨格表示 =====
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

// ===== 全身チェック =====
function isFullBodyVisible(keypoints) {
  const important = [5, 6, 11, 12, 13, 14, 15, 16];
  return important.every(i => keypoints[i].score > 0.3);
}

// ===== 屈伸カウント用変数 =====
let squatCount = 0;
let state = "up";  // "up"（立ち） or "down"（しゃがみ）

function detectSquat(kp) {
  const hip = (kp[11].y + kp[12].y) / 2;
  const knee = (kp[13].y + kp[14].y) / 2;

  // しゃがんでいるか判定
  const isDown = hip > knee - 10;

  if (state === "up" && isDown) {
    state = "down";
  }

  if (state === "down" && !isDown) {
    state = "up";
    squatCount++;
    counterText.innerText = `回数：${squatCount}`;
  }
}

// ===== メインループ =====
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
  }

  requestAnimationFrame(loop);
}

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
