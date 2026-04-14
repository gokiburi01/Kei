const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

let previousKeypoints = null;
let handModel = null;

// ------- MoveNet（体）の接続ライン -------
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

// ------- HandPose（手）の接続ライン 21点 -------
const fingerConnections = [
  [0,1],[1,2],[2,3],[3,4],     // 親指
  [0,5],[5,6],[6,7],[7,8],     // 人差し指
  [5,9],[9,10],[10,11],[11,12], // 中指
  [9,13],[13,14],[14,15],[15,16], // 薬指
  [13,17],[17,18],[18,19],[19,20] // 小指
];

// ------- 揺れ防止（スムージング） -------
function smoothKeypoints(current, previous, alpha = 0.85) {
  if (!previous) return current;

  return current.map((kp, i) => ({
    ...kp,
    x: previous[i].x * alpha + kp.x * (1 - alpha),
    y: previous[i].y * alpha + kp.y * (1 - alpha),
    score: kp.score
  }));
}

// ------- 体の点描画 -------
function drawBodyKeypoints(keypoints) {
  keypoints.forEach(kp => {
    if (kp.score > 0.3) {
      ctx.beginPath();
      ctx.arc(kp.x, kp.y, 5, 0, Math.PI * 2);
      ctx.fillStyle = "red";
      ctx.fill();
    }
  });
}

// ------- 体の骨格描画 -------
function drawBodySkeleton(keypoints) {
  bodyConnections.forEach(([a, b]) => {
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

// ------- 手の指の描画 -------
function drawHand(hand) {
  const pts = hand.landmarks;

  // 点
  pts.forEach(p => {
    ctx.beginPath();
    ctx.arc(p[0], p[1], 4, 0, Math.PI * 2);
    ctx.fillStyle = "cyan";
    ctx.fill();
  });

  // ライン
  fingerConnections.forEach(([a, b]) => {
    const p1 = pts[a];
    const p2 = pts[b];

    ctx.beginPath();
    ctx.moveTo(p1[0], p1[1]);
    ctx.lineTo(p2[0], p2[1]);
    ctx.strokeStyle = "yellow";
    ctx.lineWidth = 2;
    ctx.stroke();
  });
}

// ------- カメラ起動 -------
async function setupCamera() {
  const video = document.createElement("video");
  video.width = canvas.width;
  video.height = canvas.height;
  video.autoplay = true;
  video.playsInline = true;
  video.muted = true;

  const stream = await navigator.mediaDevices.getUserMedia({
    video: {
      facingMode: "user",
      width: { ideal: 640 },
      height: { ideal: 480 }
    },
    audio: false
  });

  video.srcObject = stream;

  await new Promise(res => {
    video.onloadedmetadata = () => {
      video.play();
      res();
    };
  });

  return video;
}

// ------- メイン処理 -------
async function main() {
  const video = await setupCamera();

  // 全身 MoveNet
  const detector = await poseDetection.createDetector(
    poseDetection.SupportedModels.MoveNet,
    { modelType: "SinglePose.Lightning" }
  );

  // 手 HandPose
  handModel = await handpose.load();

  async function loop() {
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // ------- 全身 -------
    const poses = await detector.estimatePoses(video);

    if (poses.length > 0) {
      let keypoints = poses[0].keypoints;

      // 揺れ防止
      keypoints = smoothKeypoints(keypoints, previousKeypoints, 0.85);
      previousKeypoints = keypoints;

      drawBodyKeypoints(keypoints);
      drawBodySkeleton(keypoints);
    }

    // ------- 手（指）-------
    const hands = await handModel.estimateHands(video);
    hands.forEach(hand => drawHand(hand));

    requestAnimationFrame(loop);
  }

  loop();
}

main();
