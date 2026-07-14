// ==========================================
// app.js Part1-1
// 定数・DOM取得・状態変数
// ==========================================

// ---------- 定数 ----------
const INTRO_COUNTDOWN = 10;
const MEMORY_TIME = 15;
const MEMORY_LENGTH = 20;
const TRAINING_TIME = 20 * 60;
const FPS_LIMIT = 50;

const CAMERA_WIDTH = 1280;
const CAMERA_HEIGHT = 720;

const MOVENET_MODEL = poseDetection.SupportedModels.MoveNet;

const MOVENET_CONFIG = {
    modelType: poseDetection.movenet.modelType.SINGLEPOSE_LIGHTNING
};

const SKELETON = [
    [5,7],[7,9],
    [6,8],[8,10],
    [5,6],
    [5,11],[6,12],
    [11,12],
    [11,13],[13,15],
    [12,14],[14,16]
];

// ---------- Setup ----------
const setupScreen = document.getElementById("setupScreen");

const heightInput = document.getElementById("heightInput");
const weightInput = document.getElementById("weightInput");
const genderInput = document.getElementById("genderInput");
const ageGroupInput = document.getElementById("ageGroup");

const startBtn = document.getElementById("startBtn");

// ---------- Loading ----------
const loadingScreen = document.getElementById("loadingScreen");
const loadingText = document.getElementById("loadingText");

// ---------- Countdown ----------
const countdownScreen = document.getElementById("countdownScreen");
const countdownNumber = document.getElementById("countdownNumber");

// ---------- Memory ----------
const memoryScreen = document.getElementById("memoryScreen");
const memoryDigits = document.getElementById("memoryDigits");
const memoryTimer = document.getElementById("memoryTimer");

// ---------- Answer ----------
const answerScreen = document.getElementById("answerScreen");

const memoryAnswerInput =
document.getElementById("memoryAnswerInput");

const submitAnswer =
document.getElementById("submitAnswer");

const giveUpBtn =
document.getElementById("giveUpBtn");

// ---------- Before Result ----------
const beforeMemoryResultScreen =
document.getElementById("beforeMemoryResultScreen");

const beforeRate =
document.getElementById("beforeRate");

const beforeCorrect =
document.getElementById("beforeCorrect");

const startTrainingBtn =
document.getElementById("startTrainingBtn");

// ---------- Training ----------
const trainingScreen =
document.getElementById("trainingScreen");

const video =
document.getElementById("video");

const canvas =
document.getElementById("canvas");

const ctx =
canvas.getContext("2d");

const safetyMessage =
document.getElementById("safetyMessage");

const warning =
document.getElementById("warning");

const exerciseName =
document.getElementById("exerciseName");

const exerciseTarget =
document.getElementById("exerciseTarget");

const progressText =
document.getElementById("progressText");

const sq =
document.getElementById("sq");

const jp =
document.getElementById("jp");

const kcal =
document.getElementById("kcal");

const fpsValue =
document.getElementById("fpsValue");

const resetBtn =
document.getElementById("resetBtn");

// ---------- Result ----------
const resultScreen =
document.getElementById("resultScreen");

const beforeCorrectResult =
document.getElementById("beforeCorrectResult");

const beforeRateResult =
document.getElementById("beforeRateResult");

const afterCorrectResult =
document.getElementById("afterCorrectResult");

const afterRateResult =
document.getElementById("afterRateResult");

const improveRate =
document.getElementById("improveRate");

const resultSquat =
document.getElementById("resultSquat");

const resultJump =
document.getElementById("resultJump");

const resultKcal =
document.getElementById("resultKcal");

const restartBtn =
document.getElementById("restartBtn");

// ---------- ユーザー情報 ----------
let userHeight = 170;
let userWeight = 60;
let userGender = "male";
let userAgeGroup = "10-20";

// ---------- 記憶テスト ----------
let phase = "before";

let randomDigits = "";

let beforeAnswer = "";
let afterAnswer = "";

let beforeCorrectCount = 0;
let afterCorrectCount = 0;

