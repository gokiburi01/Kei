const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

let video;
let detector;
let hands;

let handResults = [];
let frame = 0;

// ========= カメラ =========
async function setupCamera() {
  video = document.createElement("video");
  video.width = 320;
  video.height = 240;
  video.autoplay = true;
  video.playsInline = true;
  video.muted = true;

  const stream = await navigator.mediaDevices.getUserMedia({
    video: { width: 320, height: 240, facingMode: "user" },
    audio: false
  });

  video.srcObject = stream;
  await new Promise(res => video.onloadedmetadata = res);
}

// ========= 骨格ライン =========
const bodyLines = [
  ["left_shoulder", "right_shoulder"],
  ["left_shoulder", "left_elbow"],
  ["left_elbow", "left_wrist"],
  ["right_shoulder", "right_elbow"],
  ["right_elbow", "right_wrist"],

  ["left_shoulder", "left_hip"],
  ["right_shoulder", "right_hip"],
  ["left_hip", "right_hip"],

  ["left_hip", "left_knee"],
  ["left_knee", "left_ankle"],
  ["right_hip", "right_knee"],
  ["right_knee", "right_ankle"]
];

const fingers = [
  [0,1],[1,2],[2,3],[3,4],
  [0,5],[5,6],[6,7],[7,8],
  [5,9],[9,10],[10,11],[11,12],
  [9,13],[13,14],[14,15],[15,16],
  [13,17],[17,18],[18,19],[19,20]
];

// ========= 描画 =========
function drawBody(keypoints) {
  bodyLines.forEach(([a,b]) => {
    const p1 = keypoints.find(k => k.name === a);
    const p2 = keypoints.find(k => k.name === b);
    if (!p1 || !p2 || p1.score < 0.3 || p2.score < 0.3) return;

    ctx.beginPath();
    ctx.moveTo(p1.x * 2, p1.y * 2);
    ctx.lineTo(p2.x * 2, p2.y * 2);
    ctx.strokeStyle = "lime";
    ctx.lineWidth = 3;
    ctx.stroke();
  });
}

function drawHands() {
  handResults.forEach(hand => {
    hand.forEach(pt => {
      ctx.beginPath();
      ctx.arc(pt.x * 640, pt.y * 480, 2, 0, Math.PI * 2);
      ctx.fillStyle = "cyan";
      ctx.fill();
    });

    fingers.forEach(([a,b])=>{
      const p1 = hand[a], p2 = hand[b];
      ctx.beginPath();
      ctx.moveTo(p1.x * 640, p1.y * 480);
      ctx.lineTo(p2.x * 640, p2.y * 480);
      ctx.strokeStyle = "yellow";
      ctx.lineWidth = 2;
      ctx.stroke();
    });
  });
}

// ========= 初期化 =========
async function init() {
  await setupCamera();

  detector = await poseDetection.createDetector(
    poseDetection.SupportedModels.MoveNet,
    { modelType: "MultiPose.Lightning" }
  );

  hands = new Hands({
    locateFile: f => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${f}`
  });

  hands.setOptions({
    maxNumHands: 2,
    modelComplexity: 0
  });

  hands.onResults(res => {
    handResults = res.multiHandLandmarks || [];
  });

  loop();
}

// ========= ループ =========
async function loop() {
  ctx.drawImage(video, 0, 0, 640, 480);

  // ---- 全身（毎フレーム）----
  const poses = await detector.estimatePoses(video);
  poses.slice(0, 3).forEach(p => drawBody(p.keypoints));

  // ---- 手（1/6フレーム実行）----
  frame++;
  if (frame % 6 === 0) {
    await hands.send({ image: video });
  }

  drawHands();

  requestAnimationFrame(loop);
}

init();
