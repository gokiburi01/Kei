const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

let previousKeypoints = null;
let mpHands = null;

// ------- MoveNet（体）-------
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

// ------- 手（21点ライン）-------
const fingerConnections = [
  [0,1],[1,2],[2,3],[3,4],
  [0,5],[5,6],[6,7],[7,8],
  [5,9],[9,10],[10,11],[11,12],
  [9,13],[13,14],[14,15],[15,16],
  [13,17],[17,18],[18,19],[19,20]
];

// ------- スムージング -------
function smoothKeypoints(current, previous, alpha = 0.85) {
  if (!previous) return current;
  return current.map((kp, i) => ({
    ...kp,
    x: previous[i].x * alpha + kp.x * (1 - alpha),
    y: previous[i].y * alpha + kp.y * (1 - alpha),
    score: kp.score
  }));
}

// ------- 体 -------
function drawBodyKeypoints(kp) {
  kp.forEach(p => {
    if (p.score > 0.3) {
      ctx.beginPath();
      ctx.arc(p.x, p.y, 5, 0, Math.PI * 2);
      ctx.fillStyle = "red";
      ctx.fill();
    }
  });
}

function drawBodySkeleton(kp) {
  bodyConnections.forEach(([a,b]) => {
    const p1 = kp.find(k => k.name === a);
    const p2 = kp.find(k => k.name === b);

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

// ------- 手（MediaPipe Hands）-------
function drawHand(landmarks) {
  // landmarks = [{x:0-1, y:0-1, z:...}, ... ]

  // 点
  landmarks.forEach(p => {
    ctx.beginPath();
    ctx.arc(p.x * canvas.width, p.y * canvas.height, 4, 0, Math.PI * 2);
    ctx.fillStyle = "cyan";
    ctx.fill();
  });

  // 線
  fingerConnections.forEach(([a, b]) => {
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

// ------- カメラ -------
async function setupCamera() {
  const video = document.createElement("video");
  video.width = canvas.width;
  video.height = canvas.height;
  video.autoplay = true;
  video.playsInline = true;
  video.muted = true;

  const stream = await navigator.mediaDevices.getUserMedia({
    video: { facingMode: "user", width: 640, height: 480 },
    audio: false
  });

  video.srcObject = stream;

  await new Promise(r => video.onloadedmetadata = () => r());
  return video;
}

// ------- メイン -------
async function main() {
  const video = await setupCamera();

  // 体 MoveNet
  const detector = await poseDetection.createDetector(
    poseDetection.SupportedModels.MoveNet,
    { modelType: "SinglePose.Lightning" }
  );

  // 手 MediaPipe Hands
  mpHands = new Hands({
    locateFile: file =>
      `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
  });

  mpHands.setOptions({
    maxNumHands: 2,         // ← 両手！！
    modelComplexity: 1,
    minDetectionConfidence: 0.7,
    minTrackingConfidence: 0.7
  });

  let detectedHands = [];

  mpHands.onResults(res => {
    detectedHands = res.multiHandLandmarks || [];
  });

  async function loop() {
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // ---- 全身 MoveNet ----
    const poses = await detector.estimatePoses(video);
    if (poses.length > 0) {
      let kp = poses[0].keypoints;
      kp = smoothKeypoints(kp, previousKeypoints, 0.85);
      previousKeypoints = kp;

      drawBodyKeypoints(kp);
      drawBodySkeleton(kp);
    }

    // ---- 手（両手）----
    await mpHands.send({ image: video });
    detectedHands.forEach(hand => drawHand(hand));

    requestAnimationFrame(loop);
  }

  loop();
}

main();