let beforeScore = 0;
let afterScore = 0;

let improveScore = 0;

// ---------- 運動 ----------
let detector = null;
let cameraStream = null;

let running = false;

let squatCount = 0;
let jumpCount = 0;
let calorie = 0;

let currentExercise = 0;
let currentSet = 0;

let remainExerciseTime = 40;

let trainingRemain = TRAINING_TIME;

// ---------- Pose ----------
let squatState = "UP";

let jumpCooldown = 0;

let prevHipY = null;
let prevAnkleY = null;

// ---------- Timer ----------
let countdownTimer = null;
let memoryTimerId = null;
let trainingTimer = null;
let animationId = null;

// ---------- FPS ----------
let fpsFrame = 0;
let lastFpsTime = performance.now();
let currentFps = 0;
// ==========================================
// app.js Part2
// 共通関数・画面切替・初期化
// ==========================================

// ---------- 全画面 ----------
const screens = [
    setupScreen,
    loadingScreen,
    countdownScreen,
    memoryScreen,
    answerScreen,
    beforeMemoryResultScreen,
    trainingScreen,
    resultScreen
];

// ---------- 画面切替 ----------
function showScreen(screen){

    screens.forEach(s=>{
        if(s) s.classList.add("hidden");
    });

    if(screen){
        screen.classList.remove("hidden");
    }

}

// ---------- ランダム20桁 ----------
function generateDigits(){

    let text="";

    for(let i=0;i<MEMORY_LENGTH;i++){

        text += Math.floor(Math.random()*10);

    }

    return text;

}

// ---------- 回答整形 ----------
function normalizeAnswer(str){

    return String(str||"")
        .replace(/\D/g,"")
        .trim();

}

// ---------- 正解数 ----------
function countCorrect(answer,correct){

    answer=normalizeAnswer(answer);

    let count=0;

    for(let i=0;i<MEMORY_LENGTH;i++){

        if(answer[i]===correct[i]){

            count++;

        }

    }

    return count;

}

// ---------- 正答率 ----------
function calcRate(correct){

    return Math.round(
        correct/MEMORY_LENGTH*100
    );

}

// ---------- 全タイマー停止 ----------
function stopTimers(){

    clearInterval(countdownTimer);
    clearInterval(memoryTimerId);
    clearInterval(trainingTimer);

    countdownTimer=null;
    memoryTimerId=null;
    trainingTimer=null;

}

// ---------- 記憶状態 ----------
function resetMemory(){

    phase="before";

    randomDigits="";

    beforeAnswer="";
    afterAnswer="";

    beforeCorrectCount=0;
    afterCorrectCount=0;

    beforeScore=0;
    afterScore=0;

    improveScore=0;

}

// ---------- 運動状態 ----------
function resetTraining(){

    running=false;

    squatCount=0;
    jumpCount=0;

    calorie=0;

    currentExercise=0;
    currentSet=0;

    remainExerciseTime=40;

    trainingRemain=TRAINING_TIME;

    squatState="UP";

    jumpCooldown=0;

    prevHipY=null;
    prevAnkleY=null;

}

// ---------- UI更新 ----------
function updateTrainingUI(){

    sq.textContent=squatCount;
    jp.textContent=jumpCount;
    kcal.textContent=calorie.toFixed(1);

}

// ---------- 結果更新 ----------
function updateResultUI(){

    beforeCorrectResult.textContent=
    `${beforeCorrectCount} / ${MEMORY_LENGTH}`;

    beforeRateResult.textContent=
    `${beforeScore}%`;

    afterCorrectResult.textContent=
    `${afterCorrectCount} / ${MEMORY_LENGTH}`;

    afterRateResult.textContent=
    `${afterScore}%`;

    improveRate.textContent=
    `${improveScore>=0?"+":""}${improveScore}%`;

    resultSquat.textContent=
    `${squatCount}回`;

    resultJump.textContent=
    `${jumpCount}回`;

    resultKcal.textContent=
    `${calorie.toFixed(1)} kcal`;

}

