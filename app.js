const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

let video;
let detector;

// ===== カメラ起動（iOS対応） =====
async function setupCamera() {
  video = document.createElement("video");

  video.setAttribute("playsinline", "");
  video.setAttribute("autoplay", "");
  video.setAttribute("muted", "");
  video.playsInline = true;
  video.autoplay = true;
  video.muted = true;

  const stream = await navigator.mediaDevices.getUserMedia({
    video: { facingMode: "user", width: 480, height: 360 },
    audio: false
  });

  video.srcObject = stream;

  // ---- iOS Safari は play() を await しないと黒画面 ----
  await video.play();

  // ---- メタデータを待たないと黒画面 ----
  await new Promise(res => {
    if (video.readyState >= 2) res();
    else video.onloadedmetadata = res;
  });

  return video;
}

// ===== 骨格ライン =====
const lines = [
  ["left_shoulder","right_shoulder"],
  ["left_shoulder","left_elbow"],
  ["left_elbow","left_wrist"],
  ["right_shoulder","right_elbow"],
  ["right_elbow","right_wrist"],

  ["left_shoulder","left_hip"],
  ["right_shoulder","right_hip"],
  ["left_hip","right_hip"],

  ["left_hip","left_knee"],
  ["left_knee","left_ankle"],
  ["right_hip","right_knee"],
  ["right_knee","right_ankle"]
];

function drawBody(kp) {
  lines.forEach(([a,b]) => {
    const p1 = kp.find(k => k.name === a);
    const p2 = kp.find(k => k.name === b);

    if (!p1 || !p2 || p1.score < 0.3 || p2.score < 0.3) return;

    ctx.beginPath();
    ctx.moveTo(p1.x, p1.y);
    ctx.lineTo(p2.x, p2.y);
    ctx.strokeStyle = "lime";
    ctx.lineWidth = 2;
    ctx.stroke();
  });
}

// ===== 初期化 =====
async function init() {
  console.log("カメラ起動中…");
  await setupCamera();
  console.log("カメラ起動成功");

  console.log("モデル読み込み中…");
  detector = await poseDetection.createDetector(
    poseDetection.SupportedModels.MoveNet,
    { modelType: "SinglePose.Lightning" }
  );
  console.log("モデル読み込み成功");

  loop();
}

// ===== メインループ =====
async function loop() {
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

  const poses = await detector.estimatePoses(video);

  if (poses.length > 0) drawBody(poses[0].keypoints);

  requestAnimationFrame(loop);
}

init();
