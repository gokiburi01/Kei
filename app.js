// ======================================
// Movement App
// Part1
// 初期化・UI・カメラ・MoveNet
// ======================================
// ---------- DOM ----------
const video = document.getElementById("video");
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");
const setupScreen = document.getElementById("setupScreen");
const loadingScreen = document.getElementById("loadingScreen");
const loadingText = document.getElementById("loadingText");
const warning = document.getElementById("warning");
const startBtn = document.getElementById("startBtn");
const resetBtn = document.getElementById("resetBtn");
const sqText = document.getElementById("sq");
const jpText = document.getElementById("jp");
const kcalText = document.getElementById("kcal");
const fpsText = document.getElementById("fpsValue");
const exerciseTimeText =
document.getElementById("exerciseTime");
// ---------- ユーザー情報 ----------
let userHeight = 170;
let userWeight = 60;
let userGender = "male";
let ageGroup = "10-20";
// ---------- 状態 ----------
let detector = null;
let running = false;
let squatCount = 0;
let jumpCount = 0;
let calories = 0;
let startTime = null;
let lastFrameTime = performance.now();
// ---------- スクワット ----------
let squatState = "UP";
// ---------- ジャンプ ----------
let jumpState = false;
let prevHipY = null;
let prevAnkleY = null;
let jumpCooldown = 0;
// ---------- MoveNet ----------
const MODEL_CONFIG = {
    modelType:
    poseDetection.movenet.modelType
    .SINGLEPOSE_LIGHTNING
};
// ---------- 骨格 ----------
const SKELETON = [
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
// ---------- カメラ ----------
async function setupCamera(){
    const stream =
    await navigator.mediaDevices.getUserMedia({
        video:{
            facingMode:"user",
            width:{
                ideal:640
            },
            height:{
                ideal:480
            }
        },
        audio:false
    });
    video.srcObject = stream;
    return new Promise(resolve=>{
        video.onloadedmetadata = ()=>{
            video.play();
            canvas.width =
            video.videoWidth;
            canvas.height =
            video.videoHeight;
            resolve();
        };
    });
}
// ---------- MoveNet読込 ----------
async function loadModel(){
    loadingText.innerText =
    "MoveNet 読込中...";
    await tf.setBackend("webgl");
    await tf.ready();
    detector =
    await poseDetection.createDetector(
        poseDetection.SupportedModels.MoveNet,
        MODEL_CONFIG
    );
    loadingText.innerText =
    "モデル準備完了";
}
// ---------- FPS ----------
function updateFPS(){
    const now =
    performance.now();
    const fps =
    Math.round(
        1000 /
        (now - lastFrameTime)
    );
    fpsText.innerText = fps;
    lastFrameTime = now;
}
// ---------- 運動時間 ----------
function updateExerciseTime(){
    if(!startTime) return;
    const elapsed =
    Math.floor(
        (Date.now() - startTime)
        / 1000
    );
    const min =
    Math.floor(elapsed / 60);
    const sec =
    elapsed % 60;
    exerciseTimeText.innerText =
        String(min).padStart(2,"0")
        + ":"
        +
        String(sec).padStart(2,"0");
}
// ---------- UI更新 ----------
function updateUI(){
    sqText.innerText =
    squatCount;
    jpText.innerText =
    jumpCount;
    kcalText.innerText =
    calories.toFixed(1);
}
// ---------- 全身判定 ----------
function isFullBodyVisible(kp){
    const required = [
        5,6,
        11,12,
        13,14,
        15,16
    ];
    return required.every(i=>
        kp[i] &&
        kp[i].score > 0.3
    );
}
// ======================================
// Part2
// 骨格描画・角度計算
// スクワット判定
// ジャンプ判定
// ======================================

// ---------- 骨格描画 ----------

function drawSkeleton(kp){

    ctx.strokeStyle = "#00ff99";
    ctx.lineWidth = 3;

    SKELETON.forEach(([a,b])=>{

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
                4,
                0,
                Math.PI * 2
            );

            ctx.fillStyle = "#00ffff";

            ctx.fill();
        }
    });
}

// ---------- 角度計算 ----------

function getAngle(a,b,c){

    const ab = {
        x:a.x-b.x,
        y:a.y-b.y
    };

    const cb = {
        x:c.x-b.x,
        y:c.y-b.y
    };

    const dot =
        ab.x * cb.x +
        ab.y * cb.y;

    const magAB =
        Math.sqrt(
            ab.x*ab.x +
            ab.y*ab.y
        );

    const magCB =
        Math.sqrt(
            cb.x*cb.x +
            cb.y*cb.y
        );

    if(
        magAB === 0 ||
        magCB === 0
    ){
        return 180;
    }

    let angle =
        Math.acos(
            dot /
            (magAB * magCB)
        );

    angle =
        angle *
        180 /
        Math.PI;

    return angle;
}

