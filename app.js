let squat = 0;
let jump = 0;

let video = document.getElementById("video");
let canvas = document.getElementById("canvas");
let ctx = canvas.getContext("2d");

let warning = document.getElementById("warning");

let currentFacing = "user";
let stream = null;

let pose;
let running = false;

// ===== カメラ =====
async function startCamera() {
    try {
        if (stream) {
            stream.getTracks().forEach(t => t.stop());
        }

        stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: currentFacing }
        });

        video.srcObject = stream;

        await video.play();

        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

    } catch (e) {
        warning.style.display = "block";
        warning.innerText = "カメラが起動できません（権限 or HTTPS確認）";
        console.error(e);
    }
}

// ===== モデル =====
async function loadModel() {
    const visionObj = await vision;

    pose = await visionObj.PoseLandmarker.createFromOptions(visionObj, {
        baseOptions: {
            modelAssetPath:
            "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/pose_landmarker_lite.task"
        },
        runningMode: "video"
    });
}

// ===== スタート =====
document.getElementById("startBtn").onclick = async () => {

    this.disabled = true;

    await loadModel();
    await startCamera();

    running = true;
    loop();

    document.getElementById("startBtn").style.display = "none";
};

// ===== 切替 =====
document.getElementById("switchCameraBtn").onclick = async () => {
    currentFacing = currentFacing === "user" ? "environment" : "user";
    await startCamera();
};

// ===== リセット =====
document.getElementById("resetBtn").onclick = () => {
    squat = 0;
    jump = 0;
    document.getElementById("sq").innerText = 0;
    document.getElementById("jp").innerText = 0;
};

// ===== ループ =====
function loop() {
    if (!running) return;

    const now = performance.now();

    pose.detectForVideo(video, now, (res) => {

        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        if (!res.landmarks || res.landmarks.length === 0) {
            warning.style.display = "block";
            warning.innerText = "全身が映っていません";
            requestAnimationFrame(loop);
            return;
        }

        warning.style.display = "none";

        // 表示
        ctx.fillStyle = "lime";
        res.landmarks[0].forEach(p => {
            ctx.beginPath();
            ctx.arc(p.x * canvas.width, p.y * canvas.height, 4, 0, Math.PI * 2);
            ctx.fill();
        });

        requestAnimationFrame(loop);
    });
}