// ---------- FPS ----------
function updateFPS(){

    fpsFrame++;

    const now=performance.now();

    if(now-lastFpsTime>=1000){

        currentFps=Math.round(
            fpsFrame*1000/(now-lastFpsTime)
        );

        fpsValue.textContent=currentFps;

        fpsFrame=0;
        lastFpsTime=now;

    }

}

// ---------- ユーザー情報 ----------
function readProfile(){

    userHeight=
    Number(heightInput.value)||170;

    userWeight=
    Number(weightInput.value)||60;

    userGender=
    genderInput.value;

    userAgeGroup=
    ageGroupInput.value;

}

// ---------- 初期表示 ----------
showScreen(setupScreen);

updateTrainingUI();

updateResultUI();
// ==========================================
// app.js Part3
// 開始処理・記憶テスト
// ==========================================

// ---------- アプリ開始 ----------
function startApp(){

    readProfile();

    stopTimers();
    resetMemory();
    resetTraining();

    randomDigits = generateDigits();

    phase = "before";

    startCountdown();

}

// ---------- 10秒カウント ----------
function startCountdown(){

    showScreen(countdownScreen);

    let sec = 10;

    countdownNumber.textContent = sec;

    countdownTimer = setInterval(()=>{

        sec--;

        countdownNumber.textContent = sec;

        if(sec<=0){

            clearInterval(countdownTimer);

            startMemory();

        }

    },1000);

}

// ---------- 数字表示 ----------
function startMemory(){

    showScreen(memoryScreen);

    memoryDigits.textContent = randomDigits;

    let sec = 15;

    memoryTimer.textContent = sec;

    memoryTimerId = setInterval(()=>{

        sec--;

        memoryTimer.textContent = sec;

        if(sec<=0){

            clearInterval(memoryTimerId);

            showAnswer();

        }

    },1000);

}

// ---------- 回答画面 ----------
function showAnswer(){

    showScreen(answerScreen);

    memoryAnswerInput.value="";

    memoryAnswerInput.focus();

}

// ---------- 採点 ----------
function submitAnswer(giveUp=false){

    const answer = giveUp
        ? ""
        : normalizeAnswer(memoryAnswerInput.value);

    const correct =
        countCorrect(answer,randomDigits);

    const rate =
        calcRate(correct);

    if(phase==="before"){

        beforeAnswer=answer;
        beforeCorrectCount=correct;
        beforeScore=rate;

        beforeRate.textContent=rate;
        beforeCorrect.textContent=
        `${correct} / ${MEMORY_LENGTH}`;

        showScreen(beforeMemoryResultScreen);

        return;

    }

    afterAnswer=answer;
    afterCorrectCount=correct;
    afterScore=rate;

    finishExperiment();

}

// ---------- 運動開始 ----------
async function prepareTraining(){

    showScreen(loadingScreen);

    loadingText.textContent=
    "カメラを起動しています...";

    await setupCamera();

    loadingText.textContent=
    "AIを読み込んでいます...";

    await setupDetector();

    loadingText.textContent=
    "準備完了";

    setTimeout(()=>{

        startTraining();

    },500);

}

// ---------- ボタン ----------

startBtn.onclick=()=>{

    startApp();

};

submitAnswer.onclick=()=>{

    submitAnswer(false);

};

giveUpBtn.onclick=()=>{

    submitAnswer(true);

};

startTrainingBtn.onclick=()=>{

    prepareTraining();

};

memoryAnswerInput.addEventListener(
"keydown",
e=>{

if(e.key==="Enter"){

submitAnswer(false);

}

});
// ==========================================
// app.js Part4
// カメラ・MoveNet初期化
// ==========================================

// ---------- カメラ ----------
async function setupCamera(){

    if(video.srcObject){

        return;

    }

    const stream =
    await navigator.mediaDevices.getUserMedia({

        video:{
            facingMode:"user",
            width:1280,
            height:720
        },
        audio:false

    });

    video.srcObject=stream;

    await new Promise(resolve=>{

        video.onloadedmetadata=()=>{

            video.play();

            canvas.width=video.videoWidth;
            canvas.height=video.videoHeight;

            resolve();

        };

    });

}

