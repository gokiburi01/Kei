// =========================
// DOM
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
const fpsText = document.getElementById("fpsValue");
const startBtn = document.getElementById("startBtn");
const resetBtn = document.getElementById("resetBtn");
// =========================
// ユーザー情報
// =========================
let userHeight = 170;
let userWeight = 60;
let userGender = "male";
let ageGroup = "10-20";
// =========================
// 状態管理
// =========================
let detector;
let running = false;
let squatCount = 0;
let jumpCount = 0;
let calories = 0;
let squatState = "UP";
let prevHipY = null;
let jumpState = false;
let jumpCooldown = 0;
let lastFrame = performance.now();
// =========================
// 骨格
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
// カメラ
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
        video.onloadedmetadata = resolve;
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
    loadingText.innerText = "MoveNet 読み込み中...";
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
// 全身判定
// =========================
function isFullBodyVisible(kp){
    const required = [
        5,6,
        11,12,
        13,14,
        15,16
    ];
    return required.every(
        i => kp[i] && kp[i].score > 0.3
    );
}
// =========================
// ベクトル角度
// =========================
function getAngle(a,b,c){
    const abx = a.x - b.x;
    const aby = a.y - b.y;
    const cbx = c.x - b.x;
    const cby = c.y - b.y;
    const dot =
        abx*cbx +
        aby*cby;
    const mag1 =
        Math.sqrt(
            abx*abx +
            aby*aby
        );
    const mag2 =
        Math.sqrt(
            cbx*cbx +
            cby*cby
        );
    const angle =
        Math.acos(
            dot /
            (mag1*mag2)
        );
    return angle * 180 / Math.PI;
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
    kp.forEach(p=>{
        if(p.score > 0.3){
            ctx.beginPath();
            ctx.arc(
                p.x,
                p.y,
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
// スクワット
// 膝角度判定
// =========================
function detectSquat(kp){
    if(jumpCooldown > 0){
        return;
    }
    const leftAngle =
        getAngle(
            kp[11],
            kp[13],
            kp[15]
        );
    const rightAngle =
        getAngle(
            kp[12],
            kp[14],
            kp[16]
        );
    const down =
        leftAngle < 120 &&
        rightAngle < 120;
    const up =
        leftAngle > 155 &&
        rightAngle > 155;
    if(
        squatState === "UP" &&
        down
    ){
        squatState = "DOWN";
    }
    if(
        squatState === "DOWN" &&
        up
    ){
        squatState = "UP";
        squatCount++;
        calories +=
            userWeight * 0.005;
    }
}
// =========================
// ジャンプ
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
        diff > 25 &&
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
        jumpState = false;
        jumpCooldown = 20;
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
}
// =========================
// FPS
// =========================
function updateFPS(){
    const now =
        performance.now();
    fpsText.innerText =
        Math.round(
            1000 /
            (now-lastFrame)
        );
    lastFrame = now;
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
    if(poses.length){
        const kp =
            poses[0].keypoints;
        if(
            isFullBodyVisible(kp)
        ){
            warning.innerText = "";
            drawSkeleton(kp);
            detectJump(kp);
            detectSquat(kp);
            updateUI();
        }
        else{
            warning.innerText =
            "全身が映っていません";
        }
    }
    if(jumpCooldown > 0){
        jumpCooldown--;
    }
    updateFPS();
    requestAnimationFrame(loop);
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
    userGender =
        document.getElementById(
            "genderInput"
        ).value;
    ageGroup =
        document.getElementById(
            "ageGroup"
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
    prevHipY = null;
    jumpState = false;
    jumpCooldown = 0;
    squatState = "UP";
    updateUI();
};