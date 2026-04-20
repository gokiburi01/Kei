const video = document.getElementById("camera");
const canvas = document.getElementById("output");
const ctx = canvas.getContext("2d");

const squatSpan = document.getElementById("squatCount");
const jumpSpan = document.getElementById("jumpCount");
const warning = document.getElementById("warning");

const resetBtn = document.getElementById("resetBtn");

// カウンター
let squatCount = 0;
let jumpCount = 0;

// 状態判定
let wasSquatting = false;
let wasJumping = false;

let detector;

// 全身チェックのための必要部位
const neededParts = ["left_ankle","right_ankle","nose"];

// ===== カメラ起動 =====
async function startCamera() {
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
}

// ===== MoveNet読み込み =====
async function loadModel() {
    detector = await poseDetection.createDetector(
        poseDetection.SupportedModels.MoveNet,
        {
            modelType: poseDetection.movenet.modelType.SINGLEPOSE_LIGHTNING,
        }
    );
}

// ===== 全身が映っているかチェック =====
function isFullBodyVisible(keypoints) {
    return neededParts.every(p =>
        keypoints.find(k => k.name === p && k.score > 0.4)
    );
}

// ===== 棒人間描画 =====
function drawSkeleton(keypoints) {
    ctx.strokeStyle = "lime";
    ctx.lineWidth = 3;

    const connect = (p1, p2) => {
        const kp1 = keypoints.find(k => k.name === p1);
        const kp2 = keypoints.find(k => k.name === p2);
        if (kp1 && kp2 && kp1.score > 0.4 && kp2.score > 0.4) {
            ctx.beginPath();
            ctx.moveTo(kp1.x, kp1.y);
            ctx.lineTo(kp2.x, kp2.y);
            ctx.stroke();
        }
    };

    const pairs = [
        ["nose", "left_shoulder"],
        ["nose", "right_shoulder"],
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

    pairs.forEach(p => connect(p[0], p[1]));
}

// ===== メインループ =====
async function loop() {
    const poses = await detector.estimatePoses(video);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(video, 0, 0);

    if (poses.length > 0) {
        const kp = poses[0].keypoints;

        // 全身判定
        if (!isFullBodyVisible(kp)) {
            warning.textContent = "⚠ 全身が映っていません";
            requestAnimationFrame(loop);
            return;
        } else {
            warning.textContent = "";
        }

        drawSkeleton(kp);

        // ===== 屈伸判定（腰の高さ） =====
        const hip = (kp.find(k => k.name === "left_hip")?.y +
                     kp.find(k => k.name === "right_hip")?.y) / 2;

        if (hip > canvas.height * 0.65) {
            wasSquatting = true;
        } else if (wasSquatting && hip < canvas.height * 0.55) {
            squatCount++;
            squatSpan.textContent = squatCount;
            wasSquatting = false;
        }

        // ===== ジャンプ判定（重心の急上昇） =====
        const nose = kp.find(k => k.name === "nose");
        if (nose) {
            if (nose.y < canvas.height * 0.25 && !wasJumping) {
                wasJumping = true;
                jumpCount++;
                jumpSpan.textContent = jumpCount;
            }
            if (nose.y > canvas.height * 0.35) {
                wasJumping = false;
            }
        }
    }

    requestAnimationFrame(loop);
}

// リセット
resetBtn.onclick = () => {
    squatCount = 0;
    jumpCount = 0;
    squatSpan.textContent = 0;
    jumpSpan.textContent = 0;
};

// ===== 起動 =====
(async () => {
    await startCamera();
    await loadModel();
    loop();
})();
