const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

const counterText = document.getElementById("counter");
const jumpCounterText = document.getElementById("jumpCounter");
const warningText = document.getElementById("warning");
const resetBtn = document.getElementById("reset");

let squatCount = 0;
let jumpCount = 0;

// スクワット判定
let state = "up"; // up → down → upで+1

// ジャンプ判定
let isJumping = false;
let prevHipY = null;

// モデル
let detector = null;

// -------------------------------
// 全身が映っているかチェック
// -------------------------------
function isFullBodyVisible(keypoints) {
  if (!keypoints) return false;

  const requiredParts = [
    "nose",
    "left_shoulder",
    "right_shoulder",
    "left_ankle",
    "right_ankle"
  ];

  // 必須パーツ確認
  for (let part of requiredParts) {
    const kp = keypoints.find(k => k.name === part);
    if (!kp || kp.score < 0.6) return false;
  }

  // 全体の信頼点 14以上か
  const visibleCount = keypoints.filter(k => k.score > 0.6).length;
  return visibleCount >= 14;
}

// -------------------------------
// カメラセットアップ
// -------------------------------
async function setupCamera() {
  const video = document.createElement("video");

  const stream = await navigator.mediaDevices.getUserMedia({
    video: { facingMode: "user", width: 640, height: 480 },
    audio: false
  });

  video.srcObject = stream;
  video.play();

  await new Promise(res => (video.onloadedmetadata = res));
  return video;
}

// -------------------------------
// メイン処理
// -------------------------------
async function main() {
  const video = await setupCamera();

  detector = await poseDetection.createDetector(
    poseDetection.SupportedModels.MoveNet,
    { modelType: "SinglePose.Lightning" }
  );

  async function loop() {
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const poses = await detector.estimatePoses(video);
    const pose = poses[0];

    if (pose && pose.keypoints) {
      const keypoints = pose.keypoints;

      // ---------------------------
      // 全身チェック
      // ---------------------------
      if (!isFullBodyVisible(keypoints)) {
        warningText.innerText = "全身が映っていません";
        return requestAnimationFrame(loop);
      } else {
        warningText.innerText = "";
      }

      // ---------------------------
      // スクワット判定（膝の高さで判断）
      // ---------------------------
      const hip = keypoints.find(k => k.name === "left_hip") || keypoints.find(k => k.name === "right_hip");
      const knee = keypoints.find(k => k.name === "left_knee") || keypoints.find(k => k.name === "right_knee");

      if (hip && knee && hip.score > 0.5 && knee.score > 0.5) {
        const diff = knee.y - hip.y; // 膝が腰より上に近づく→しゃがむ

        if (diff > 40 && state === "up") state = "down";
        if (diff < 20 && state === "down") {
          squatCount++;
          counterText.innerText = "回数：" + squatCount;
          state = "up";
        }
      }

      // ---------------------------
      // ジャンプ判定（腰の垂直移動）
      // ---------------------------
      const hip2 = hip;
      if (hip2 && hip2.score > 0.6) {
        const hipY = hip2.y;

        if (prevHipY === null) prevHipY = hipY;

        const diffY = prevHipY - hipY; // 身体が上がるほど数値↑

        if (diffY > 25 && !isJumping) {
          isJumping = true;
        }

        if (isJumping && diffY < 5) {
          jumpCount++;
          jumpCounterText.innerText = "ジャンプ：" + jumpCount;
          isJumping = false;
        }

        prevHipY = hipY;
      }
    }

    requestAnimationFrame(loop);
  }

  loop();
}

main();

// -------------------------------
// リセットボタン
// -------------------------------
resetBtn.addEventListener("click", () => {
  squatCount = 0;
  jumpCount = 0;
  state = "up";
  isJumping = false;
  prevHipY = null;

  counterText.innerText = "回数：0";
  jumpCounterText.innerText = "ジャンプ：0";
});
