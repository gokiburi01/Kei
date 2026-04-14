const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

const loadingText = document.getElementById("loading");

let video;
let detector;

// ========= カメラ初期化（確実に成功する方式） =========
async function setupCamera() {
  video = document.createElement("video");
  video.autoplay = true;
  video.playsInline = true;
  video.muted = true;

  const stream = await navigator.mediaDevices.getUserMedia({
    video: {
      width: 480,
      height: 360,
      facingMode: "user"
    },
    audio: false
  });

  video.srcObject = stream;

  return new Promise(resolve => {
    video.onloadedmetadata = () => {
      video.play();
      resolve();
    };
  });
}

// ========= 骨格ライン =========
const connections = [
  ["left_shoulder", "right_shoulder"],
  ["left_shoulder", "left_elbow"],
  ["left_elbow", "left_wrist"],
  ["right_shoulder", "right_elbow"],
  ["right_elbow", "right_wrist"],
  ["left_shoulder", "left_hip"],
  ["right_shoulder", "right_hip"],
  ["left_hip", "right_hip"],
];

// ========= 描画 =========
function drawSkeleton(keypoints) {
  keypoints.forEach(p => {
    if (p.score > 0.3) {
      ctx.beginPath();
      ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
      ctx.fillStyle = "red";
      ctx.fill();
    }
  });

  connections.forEach(([a, b]) => {
    const p1 = keypoints.find(k => k.name === a);
    const p2 = keypoints.find(k => k.name === b);

    if (p1 && p2 && p1.score > 0.3 && p2.score > 0.3) {
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.strokeStyle = "lime";
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  });
}

// ========= 初期化 =========
async function init() {
  loadingText.innerText = "📷 カメラ起動中…";

  await setupCamera();

  loadingText.innerText = "🤖 モデル読込中…";

  detector = await poseDetection.createDetector(
    poseDetection.SupportedModels.MoveNet,
    { modelType: "SinglePose.Lightning" }
  );

  loadingText.style.display = "none";
  canvas.style.display = "block";

  loop();
}

// ========= ループ（安全版） =========
async function loop() {
  try {
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const poses = await detector.estimatePoses(video);

    if (poses.length > 0) drawSkeleton(poses[0].keypoints);
  } catch (err) {
    console.warn("Frame error:", err);
  }

  requestAnimationFrame(loop);
}

init();
