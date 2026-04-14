const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

let previousKeypoints = null;
let hands;

let frameCount = 0;
let cachedHands = null;

// ===== 体 =====
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

// ===== 手 =====
const fingerConnections = [
  [0,1],[1,2],[2,3],[3,4],
  [0,5],[5,6],[6,7],[7,8],
  [5,9],[9,10],[10,11],[11,12],
  [9,13],[13,14],[14,15],[15,16],
  [13,17],[17,18],[18,19],[19,20]
];

// ===== スムージング =====
function smoothKeypoints(current, previous, alpha = 0.7) {
  if (!previous) return current;
  return current.map((kp, i) => ({
    ...kp,
    x: previous[i].x * alpha + kp.x * (1 - alpha),
    y: previous[i].y * alpha + kp.y * (1 - alpha),
    score: kp.score
  }));
}

// ===== 描画 =====
function drawBody(keypoints) {
  keypoints.forEach(kp => {
    if (kp.score > 0.3) {
      ctx.beginPath();
      ctx.arc(kp.x, kp.y, 3, 0, Math.PI*2);
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
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  });
}

function drawHands(handsData) {
  if (!handsData) return;

  handsData.forEach(hand => {
    const landmarks = hand;

    landmarks.forEach(p => {
      ctx.beginPath();
      ctx.arc(p.x * canvas.width, p.y * canvas.height, 2, 0, Math.PI*2);
      ctx.fillStyle = "cyan";
      ctx.fill();
    });

    fingerConnections.forEach(([a,b]) => {
      const p1 = landmarks[a];
      const p2 = landmarks[b];

      ctx.beginPath();
      ctx.moveTo(p1.x * canvas.width, p1.y * canvas.height);
      ctx.lineTo(p2.x * canvas.width, p2.y * canvas.height);
      ctx.strokeStyle = "yellow";
      ctx.lineWidth = 1;
      ctx.stroke();
    });
  });
}

// ===== カメラ =====
async function setupCamera() {
  const video = document.createElement("video");

  const stream = await navigator.mediaDevices.getUserMedia({
    video: {
      width: 320,
      height: 240,
      facingMode: "user"
    }
  });

  video.srcObject = stream;
  await new Promise(res => video.onloadedmetadata = res);
  return video;
}

// ===== メイン =====
async function main() {
  const video = await setupCamera();

  const detector = await poseDetection.createDetector(
    poseDetection.SupportedModels.MoveNet,
    { modelType: "SinglePose.Lightning" }
  );

  hands = new Hands({
    locateFile: file => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
  });

  hands.setOptions({
    maxNumHands: 1, // 軽量化
    modelComplexity: 0 // 軽量化
  });

  hands.onResults(results => {
    cachedHands = results.multiHandLandmarks;
  });

  async function loop() {
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // ---- 体（毎フレーム）----
    const poses = await detector.estimatePoses(video);
    if (poses.length > 0) {
      let keypoints = poses[0].keypoints;
      keypoints = smoothKeypoints(keypoints, previousKeypoints);
      previousKeypoints = keypoints;
      drawBody(keypoints);
    }

    // ---- 手（3フレームに1回だけ）----
    frameCount++;
    if (frameCount % 3 === 0) {
      await hands.send({ image: video });
    }

    drawHands(cachedHands);

    requestAnimationFrame(loop);
  }

  loop();
}

main();
