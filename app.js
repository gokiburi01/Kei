// ======================================
// Movement App
// Part1
// 初期化・カメラ・MoveNet
// ======================================

// ---------- DOM ----------

const video =
document.getElementById("video");

const canvas =
document.getElementById("canvas");

const ctx =
canvas.getContext("2d");

const setupScreen =
document.getElementById("setupScreen");

const loadingScreen =
document.getElementById("loadingScreen");

const loadingText =
document.getElementById("loadingText");

const warning =
document.getElementById("warning");

const startBtn =
document.getElementById("startBtn");

const resetBtn =
document.getElementById("resetBtn");

const sqText =
document.getElementById("sq");

const jpText =
document.getElementById("jp");

const kcalText =
document.getElementById("kcal");

const fpsText =
document.getElementById("fpsValue");

// ---------- ユーザー情報 ----------

let userHeight = 170;
let userWeight = 60;
let userGender = "male";
let ageGroup = "10-20";

// ---------- 状態 ----------

let detector = null;

let running = false;

let trainingFinished = false;

// ---------- カウンター ----------

let squatCount = 0;
let jumpCount = 0;

let calories = 0;

// ---------- FPS ----------

let lastFrameTime =
performance.now();

// ---------- スクワット ----------

let squatState = "UP";

// ---------- ジャンプ ----------

let jumpState = false;

let jumpCooldown = 0;

let prevHipY = null;
let prevAnkleY = null;

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
    await navigator.mediaDevices
    .getUserMedia({

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

// ---------- MoveNet ----------

async function loadModel(){

    loadingText.innerText =
    "MoveNet 読み込み中...";

    await tf.setBackend(
        "webgl"
    );

    await tf.ready();

    detector =
    await poseDetection
    .createDetector(

        poseDetection
        .SupportedModels
        .MoveNet,

        MODEL_CONFIG
    );

    loadingText.innerText =
    "準備完了";
}

// ---------- FPS ----------

function updateFPS(){

    const now =
    performance.now();

    const fps =
    Math.round(
        1000 /
        (now-lastFrameTime)
    );

    fpsText.innerText =
    fps;

    lastFrameTime = now;
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

// ---------- 全身確認 ----------

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
// 骨格描画
// スクワット判定
// ジャンプ判定
// kcal加算
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
    canvas.width - kp[a].x,
    kp[a].y
);

ctx.lineTo(
    canvas.width - kp[b].x,
    kp[b].y
);

            ctx.stroke();
        }
    });

    kp.forEach(point=>{

        if(point.score > 0.3){

            ctx.beginPath();

            ctx.arc(
    canvas.width - point.x,
    point.y,
    5,
    0,
    Math.PI * 2
);

            ctx.fillStyle =
            "#00ffff";

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

    const bothBent =

        leftAngle < 120 &&
        rightAngle < 120;

    const standing =

        leftAngle > 160 &&
        rightAngle > 160;

    if(
        squatState === "UP" &&
        bothBent
    ){

        squatState =
        "DOWN";
    }

    if(
        squatState === "DOWN" &&
        standing
    ){

        squatState =
        "UP";

        squatCount++;

        // kcal加算
        calories +=
        userWeight * 0.0015;

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

        prevHipY =
        hipY;

        prevAnkleY =
        ankleY;

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

        jumpState =
        true;
    }

    // 着地

    if(

        jumpState &&
        hipDiff < 2 &&
        ankleDiff < 2

    ){

        jumpCount++;

        // kcal加算
        calories +=
        userWeight * 0.0025;

        jumpState =
        false;

        jumpCooldown = 15;

        updateUI();
    }

    prevHipY =
    hipY;

    prevAnkleY =
    ankleY;
}

// ---------- 全身チェック ----------

function validatePose(kp){

    if(
        !isFullBodyVisible(kp)
    ){

        warning.innerText =
        "全身が映っていません";

        return false;
    }

    warning.innerText =
    "";

    return true;
}
// ======================================
// Part3
// メイン処理
// 20分タイマー
// リセット
// ======================================

// ---------- 20分タイマー ----------

function startTrainingTimer(){

    setTimeout(()=>{

        if(!running){
            return;
        }

        running = false;

        alert(

`20分経過しました

スクワット : ${squatCount}回

ジャンプ : ${jumpCount}回

消費カロリー : ${calories.toFixed(1)} kcal`

        );

    },20 * 60 * 1000);
}

// ---------- メインループ ----------

async function loop(){

    if(!running){
        return;
    }

    try{

        ctx.clearRect(
            0,
            0,
            canvas.width,
            canvas.height
        );

        // 映像表示
        // 左右反転なし

        ctx.save();

ctx.translate(
    canvas.width,
    0
);

ctx.scale(-1,1);

ctx.drawImage(
    video,
    0,
    0,
    canvas.width,
    canvas.height
);

ctx.restore();

        const poses =
        await detector.estimatePoses(

            video,

            {
                flipHorizontal:false
            }
        );

        if(
            poses &&
            poses.length > 0
        ){

            const kp =
            poses[0].keypoints;

            if(
                validatePose(kp)
            ){

                drawSkeleton(kp);

                detectJump(kp);

                detectSquat(kp);
            }
        }
        else{

            warning.innerText =
            "人物を検出できません";
        }

        updateFPS();

        updateUI();

        if(
            jumpCooldown > 0
        ){
            jumpCooldown--;
        }

    }
    catch(error){

        console.error(error);

        warning.innerText =
        "検出エラー";
    }

    requestAnimationFrame(
        loop
    );
}

// ---------- 開始 ----------

startBtn.addEventListener(

    "click",

    async ()=>{

        try{

            userHeight = Number(
                document
                .getElementById(
                    "heightInput"
                ).value
            );

            userWeight = Number(
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

            running = true;

            startTrainingTimer();

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
    }
);

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

        updateUI();

        warning.innerText = "";
    }
);

// ---------- 初期化 ----------

updateUI();

loadingScreen.style.display =
"none";

warning.innerText = "";