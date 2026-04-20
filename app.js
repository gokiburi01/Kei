const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

const counterText = document.getElementById("counter");
const jumpCounterText = document.getElementById("jumpCounter");
const warningText = document.getElementById("warning");
const resetBtn = document.getElementById("resetBtn");

let squatCount = 0;
let jumpCount = 0;
let state = "up"; // スクワット状態
let isJumping = false;

let detector = null;

// 前フレームの腰Y座標
let prevHipY = null;

// ---------------------- 全身チェック ----------------------
function isFullBodyVisible(keypoints) {
  const requiredParts = [
    "nose",
    "left_shoulder",
    "right_shoulder",
    "left_ankle",
    "right_ankle"
  ];

  // 必須5点
  for (let part of requiredParts) {
    const kp = keypoints.find(k => k.name === part);
    if (!kp || kp.score < 0.6) return false;
  }

  // 全体のスコアが良い点が14以上
  const visibleCount = keypoints.filter(k => k.score > 0.6).length;
  return visibleCount >= 14;
}

// ---------------------- カメラ ----------------------
async function setupCamera() {
  const video = document.createElement("video");
  video.width = 640;
  video.height = 480;
  video.autoplay = true;
  video.playsInline = true;

  const stream = await navigator.mediaDevices.getUserMedia({
    video: { facingMode: "user" }
  });
  video.srcObject = stream;

  await new Promise(res => {
    video.onloadedmetadata = () => res();
  });

  return video;
}

// ---------------------- メイン処理 ----------------------
async function main() {
  const video = await setupCamera();

  detector = await poseDetection.createDetector(
    poseDetection.SupportedModels.MoveNet,
    { modelType: "SinglePose.Lightning" }
  );

  async function loop() {
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const poses = await detector.estimatePoses(video);
    if (poses.length === 0) {
      warningText.innerText = "人物が映っていません";
      return requestAnimationFrame(loop);
    }

    const pose = poses[0];
    const keypoints = pose.keypoints;

    // ----------- 全身チェック -----------
    if (!isFullBodyVisible(keypoints)) {
      warningText.innerText = "全身が映っていません";
      return requestAnimationFrame(loop);
    } else {
      warningText.innerText = "";
    }

    // ------------------ スクワット判定 ------------------
    const leftHip = keypoints.find(p => p.name === "left_hip");
    const rightHip = keypoints.find(p => p.name === "right_hip");
    const leftKnee = keypoints.find(p => p.name === "left_knee");
    const rightKnee = keypoints.find(p => p.name === "right_knee");

    if (leftHip && rightHip && leftKnee && rightKnee) {
      const hipY = (leftHip.y + rightHip.y) / 2;
      const kneeY = (leftKnee.y + rightKnee.y) / 2;

      // しゃがんだ状態
      if (hipY > kneeY + 30 && state === "up") {
        state = "down";
      }

      // 立ち上がった
      if (hipY < kneeY && state === "down") {
        squatCount++;
        counterText.innerText = "回数：" + squatCount;
        state = "up";
      }
    }

    // ------------------ ジャンプ判定 ------------------
    const hipMain =
      keypoints.find(k => k.name === "left_hip") ||
      keypoints.find(k => k.name === "right_hip");

    if (hipMain && hipMain.score > 0.6) {
      const hipY = hipMain.y;

      if (prevHipY == null) prevHipY = hipY;

      const diff = prevHipY - hipY;

      // 上方向へ大きく動いたらジャンプ
      if (diff > 25 && !isJumping) {
        isJumping = true;
      }

      // 着地して戻ったらカウント
      if (isJumping && diff < 5) {
        jumpCount++;
        jumpCounterText.innerText = "ジャンプ：" + jumpCount;
        isJumping = false;
      }

      prevHipY = hipY;
    }

    requestAnimationFrame(loop);
  }

  loop();
}

// ----------------- リセット -----------------
resetBtn.addEventListener("click", () => {
  squatCount = 0;
  jumpCount = 0;
  prevHipY = null;
  state = "up";
  isJumping = false;

  counterText.innerText = "回数：0";
  jumpCounterText.innerText = "ジャンプ：0";
});

main();