// ---------- MoveNet ----------
async function setupDetector(){

    if(detector){

        return;

    }

    await tf.setBackend("webgl");
    await tf.ready();

    detector=
    await poseDetection.createDetector(

        poseDetection.SupportedModels.MoveNet,

        {

            modelType:
            poseDetection.movenet
            .modelType
            .SINGLEPOSE_LIGHTNING

        }

    );

}

// ---------- 運動開始 ----------
function startTraining(){

    showScreen(trainingScreen);

    running=true;

    trainingStartTime=Date.now();

    lastFpsTime=performance.now();

    fpsFrame=0;

    currentExercise=0;

    currentSet=1;

    startExercise();

    requestAnimationFrame(poseLoop);

}

// ---------- 種目開始 ----------
function startExercise(){

    const ex=
    exercises[currentExercise];

    exerciseName.textContent=
    ex.name;

    remainExerciseTime=
    ex.time;

    exerciseTarget.textContent=
    `残り${remainExerciseTime}秒`;

    progressText.textContent=
    `${currentSet} / 20 セット`;

    trainingTimer=
    setInterval(()=>{

        remainExerciseTime--;

        exerciseTarget.textContent=
        `残り${remainExerciseTime}秒`;

        if(remainExerciseTime<=0){

            clearInterval(trainingTimer);

            nextExercise();

        }

    },1000);

}

// ---------- 次の運動 ----------
function nextExercise(){

    currentExercise++;

    if(currentExercise>=exercises.length){

        currentExercise=0;

        currentSet++;

    }

    if(currentSet>20){

        finishTraining();

        return;

    }

    startExercise();

}
// ==========================================
// app.js Part5
// MoveNet推論・骨格描画
// ==========================================

// ---------- 推論ループ ----------
async function poseLoop(){

    if(!running) return;

    try{

        const poses=
        await detector.estimatePoses(video);

        drawCamera();

        if(poses.length){

            const keypoints=
            poses[0].keypoints;

            drawSkeleton(keypoints);

            detectSquat(keypoints);

            detectJump(keypoints);

        }

        updateTrainingUI();

        updateFPS();

    }catch(e){

        console.error(e);

    }

    requestAnimationFrame(poseLoop);

}

// ---------- カメラ描画 ----------
function drawCamera(){

    ctx.save();

    ctx.translate(canvas.width,0);

    ctx.scale(-1,1);

    ctx.drawImage(
        video,
        0,
        0,
        canvas.width,
        canvas.height
    );

    ctx.restore();

}

// ---------- 骨格 ----------
const skeleton=[

[5,7],[7,9],
[6,8],[8,10],

[5,6],

[5,11],[6,12],

[11,12],

[11,13],[13,15],
[12,14],[14,16]

];

// ---------- 骨格描画 ----------
function drawSkeleton(keypoints){

    ctx.lineWidth=4;

    ctx.strokeStyle="#00e5ff";

    skeleton.forEach(([a,b])=>{

        const p1=keypoints[a];
        const p2=keypoints[b];

        if(
            p1.score<0.3||
            p2.score<0.3
        ) return;

        ctx.beginPath();

        ctx.moveTo(
            canvas.width-p1.x,
            p1.y
        );

        ctx.lineTo(
            canvas.width-p2.x,
            p2.y
        );

        ctx.stroke();

    });

    keypoints.forEach(p=>{

        if(p.score<0.3) return;

        ctx.beginPath();

        ctx.fillStyle="#ffff00";

        ctx.arc(

            canvas.width-p.x,

            p.y,

            6,

            0,

            Math.PI*2

        );

        ctx.fill();

    });

}
// ==========================================
// app.js Part6
// スクワット・ジャンプ判定
// ==========================================

