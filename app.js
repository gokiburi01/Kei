// ======================
// 要素取得
// ======================
const video = document.getElementById("video");
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

const loadingScreen = document.getElementById("loadingScreen");
const progressText = document.getElementById("progress");

// ======================
// ロード進捗を表示する
// ======================
function updateProgress(p) {
  progressText.textContent = p + "%";
}

// ======================
// カメラ起動
// ======================
async function setupCamera() {
  updateProgress(10);

  const stream = await navigator.mediaDevices.getUserMedia({
    video: { facingMode: "user", width: 640, height: 480 },
    audio: false
  });

  video.srcObject = stream;
  return new Promise((resolve) => {
    video.onloadedmetadata = () => resolve(video);
  });
}

// ======================
// モデル読み込み
// ======================
let detector;

async function loadModel() {
  updateProgress(40);

  detector = await poseDetection.createDetector(
    poseDetection.SupportedModels.MoveNet,
    {
      modelType: "Lightning",  // 最軽量で高速
      enableSmoothing: true
    }
  );

  updateProgress(70);
}

// ======================
// 骨格の線を描く（軽量版）
// ======================
function drawSegment(a, b) {
  ctx.beginPath();
  ctx.moveTo(a.x, a.y);
  ctx.lineTo(b.x, b.y);
  ctx.strokeStyle = "lime";
  ctx.lineWidth = 4;
  ctx.stroke();
}

function drawPose(keypoints) {
  const kp = keypoints;

  // 上半身
  drawSegment(kp[5], kp[6]); // 肩
  drawSegment(kp[5], kp[11]); // 左体側
  drawSegment(kp[6], kp[12]); // 右体側

  // 腕
  drawSegment(kp[5], kp[7]);
  drawSegment(kp[7], kp[9]);

  drawSegment(kp[6], kp[8]);
  drawSegment(kp[8], kp[10]);

  // 下半身
  drawSegment(kp[11], kp[12]); // 腰
  drawSegment(kp[11], kp[13]);
  drawSegment(kp[13], kp[15]);

  drawSegment(kp[12], kp[14]);
  drawSegment(kp[14], kp[16]);
}

// ======================
// メインループ
// ======================
async function render() {
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

  const poses = await detector.estimatePoses(video);

  if (poses.length > 0) {
    drawPose(poses[0].keypoints);
  }

  requestAnimationFrame(render);
}

// ======================
// 初期化処理
// ======================
async function init() {
  updateProgress(1);

  await setupCamera();
  updateProgress(30);

  await loadModel();
  updateProgress(90);

  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;

  updateProgress(100);
  setTimeout(() => (loadingScreen.style.display = "none"), 300);

  render();
}

init();
