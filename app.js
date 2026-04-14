const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

let previousKeypoints = null;
let hands;

// ===== 体の骨格 =====
const bodyConnections = [
  ['left_shoulder','right_shoulder'],
  ['left_shoulder','left_elbow'],
  ['left_elbow','left_wrist'],
  ['right_shoulder','right_elbow'],
  ['right_elbow','right_wrist'],
  ['left_shoulder','left_hip'],
  ['right_shoulder','right_hip'],
  ['left_hip','right_hip'],
  ['left_hip','left_knee'],
  ['left_knee','left_ankle'],
  ['right_hip','right_knee'],
  ['right_knee','right_ankle']
];

// ===== 手の骨格 =====
const fingerConnections = [
  [0,1],[1,2],[2,3],[3,4],
  [0,5],[5,6],[6,7],[7,8],
  [5,9],[9,10],[10,11],[11,12],
  [9,13],[13,14],[14,15],[15,16],
  [13,17],[17,18],[18,19],[19,20]
];

// ===== スムージング =====
function smoothKeypoints(current, previous, alpha = 0.85) {
  if (!previous) return current;

  return current.map((kp, i) => ({
    ...kp,
    x: previous[i].x * alpha + kp.x * (1 - alpha),
    y: previous[i].y * alpha + kp.y * (1 - alpha),
    score: kp.score
  }));
}

// ===== 体描画 =====
function drawBody(keypoints) {
  keypoints.forEach(kp => {
    if (kp.score > 0.3) {
      ctx.beginPath();
      ctx.arc(kp.x, kp.y, 5, 0, Math.PI*2);
      ctx.fillStyle = "red";
      ctx.fill();
    }
  });

  bodyConnections.forEach(([a,b]) => {
    const p1 = keypoints.find(k => k.name === a);
    const p2 = keypoints.find(k => k.name === b);

    if (p1 && p2 && p1.score > 0.3 && p2.score > 0.3) {
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.strokeStyle = "lime";
      ctx.lineWidth = 3;
      ctx.stroke();
    }
  });
}

// ===== 手描画（MediaPipe）=====
function drawHand(landmarks) {
  // 点
  landmarks.forEach(p => {
    ctx.beginPath();
    ctx.arc(p.x * canvas.width, p.y * canvas.height, 4, 0, Math.PI*2);
    ctx.fillStyle = "cyan";
    ctx.fill();
  });

  // 線
  fingerConnections.forEach(([a,b]) => {
    const p1 = landmarks[a];
    const p2 = landmarks[b];

    ctx.beginPath();
    ctx.moveTo(p1.x * canvas.width, p1.y * canvas.height);
    ctx.lineTo(p2.x * canvas.width, p2.y * canvas.height);
    ctx.strokeStyle = "yellow";
    ctx.lineWidth = 2;
    ctx.stroke();
  });
}

// ===== カメラ =====
async function setupCamera() {
  const video = document.createElement("video");
  video.autoplay = true;
  video.playsInline = true;

  const stream = await navigator.mediaDevices.getUserMedia({
    video: { facingMode: "user" }
  });

  video.srcObject = stream;

  await new Promise(res => video.onloadedmetadata = res);
  return video;
}

// ===== メイン =====
async function main() {
  const video = await setupCamera();

  // MoveNet
  const detector = await poseDetection.createDetector(
    poseDetection.SupportedModels.MoveNet,
    { modelType: "SinglePose.Lightning" }
  );

  // MediaPipe Hands
  hands = new Hands({
    locateFile: file => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
  });

  hands.setOptions({
    maxNumHands: 2,
    modelComplexity: 1,
    minDetectionConfidence: 0.7,
    minTrackingConfidence: 0.7
  });

  hands.onResults(results => {
    if (results.multiHandLandmarks) {
      results.multiHandLandmarks.forEach(drawHand);
    }
  });

  async function loop() {
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // 体
    const poses = await detector.estimatePoses(video);
    if (poses.length > 0) {
      let keypoints = poses[0].keypoints;
      keypoints = smoothKeypoints(keypoints, previousKeypoints);
      previousKeypoints = keypoints;
      drawBody(keypoints);
    }

    // 手（重要）
    await hands.send({ image: video });

    requestAnimationFrame(loop);
  }

  loop();
}

main();