// ---------- 角度 ----------
function getAngle(a,b,c){

    const ab={
        x:a.x-b.x,
        y:a.y-b.y
    };

    const cb={
        x:c.x-b.x,
        y:c.y-b.y
    };

    const dot=
        ab.x*cb.x+
        ab.y*cb.y;

    const mag1=
        Math.hypot(ab.x,ab.y);

    const mag2=
        Math.hypot(cb.x,cb.y);

    const cos=
        dot/(mag1*mag2);

    return Math.acos(
        Math.max(-1,Math.min(1,cos))
    )*180/Math.PI;

}

// ---------- スクワット ----------
function detectSquat(keypoints){

    const hip=keypoints[11];
    const knee=keypoints[13];
    const ankle=keypoints[15];

    if(
        hip.score<0.3||
        knee.score<0.3||
        ankle.score<0.3
    ) return;

    const angle=
    getAngle(
        hip,
        knee,
        ankle
    );

    if(
        squatState==="UP" &&
        angle<100
    ){

        squatState="DOWN";

    }

    if(
        squatState==="DOWN" &&
        angle>160
    ){

        squatState="UP";

        squatCount++;

        calorie+=0.32;

    }

}

// ---------- ジャンプ ----------
function detectJump(keypoints){

    const hip=keypoints[11];

    if(hip.score<0.3) return;

    if(prevHipY===null){

        prevHipY=hip.y;

        return;

    }

    if(jumpCooldown>0){

        jumpCooldown--;

        prevHipY=hip.y;

        return;

    }

    const move=
    prevHipY-hip.y;

    if(move>35){

        jumpCount++;

        calorie+=0.45;

        jumpCooldown=15;

    }

    prevHipY=hip.y;

}

// ---------- kcal ----------
function updateCalories(){

    kcal.textContent=
    calorie.toFixed(1);

}
// ==========================================
// app.js Part7
// 運動終了・結果画面
// ==========================================

// ---------- 運動終了 ----------
function finishTraining(){

    running=false;

    stopTimers();

    phase="after";

    // 運動後は同じ数字を使用
    startCountdown();

}

// ---------- 実験終了 ----------
function finishExperiment(){

    improveScore=
    afterScore-beforeScore;

    updateResultUI();

    showScreen(resultScreen);

}

// ---------- リスタート ----------
function restartApp(){

    stopTimers();

    running=false;

    resetMemory();

    resetTraining();

    beforeRate.textContent="0";
    beforeCorrect.textContent="0 / 20";

    memoryAnswerInput.value="";

    showScreen(setupScreen);

}

// ---------- 最初に戻る ----------
resetBtn.onclick=()=>{

    restartApp();

};

// ---------- もう一度実験 ----------
restartBtn.onclick=()=>{

    restartApp();

};

// ---------- ページ終了 ----------
window.addEventListener(
"beforeunload",
()=>{

    stopTimers();

    if(video.srcObject){

        video.srcObject
        .getTracks()
        .forEach(track=>track.stop());

    }

});

// ---------- 初期表示 ----------
showScreen(setupScreen);

updateTrainingUI();

updateResultUI();
// ==========================================
// app.js Part8
// 運動メニュー管理（20分・40秒切替）
// ==========================================

// ---------- 運動メニュー ----------
const exercises=[

{
    name:"エアウォーキング",
    type:"walk",
    time:40
},

{
    name:"もも上げ",
    type:"highKnee",
    time:40
},

{
    name:"スクワット",
    type:"squat",
    time:40
},

{
    name:"ジャンプ",
    type:"jump",
    time:40
}

];

// ---------- 合計時間 ----------
const TOTAL_SET=30;

let currentSet=1;
let currentExercise=0;

// ---------- メニュー開始 ----------
function startExercise(){

    const ex=
    exercises[currentExercise];

    exerciseName.textContent=
    ex.name;

    remainExerciseTime=
    ex.time;

    exerciseTarget.textContent=
    `残り ${remainExerciseTime} 秒`;

    progressText.textContent=
    `${currentSet} / ${TOTAL_SET} セット`;

    clearInterval(trainingTimer);

    trainingTimer=setInterval(()=>{

        remainExerciseTime--;

        exerciseTarget.textContent=
        `残り ${remainExerciseTime} 秒`;

        if(remainExerciseTime<=0){

            clearInterval(trainingTimer);

            nextExercise();

        }

    },1000);

}

