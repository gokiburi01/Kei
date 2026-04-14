const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

// 体の線
const bodyConnections = [
  ['left_shoulder','right_shoulder'],
  ['left_shoulder','left_elbow'], ['left_elbow','left_wrist'],
  ['right_shoulder','right_elbow'], ['right_elbow','right_wrist'],
  ['left_shoulder','left_hip'], ['right_shoulder','right_hip'],
  ['left_hip','right_hip'],
  ['left_hip','left_knee'], ['left_knee','left_ankle'],
  ['right_hip','right_knee'], ['right_knee','right_ankle']
];

// 指の線（21点）
const fingerConnections = [
  [0,1],[1,2],[2,3],[3,4],
  [0,5],[5,6],[6,7],[7,8],
  [5,9],[9,10],[10,11],[11,12],
  [9,13],[13,14],[14,15],[15,16],
  [13,17],[17,18],[18,19],[19,20]
];

let detector;
let hands;
let camera;

// カメラ取得
async function setupCamera() {
  const video = document.createElement("video");
  video.width = canvas.width;
  video.height = canvas.height;
  video.autoplay = true;
  video.playsInline = true;

  const stream = await navigator.mediaDevices.getUserMedia({
    video: { facingMode: "user", width: 640, height: 480 },
    audio: false
  });

  video.srcObject = stream;
  await new Promise(res => video.onloadedmetadata = res);
  video.play();
  return video;
}

// 体の描画
function drawBodySkeleton(keypoints) {
  bodyConnections.forEach(([a, b]) => {
    const p1 = keypoints.find(k => k.name === a);
    const p2 = keypoints.find(k => k.name === b);
    if (p1?.score > 0.3 && p2?.score > 0.3) {
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.strokeStyle = "lime";
      ctx.lineWidth = 3;
      ctx.stroke();
    }
  });
}

// 手の描画（複数人分）
function drawHandLandmarks(h) {
  const pts = h.landmarks;

  pts.forEach(p => {
    ctx.beginPath();
    ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
    ctx.fillStyle = "cyan";
    ctx.fill();
  });

  fingerConnections.forEach(([a, b]) => {
    const p1 = pts[a], p2 = pts[b];
    ctx.beginPath();
    ctx.moveTo(p1.x, p1.y);
    ctx.lineTo(p2.x, p2.y);
    ctx.strokeStyle = "yellow";
    ctx.lineWidth = 2;
    ctx.stroke();
  });
}

async function main() {
  const video = await setupCamera();

  // 複数人MoveNet
  detector = await poseDetection.createDetector(
    poseDetection.SupportedModels.MoveNet,
    {
      modelType: "MultiPose",
      enableTracking: true
    }
  );

  // 両手検出
  hands = new Hands({
    locateFile: file =>
      `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
  });

  hands.setOptions({
    maxNumHands: 4, // ← 複数人対応
    minDetectionConfidence: 0.5,
    minTrackingConfidence: 0.5
  });

  camera = new Camera(video, {
    onFrame: async () => {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      // 体（複数人）
      const poses = await detector.estimatePoses(video);
      poses.forEach(person => {
        drawBodySkeleton(person.keypoints);
      });

      // 両手（複数人）
      await hands.send({ image: video });
    },
    width: 640,
    height: 480
  });

  // Handの結果を受け取る
  hands.onResults(res => {
    if (res.multiHandLandmarks) {
      res.multiHandLandmarks.forEach(h => drawHandLandmarks(h));
    }
  });

  camera.start();
}

main();
