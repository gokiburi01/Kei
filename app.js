// =========================
// DOM取得
// =========================
const video = document.getElementById("video");
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");
const setupScreen = document.getElementById("setupScreen");
const loadingScreen = document.getElementById("loadingScreen");
const loadingText = document.getElementById("loadingText");
const warning = document.getElementById("warning");
const sqText = document.getElementById("sq");
const jpText = document.getElementById("jp");
const kcalText = document.getElementById("kcal");
const scoreText = document.getElementById("score");
const fpsText = document.getElementById("fpsValue");
const startBtn = document.getElementById("startBtn");
const resetBtn = document.getElementById("resetBtn");
// =========================
// ユーザー情報
// =========================
let userHeight = 170;
let userWeight = 60;
let userAge = 18;
let userGender = "male";
// =========================
// 状態管理
// =========================
let detector;
let running = false;
let squatCount = 0;
let jumpCount = 0;
let calories = 0;
let focusScore = 0;
let squatState = "UP";
let jumpState = false;
let prevHipY = null;
let lastFrame = performance.now();
// =========================
// 骨格ライン
// =========================
const skeleton = [
    [5,6],
    [5,7],
    [7,9],
    [6,8],
    [8,10],
    [5,11],
    [6,12],
    [11,12],
    [11,13],
    [13,15],
    [12,14],
    [14,16]
];
// =========================
// カメラ起動
// =========================
async function setupCamera(){
    const stream =
        await navigator.mediaDevices.getUserMedia({
            video:{
                facingMode:"user",
                width:{ideal:640},
                height:{ideal:480}
            },
            audio:false
        });
    video.srcObject = stream;
    await new Promise(resolve=>{
        video.onloadedmetadata = ()=>{
            resolve();
        };
    });
    await video.play();
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
}
// =========================
// MoveNet
// =========================
async function loadModel(){
    loadingScreen.style.display = "flex";
    loadingText.innerText = "MoveNet読込中...";
    detector =
        await poseDetection.createDetector(
            poseDetection.SupportedModels.MoveNet,
            {
                modelType:
                poseDetection.movenet.modelType
                .SINGLEPOSE_LIGHTNING
            }
        );
    loadingText.innerText = "読込完了";
}
// =========================
// 全身確認
// =========================
function isFullBodyVisible(kp){
    const required = [
        5,6,
        11,12,
        13,14,
        15,16
    ];
    return required.every(
        i=>kp[i] && kp[i].score > 0.3
    );
}
// =========================
// 骨格描画
// =========================
function drawSkeleton(kp){
    ctx.strokeStyle = "#00ff99";
    ctx.lineWidth = 4;
    skeleton.forEach(([a,b])=>{
        if(
            kp[a].score > 0.3 &&
            kp[b].score > 0.3
        ){
            ctx.beginPath();
            ctx.moveTo(
                kp[a].x,
                kp[a].y
            );
            ctx.lineTo(
                kp[b].x,
                kp[b].y
            );
            ctx.stroke();
        }
    });
    kp.forEach(point=>{
        if(point.score > 0.3){
            ctx.beginPath();
            ctx.arc(
                point.x,
                point.y,
                5,
                0,
                Math.PI*2
            );
            ctx.fillStyle = "#00ffff";
            ctx.fill();
        }
    });
}
// =========================
// スクワット検出
// 両脚必須
// =========================
function detectSquat(kp){
    const leftHip = kp[11];
    const rightHip = kp[12];
    const leftKnee = kp[13];
    const rightKnee = kp[14];
    const leftDiff =
        leftKnee.y - leftHip.y;
    const rightDiff =
        rightKnee.y - rightHip.y;
    const isDown =
        leftDiff < 80 &&
        rightDiff < 80;
    if(
        squatState === "UP" &&
        isDown
    ){
        squatState = "DOWN";
    }
    if(
        squatState === "DOWN" &&
        !isDown
    ){
        squatState = "UP";
        squatCount++;
        calories +=
            userWeight * 0.005;
        focusScore += 2;
    }
}
// =========================
// ジャンプ検出
// =========================
function detectJump(kp){
    const hipY =
        (
            kp[11].y +
            kp[12].y
        ) / 2;
    if(prevHipY === null){
        prevHipY = hipY;
        return;
    }
    const diff =
        prevHipY - hipY;
    if(
        diff > 20 &&
        !jumpState
    ){
        jumpState = true;
    }
    if(
        jumpState &&
        diff < 5
    ){
        jumpCount++;
        calories +=
            userWeight * 0.008;
        focusScore += 3;
        jumpState = false;
    }
    prevHipY = hipY;
}
// =========================
// UI更新
// =========================
function updateUI(){
    sqText.innerText =
        squatCount;
    jpText.innerText =
        jumpCount;
    kcalText.innerText =
        calories.toFixed(1);
    scoreText.innerText =
        Math.min(
            100,
            Math.floor(focusScore)
        );
}
// =========================
// FPS
// =========================
function updateFPS(){
    const now =
        performance.now();
    const fps =
        Math.round(
            1000 /
            (now-lastFrame)
        );
    lastFrame = now;
    fpsText.innerText = fps;
}
// =========================
// メインループ
// =========================
async function loop(){
    if(!running) return;
    ctx.clearRect(
        0,
        0,
        canvas.width,
        canvas.height
    );
    ctx.drawImage(
        video,
        0,
        0,
        canvas.width,
        canvas.height
    );
    const poses =
        await detector
        .estimatePoses(video);
    if(poses.length > 0){
        const kp =
            poses[0].keypoints;
        if(
            isFullBodyVisible(kp)
        ){
            warning.innerText = "";
            drawSkeleton(kp);
            detectSquat(kp);
            detectJump(kp);
            updateUI();
        }else{
            warning.innerText =
            "全身が映っていません";
        }
    }
    updateFPS();
    requestAnimationFrame(
        loop
    );
}
// =========================
// 開始
// =========================
startBtn.onclick =
async ()=>{
    userHeight =
        Number(
            document.getElementById(
                "heightInput"
            ).value || 170
        );
    userWeight =
        Number(
            document.getElementById(
                "weightInput"
            ).value || 60
        );
    userAge =
        Number(
            document.getElementById(
                "ageInput"
            ).value || 18
        );
    userGender =
        document.getElementById(
            "genderInput"
        ).value;
    setupScreen.style.display =
        "none";
    await setupCamera();
    await loadModel();
    loadingScreen.style.display =
        "none";
    running = true;
    loop();
};
// =========================
// リセット
// =========================
resetBtn.onclick = ()=>{
    squatCount = 0;
    jumpCount = 0;
    calories = 0;
    focusScore = 0;
    prevHipY = null;
    squatState = "UP";
    jumpState = false;
    updateUI();
};