// ---------- 次の運動 ----------
function nextExercise(){

    currentExercise++;

    if(currentExercise>=exercises.length){

        currentExercise=0;

        currentSet++;

    }

    if(currentSet>TOTAL_SET){

        finishTraining();

        return;

    }

    startExercise();

}

// ---------- 現在の運動 ----------
function currentExerciseType(){

    return exercises[currentExercise].type;

}

// ---------- 判定切替 ----------
function executeExercise(keypoints){

    switch(currentExerciseType()){

        case "walk":
            detectAirWalk(keypoints);
            break;

        case "highKnee":
            detectHighKnee(keypoints);
            break;

        case "squat":
            detectSquat(keypoints);
            break;

        case "jump":
            detectJump(keypoints);
            break;

    }

}

// ---------- エアウォーキング ----------
let walkState=false;

function detectAirWalk(keypoints){

    const left=keypoints[15];
    const right=keypoints[16];

    if(left.score<0.3||right.score<0.3)return;

    const diff=Math.abs(left.y-right.y);

    if(diff>35&&!walkState){

        walkState=true;

        calorie+=0.03;

    }

    if(diff<15){

        walkState=false;

    }

}

// ---------- もも上げ ----------
let kneeState=false;

function detectHighKnee(keypoints){

    const hip=keypoints[11];
    const knee=keypoints[13];

    if(hip.score<0.3||knee.score<0.3)return;

    if(
        knee.y<hip.y &&
        !kneeState
    ){

        kneeState=true;

        calorie+=0.05;

    }

    if(
        knee.y>hip.y
    ){

        kneeState=false;

    }

}

// ---------- poseLoop内で使用 ----------
// detectSquat()
// detectJump()
// の代わりに

// executeExercise(keypoints);

// を呼び出すだけで
// 運動に応じた判定へ自動切替されます。
// ==========================================
// app.js Part9
// 結果画面・記録・FPS・UI更新
// ==========================================

// ---------- 正答率 ----------
function calcRate(correct){

    return Math.round(
        correct/MEMORY_LENGTH*100
    );

}

// ---------- 結果更新 ----------
function updateResultUI(){

    beforeCorrectResult.textContent=
    `${beforeCorrectCount} / ${MEMORY_LENGTH}`;

    beforeRateResult.textContent=
    `${beforeScore}%`;

    afterCorrectResult.textContent=
    `${afterCorrectCount} / ${MEMORY_LENGTH}`;

    afterRateResult.textContent=
    `${afterScore}%`;

    improveRate.textContent=
    `${improveScore>=0?"+":""}${improveScore}%`;

    resultSquat.textContent=
    `${squatCount}回`;

    resultJump.textContent=
    `${jumpCount}回`;

    resultKcal.textContent=
    `${calorie.toFixed(1)} kcal`;

}

// ---------- トレーニング画面更新 ----------
function updateTrainingUI(){

    sq.textContent=squatCount;

    jp.textContent=jumpCount;

    kcal.textContent=
    calorie.toFixed(1);

}

// ---------- FPS ----------
function updateFPS(){

    fpsFrame++;

    const now=performance.now();

    if(now-lastFpsTime>=1000){

        fpsValue.textContent=fpsFrame;

        fpsFrame=0;

        lastFpsTime=now;

    }

}

// ---------- CSV保存用データ ----------
function createResultData(){

    return{

        身長:user.height,

        体重:user.weight,

        性別:user.gender,

        年齢:user.age,

        運動前正解:beforeCorrectCount,

        運動前正答率:beforeScore,

        運動後正解:afterCorrectCount,

        運動後正答率:afterScore,

        向上率:improveScore,

        スクワット:squatCount,

        ジャンプ:jumpCount,

        消費kcal:calorie.toFixed(1)

    };

}