// ---------- スクワット判定 ----------

function detectSquat(kp){

    if(jumpCooldown > 0){
        return;
    }

    const leftKneeAngle =
        getAngle(
            kp[11],
            kp[13],
            kp[15]
        );

    const rightKneeAngle =
        getAngle(
            kp[12],
            kp[14],
            kp[16]
        );

    const avgAngle =
        (
            leftKneeAngle +
            rightKneeAngle
        ) / 2;

    const bothBent =
        leftKneeAngle < 120 &&
        rightKneeAngle < 120;

    const standing =
        avgAngle > 155;

    if(
        squatState === "UP" &&
        bothBent
    ){
        squatState = "DOWN";
    }

    if(
        squatState === "DOWN" &&
        standing
    ){

        squatCount++;

        squatState = "UP";

        updateUI();
    }
}

// ---------- ジャンプ判定 ----------

function detectJump(kp){

    const hipY =
        (
            kp[11].y +
            kp[12].y
        ) / 2;

    const ankleY =
        (
            kp[15].y +
            kp[16].y
        ) / 2;

    if(
        prevHipY === null ||
        prevAnkleY === null
    ){

        prevHipY = hipY;
        prevAnkleY = ankleY;

        return;
    }

    const hipDiff =
        prevHipY - hipY;

    const ankleDiff =
        prevAnkleY - ankleY;

    // ジャンプ開始

    if(
        hipDiff > 12 &&
        ankleDiff > 12 &&
        !jumpState
    ){
        jumpState = true;
    }

    // 着地

    if(
        jumpState &&
        hipDiff < 2 &&
        ankleDiff < 2
    ){

        jumpCount++;

        jumpState = false;

        jumpCooldown = 15;

        updateUI();
    }

    prevHipY = hipY;
    prevAnkleY = ankleY;
}

// ---------- 消費カロリー ----------

function calculateCalories(){

    if(!startTime){
        return;
    }

    const hours =
        (
            Date.now() -
            startTime
        ) /
        3600000;

    const squatMET =
        squatCount > 0
        ? 5.0
        : 0;

    const jumpMET =
        jumpCount > 0
        ? 8.0
        : 0;

    const avgMET =
        Math.max(
            squatMET,
            jumpMET
        );

    calories =
        avgMET *
        userWeight *
        hours;
}
// ======================================
// Part3
// メインループ
// 開始処理
// リセット
// ======================================

// ---------- メインループ ----------

async function loop(){

    if(!running){
        return;
    }

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

    let poses = [];

    try{

        poses =
        await detector
        .estimatePoses(
            video,
            {
                flipHorizontal:true
            }
        );

    }catch(error){

        console.error(error);

        requestAnimationFrame(loop);

        return;
    }

    if(
        poses &&
        poses.length > 0
    ){

        const kp =
        poses[0].keypoints;

        if(
            isFullBodyVisible(kp)
        ){

            warning.innerText = "";

            drawSkeleton(kp);

            detectJump(kp);

            detectSquat(kp);

        }
        else{

            warning.innerText =
            "全身が映っていません";

        }

    }
    else{

        warning.innerText =
        "人物を検出できません";

    }

    calculateCalories();

    updateExerciseTime();

    updateFPS();

    updateUI();

    if(
        jumpCooldown > 0
    ){
        jumpCooldown--;
    }

    requestAnimationFrame(loop);
}

// ---------- 開始ボタン ----------

startBtn.addEventListener(
"click",
async ()=>{

    try{

        userHeight =
        Number(
            document
            .getElementById(
                "heightInput"
            ).value
        );

        userWeight =
        Number(
            document
            .getElementById(
                "weightInput"
            ).value
        );

        userGender =
        document
        .getElementById(
            "genderInput"
        ).value;

        ageGroup =
        document
        .getElementById(
            "ageGroup"
        ).value;

        setupScreen
        .style.display =
        "none";

        loadingScreen
        .style.display =
        "flex";

        await setupCamera();

        await loadModel();

        loadingScreen
        .style.display =
        "none";

        startTime =
        Date.now();

        running = true;

        loop();

    }
    catch(error){

        console.error(error);

        loadingScreen
        .style.display =
        "none";

        warning.innerText =
        "カメラ起動に失敗しました";

    }
});

// ---------- リセット ----------

resetBtn.addEventListener(
"click",
()=>{

    squatCount = 0;

    jumpCount = 0;

    calories = 0;

    squatState = "UP";

    jumpState = false;

    jumpCooldown = 0;

    prevHipY = null;

    prevAnkleY = null;

    startTime =
    Date.now();

    updateUI();
});

// ---------- 初期表示 ----------

updateUI();

warning.innerText = "";

loadingScreen.style.display =
"none";

// ======================================
// End
// ======================================