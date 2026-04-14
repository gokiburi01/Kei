const video = document.getElementById("video");
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

// ======== カメラ起動（軽量モード） ========
navigator.mediaDevices.getUserMedia({
    video: { facingMode: "user", width: 640, height: 480 }
}).then(stream => {
    video.srcObject = stream;
});

// ======== Pose 初期化 ========
const pose = new Pose.Pose({
    locateFile: file => `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`
});

pose.setOptions({
    modelComplexity: 0,
    smoothLandmarks: true,
    enableSegmentation: false,
    minDetectionConfidence: 0.5,
    minTrackingConfidence: 0.5
});

pose.onResults(draw);

const camera = new CameraUtils.Camera(video, {
    onFrame: async () => {
        await pose.send({ image: video });
    }
});
camera.start();

// ======== 線を描く簡易関数 ========
function line(a, b) {
    ctx.beginPath();
    ctx.moveTo(a.x * canvas.width, a.y * canvas.height);
    ctx.lineTo(b.x * canvas.width, b.y * canvas.height);
    ctx.stroke();
}

// ======== 棒人間を描画 ========
function draw(results) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (!results.poseLandmarks) return;

    const lm = results.poseLandmarks;
    ctx.strokeStyle = "#00ff00";
    ctx.lineWidth = 4;

    // ======== 上半身 ========
    line(lm[11], lm[12]); // 肩〜肩
    line(lm[11], lm[13]); // 左腕
    line(lm[13], lm[15]);

    line(lm[12], lm[14]); // 右腕
    line(lm[14], lm[16]);

    // ======== 下半身 ========
    line(lm[23], lm[24]); // 腰
    line(lm[23], lm[25]); // 左足
    line(lm[25], lm[27]);
    line(lm[27], lm[31]);

    line(lm[24], lm[26]); // 右足
    line(lm[26], lm[28]);
    line(lm[28], lm[32]);

    // ======== 指の簡易棒（軽量版） ========
    drawSimpleFinger(lm[15], lm[19]); // 左手
    drawSimpleFinger(lm[15], lm[17]);
    drawSimpleFinger(lm[15], lm[21]);

    drawSimpleFinger(lm[16], lm[20]); // 右手
    drawSimpleFinger(lm[16], lm[18]);
    drawSimpleFinger(lm[16], lm[22]);
}

function drawSimpleFinger(base, tip) {
    ctx.strokeStyle = "#ffaa00";
    line(base, tip);
}
