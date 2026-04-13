const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

let previousKeypoints = null;

// 骨格の線の接続リスト
const connections = [
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

// 揺れを抑えるスムージング（α を大きくすると安定）
function smoothKeypoints(current, previous, alpha = 0.85) {
  if (!previous) return current;

  return current.map((kp, i) => ({
    ...kp,
    x: previous[i].x * alpha + kp.x * (1 - alpha),
    y: previous[i].y * alpha + kp.y * (1 - alpha),
    score: kp.score
  }));
}

// 点の描画
function drawKeypoints(keypoints) {
  keypoints.forEach(kp => {
    if (kp.score > 0.3) {
      ctx.beginPath();
      ctx.arc(kp.x, kp.y, 5, 0, Math.PI * 2);
      ctx.fillStyle = "red";
      ctx.fill();
    }
  });
}

// 線の描画
function drawSkeleton(keypoints) {
  connections.forEach(([a, b]) => {
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

// カメラの取得
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

  await new Promise(resolve => {
    video.onloadedmetadata = () => {
      video.play();
      resolve();
    };
  });

  return video;
}

async function main() {
  const video = await setupCamera();

  // MoveNet Detector
  const detector = await poseDetection.createDetector(
    poseDetection.SupportedModels.MoveNet,
    { modelType: "SinglePose.Lightning" }
  );

  async function loop() {
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const poses = await detector.estimatePoses(video);

    if (poses.length > 0) {
      let keypoints = poses[0].keypoints;

      // 揺れ軽減
      keypoints = smoothKeypoints(keypoints, previousKeypoints, 0.85);
      previousKeypoints = keypoints;

      drawKeypoints(keypoints);
      drawSkeleton(keypoints);
    }

    requestAnimationFrame(loop);
  }

  loop();
}

main();
