const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");
const loading = document.getElementById("loading");

let video;
let detector;
let handModel;

// ====== スムージング（震え防止） ======
function smooth(prev, curr, alpha = 0.8) {
  if (!prev) return curr;
  return curr.map((p, i) => ({
    ...p,
    x: prev[i].x * alpha + p.x * (1 - alpha),
    y: prev[i].y * alpha + p.y * (1 - alpha),
    score: p.score
  }));
}

let prevPose = null;

// ====== 全身骨格ライン（下半身を復活） ======
const bodyLines = [
  // 上半身
  ["left_shoulder", "right_shoulder"],
  ["left_shoulder", "left_elbow"],
  ["left_elbow", "left_wrist"],
  ["right_shoulder", "right_elbow"],
  ["right_elbow", "right_wrist"],
  ["left_shoulder", "left_hip"],
  ["right_shoulder", "right_hip"],

  // 下半身（★ここが前回欠けていた）
  ["left_hip", "right_hip"],
  ["left_hip", "left_knee"],
  ["left_knee", "left_ankle"],
  ["right_hip", "right_knee"],
  ["right_knee", "right_ankle"],
];

// ====== 指のライン ======
const fingerLines = [
  [0,1],[1,2],[2,3],[3,4],
  [0,5],[5,6],[6,7],[7,8],
  [5,9],[9,10],[10,11],[11,12],
  [9,13],[13,14],[14,15],[15,16],
  [13,17],[17,18],[18,19],[19,20]
];

// ====== カメラセットアップ（安定化版） ======
async function setupCamera() {
  video = document.createElement("video");
  video.autoplay = true;
  video.playsInline = true;
  video.muted = true;

  const stream = await navigator.mediaDevices.getUserMedia({
    video: { width: 480, height: 360, facingMode: "user" },
    audio: false
  });

  video.srcObject = stream;

  return new Promise(res => {
    video.onloadedmetadata = () => res();
  });
}

// ====== 全身骨格表示 ======
function drawBody(keypoints) {
  keypoints.forEach(p => {
    if (p.score > 0.3) {
      ctx.beginPath();
      ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
      ctx.fillStyle = "red";
      ctx.fill();
    }
  });

  bodyLines.forEach(([a,b]) => {
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

// ====== 手の骨格表示 ======
function drawHand(hand) {
  const pts = hand.landmarks;

  pts.forEach(p => {
    ctx.beginPath();
    ctx.arc(p[0], p[1], 3, 0, Math.PI * 2);
    ctx.fillStyle = "cyan";
    ctx.fill();
  });

  fingerLines.forEach(([a,b]) => {
    const p1 = pts[a], p2 = pts[b];
    ctx.beginPath();
    ctx.moveTo(p1[0], p1[1]);
    ctx.lineTo(p2[0], p2[1]);
    ctx.strokeStyle = "yellow";
    ctx.lineWidth = 2;
    ctx.stroke();
  });
}

// ====== メイン処理 ======
async function init() {
  loading.innerText = "📷 カメラ起動中…";
  await setupCamera();

  loading.innerText = "🤖 モデル読込中…";

  detector = await poseDetection.createDetector(
    poseDetection.SupportedModels.MoveNet,
    { modelType: "SinglePose.Lightning" }
  );

  handModel = await handpose.load();

  loading.style.display = "none";
  canvas.style.display = "block";

  run();
}

// ====== ループ（軽量版） ======
async function run() {
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

  // 全身
  const poses = await detector.estimatePoses(video);
  if (poses.length > 0) {
    let kp = poses[0].keypoints;
    kp = smooth(prevPose, kp, 0.8);
    prevPose = kp;
    drawBody(kp);
  }

  // 両手
  const hands = await handModel.estimateHands(video);
  hands.forEach(drawHand);

  requestAnimationFrame(run);
}

init();
