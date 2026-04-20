const video = document.getElementById("camera");
const canvas = document.getElementById("output");
const ctx = canvas.getContext("2d");

const squatSpan = document.getElementById("squatCount");
const jumpSpan = document.getElementById("jumpCount");
const warning = document.getElementById("warning");
const loading = document.getElementById("loading");
const resetBtn = document.getElementById("resetBtn");

let squatCount = 0;
let jumpCount = 0;

let wasSquatting = false;
let wasJumping = false;

let detector;

// 必須ポイントがすべて見えているかチェック
const neededParts = ["nose", "left_ankle", "right_ankle", "left_hip", "right_hip"];

// ---------------------------
// カメラ起動
// ---------------------------
async function startCamera() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: "user", width: 640, height: 480 }
        });
        video.srcObject = stream;

        return new Promise(resolve => {
            video.onloadedmetadata = () => {
                canvas.width = video.videoWidth;
                canvas.height = video.videoHeight;
                resolve();
            };
        });
    } catch (e) {
        alert("カメラを起動できませんでした：" + e);
    }
}

// ---------------------------
// MoveNet 読み込み
// ---------------------------
async function loadModel() {
    loading.textContent = "🤖 モデルを初期化中…";

    detector = await poseDetection.createDetector(
        poseDetection.SupportedModels.MoveNet,
        {
            modelType: poseDetection.movenet.modelType.SINGLEPOSE_LIGHTNING
        }
    );

    loading.textContent = "🎉 モデル読み込み完了！";
    setTimeout(() => loading.style.display = "none", 1000);
}

// ---------------------------
// 全身チェック
// ---------------------------
function isFullBodyVisible(kp) {
    return neededParts.every(name => {
        const p = kp.find(k => k.name === name);
        return p && p.score > 0.45;
    });
}

// ---------------------------
// 骨格描画
// ---------------------------
function drawSkeleton(kp) {
    ctx.strokeStyle = "lime";
    ctx.lineWidth = 3;

    function line(a, b) {
        const p1 = kp.find(k => k.name === a);
        const p2 = kp.find(k => k.name === b);
        if (p1 && p2 && p1.score > 0.5 && p2.score > 0.5) {
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.stroke();
        }
    }

    const pairs = [
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
        ["right_knee","right_ankle"],
        ["nose","left_shoulder"],
        ["nose","right_shoulder"]
    ];

    pairs.forEach(p => line(p[0], p[1]));
}

// ---------------------------
// メイン処理
// ---------------------------
async function loop() {
    const poses = await detector.estimatePoses(video, { maxPoses: 1 });

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(video, 0, 0);

    if (poses.length > 0) {
        const kp = poses[0].keypoints;

        // 全身が映っていなければカウントしない
        if (!isFullBodyVisible(kp)) {
            warning.textContent = "⚠ 全身が映っていません";
            requestAnimationFrame(loop);
            return;
        }
        warning.textContent = "";

        drawSkeleton(kp);

        // ===== 屈伸判定（ヒップの高さ） =====
        const hipY =
            (kp.find(k => k.name === "left_hip").y +
            kp.find(k => k.name === "right_hip").y) / 2;

        if (hipY > canvas.height * 0.65) {
            wasSquatting = true;
        } else if (wasSquatting && hipY < canvas.height * 0.55) {
            squatCount++;
            squatSpan.textContent = squatCount;
            wasSquatting = false;
        }

        // ===== ジャンプ判定（鼻位置で判断）=====
        const nose = kp.find(k => k.name === "nose");

        if (nose.y < canvas.height * 0.25 && !wasJumping) {
            jumpCount++;
            jumpSpan.textContent = jumpCount;
            wasJumping = true;
        }
        if (nose.y > canvas.height * 0.35) {
            wasJumping = false;
        }
    }

    requestAnimationFrame(loop);
}

// ---------------------------
// リセットボタン
// ---------------------------
resetBtn.onclick = () => {
    squatCount = 0;
    jumpCount = 0;
    squatSpan.textContent = 0;
    jumpSpan.textContent = 0;
};

// ---------------------------
// 起動
// ---------------------------
(async () => {
    await startCamera();
    await loadModel();
    loop();
})();