// ---------- CSVダウンロード ----------
function downloadCSV(){

    const d=createResultData();

    const csv=
        Object.keys(d).join(",")+"\n"+
        Object.values(d).join(",");

    const blob=
        new Blob([csv],{
            type:"text/csv"
        });

    const url=
        URL.createObjectURL(blob);

    const a=
        document.createElement("a");

    a.href=url;

    a.download="result.csv";

    a.click();

    URL.revokeObjectURL(url);

}

// ---------- デバッグ ----------
window.debugResult=()=>{

    beforeCorrectCount=12;
    beforeScore=60;

    afterCorrectCount=17;
    afterScore=85;

    improveScore=25;

    squatCount=42;

    jumpCount=28;

    calorie=32.4;

    updateResultUI();

    showScreen(resultScreen);

};
// ==========================================
// app.js Part10
// 安全判定・FPS50固定・初期化
// ==========================================

// ---------- 全身判定 ----------
function isFullBodyVisible(keypoints){

    const required=[
        0,5,6,11,12,13,14,15,16
    ];

    for(const i of required){

        if(
            !keypoints[i]||
            keypoints[i].score<0.30
        ){
            return false;
        }

    }

    return true;

}

// ---------- 警告 ----------
function showWarning(text){

    warning.textContent=text;

}

// ---------- poseLoop を完成版へ ----------
async function poseLoop(){

    if(!running)return;

    try{

        const poses=
        await detector.estimatePoses(video);

        drawCamera();

        if(poses.length){

            const keypoints=
            poses[0].keypoints;

            if(!isFullBodyVisible(keypoints)){

                showWarning(
                    "全身が画面に入る位置へ移動してください"
                );

            }else{

                showWarning("");

                drawSkeleton(keypoints);

                executeExercise(keypoints);

            }

        }else{

            showWarning(
                "人物を検出できません"
            );

        }

        updateTrainingUI();

        updateFPS();

    }catch(e){

        console.error(e);

    }

    // 約50FPS
    setTimeout(()=>{

        requestAnimationFrame(
            poseLoop
        );

    },20);

}

// ---------- タイマー停止 ----------
function stopTimers(){

    clearInterval(countdownTimer);

    clearInterval(memoryTimer);

    clearInterval(trainingTimer);

}

// ---------- 初期化 ----------
function resetMemory(){

    beforeCorrectCount=0;
    afterCorrectCount=0;

    beforeScore=0;
    afterScore=0;
    improveScore=0;

    memoryAnswerInput.value="";

}

// ---------- 運動初期化 ----------
function resetTraining(){

    squatCount=0;

    jumpCount=0;

    calorie=0;

    prevHipY=null;

    squatState="UP";

    walkState=false;

    kneeState=false;

    currentExercise=0;

    currentSet=1;

    updateTrainingUI();

}

// ---------- 初期表示 ----------
resetMemory();

resetTraining();

showScreen(setupScreen);

// ---------- Enterキー ----------
memoryAnswerInput.addEventListener(

    "keydown",

    e=>{

        if(e.key==="Enter"){

            submitMemory();

        }

    }

);

// ---------- 回答 ----------
submitAnswer.addEventListener(

    "click",

    submitMemory

);

// ---------- ギブアップ ----------
giveUpBtn.addEventListener(

    "click",

    ()=>{

        memoryAnswerInput.value="";

        submitMemory();

    }

);

// ---------- 開始 ----------
startBtn.addEventListener(

    "click",

    startApp

);

// ---------- 運動開始 ----------
startTrainingBtn.addEventListener(

    "click",

    async()=>{

        showScreen(loadingScreen);

        await setupCamera();

        await setupDetector();

        startTraining();

    }

);

// ---------- リスタート ----------
restartBtn.addEventListener(

    "click",

    restartApp

);

// ---------- 最初に戻る ----------
resetBtn.addEventListener(

    "click",

    restartApp

);

console.log(
    "集中力向上トレーニングアプリ 起動完了"
);