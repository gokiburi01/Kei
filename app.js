// ======================================
// 集中力向上トレーニングアプリ
// app.js Part1
// 役割：
// 1. DOM取得
// 2. 画面切り替え
// 3. 共通変数
// 4. カメラ準備
// 5. MoveNet初期化
// ======================================



// ======================================
// 0. 画面ID定数
// ======================================

const SCREEN_IDS = {
    setup: "setupScreen",
    countdown: "countdownScreen",
    memory: "memoryScreen",
    answer: "answerScreen",
    loading: "loadingScreen",
    training: "trainingScreen",
    result: "resultScreen"
};



// ======================================
// 1. DOM取得
// ======================================

// ---------- 画面 ----------
const setupScreen =
document.getElementById("setupScreen");

const countdownScreen =
document.getElementById("countdownScreen");

const memoryScreen =
document.getElementById("memoryScreen");

const answerScreen =
document.getElementById("answerScreen");

const loadingScreen =
document.getElementById("loadingScreen");

const trainingScreen =
document.getElementById("trainingScreen");

const resultScreen =
document.getElementById("resultScreen");


// ---------- 初期設定 ----------
const heightInput =
document.getElementById("heightInput");

const weightInput =
document.getElementById("weightInput");

const genderInput =
document.getElementById("genderInput");

const ageGroupInput =
document.getElementById("ageGroup");

const startBtn =
document.getElementById("startBtn");


// ---------- カウントダウン ----------
const countdownTitle =
document.getElementById("countdownTitle");

const countdownNumber =
document.getElementById("countdownNumber");


// ---------- 記憶表示画面 ----------
const memoryPhaseLabel =
document.getElementById("memoryPhaseLabel");

const memoryNumber =
document.getElementById("memoryNumber");

const memoryTimer =
document.getElementById("memoryTimer");


// ---------- 回答入力画面 ----------
const answerPhaseLabel =
document.getElementById("answerPhaseLabel");

const memoryAnswerInput =
document.getElementById("memoryAnswerInput");

const submitAnswerBtn =
document.getElementById("submitAnswerBtn");

const giveUpBtn =
document.getElementById("giveUpBtn");


// ---------- ロード ----------
const loadingText =
document.getElementById("loadingText");


// ---------- 運動画面 ----------
const safetyMessage =
document.getElementById("safetyMessage");

const warning =
document.getElementById("warning");

const sqText =
document.getElementById("sq");

const jpText =
document.getElementById("jp");

const kcalText =
document.getElementById("kcal");

const fpsText =
document.getElementById("fpsValue");

const resetBtn =
document.getElementById("resetBtn");

const video =
document.getElementById("video");

const canvas =
document.getElementById("canvas");

const ctx =
canvas.getContext("2d");


// ---------- 結果画面 ----------
const beforeCorrectText =
document.getElementById("beforeCorrect");

const beforeRateText =
document.getElementById("beforeRate");

const afterCorrectText =
document.getElementById("afterCorrect");

const afterRateText =
document.getElementById("afterRate");

const improveRateText =
document.getElementById("improveRate");

const resultSquatText =
document.getElementById("resultSquat");

const resultJumpText =
document.getElementById("resultJump");

const resultKcalText =
document.getElementById("resultKcal");

const restartBtn =
document.getElementById("restartBtn");



// ======================================
// 2. 画面一覧
// ======================================

const allScreens = [
    setupScreen,
    countdownScreen,
    memoryScreen,
    answerScreen,
    loadingScreen,
    trainingScreen,
    resultScreen
];



// ======================================
// 3. 共通状態変数
// ======================================

// ---------- ユーザー情報 ----------
let userHeight = 170;
let userWeight = 60;
let userGender = "male";
let userAgeGroup = "10-20";


// ---------- 記憶テスト関連 ----------
let memoryDigits = "";          // 10桁の正解数字
let memoryPhase = "before";     // "before" or "after"

let beforeAnswer = "";
let afterAnswer = "";

let beforeCorrectCount = 0;
let afterCorrectCount = 0;

let beforeRate = 0;
let afterRate = 0;

let improveRate = 0;


// ---------- タイマー関連 ----------
let countdownTimerId = null;
let memoryTimerId = null;
let trainingTimerId = null;


// ---------- 運動時間 ----------
const TRAINING_TIME_MS =
20 * 60 * 1000; // 本番20分

// テスト時は必要に応じて下を使う
// const TRAINING_TIME_MS = 30 * 1000;


// ======================================
// 4. 運動判定関連の状態
// ======================================

// ---------- モデル ----------
let detector = null;
let running = false;
let trainingFinished = false;


// ---------- 回数 ----------
let squatCount = 0;
let jumpCount = 0;
let calories = 0;


// ---------- FPS ----------
let lastFrameTime =
performance.now();


// ---------- スクワット状態 ----------
let squatState = "UP";


// ---------- ジャンプ状態 ----------
let jumpState = false;
let jumpCooldown = 0;
let prevHipY = null;
let prevAnkleY = null;


// ======================================
// 5. MoveNet設定
// ======================================

const MODEL_CONFIG = {
    modelType:
    poseDetection.movenet.modelType
    .SINGLEPOSE_LIGHTNING
};


// ======================================
// 6. 骨格接続定義
// MoveNet keypoints に合わせる
// ======================================

const SKELETON = [
    [5, 6],   // 肩
    [5, 7],   // 左肩-左肘
    [7, 9],   // 左肘-左手首
    [6, 8],   // 右肩-右肘
    [8,10],   // 右肘-右手首
    [5,11],   // 左肩-左腰
    [6,12],   // 右肩-右腰
    [11,12],  // 腰
    [11,13],  // 左腰-左膝
    [13,15],  // 左膝-左足首
    [12,14],  // 右腰-右膝
    [14,16]   // 右膝-右足首
];



// ======================================
// 7. 画面切り替え
// ======================================

function showScreen(screenName){

    allScreens.forEach(screen=>{
        screen.classList.remove("active");
    });

    switch(screenName){

        case "setup":
            setupScreen.classList.add("active");
            break;

        case "countdown":
            countdownScreen.classList.add("active");
            break;

        case "memory":
            memoryScreen.classList.add("active");
            break;

        case "answer":
            answerScreen.classList.add("active");
            break;

        case "loading":
            loadingScreen.classList.add("active");
            break;

        case "training":
            trainingScreen.classList.add("active");
            break;

        case "result":
            resultScreen.classList.add("active");
            break;

        default:
            setupScreen.classList.add("active");
            break;
    }
}



// ======================================
// 8. ユーザー設定の読み込み
// ======================================

function loadUserSettings(){

    userHeight =
    Number(heightInput.value) || 170;

    userWeight =
    Number(weightInput.value) || 60;

    userGender =
    genderInput.value || "male";

    userAgeGroup =
    ageGroupInput.value || "10-20";
}



// ======================================
// 9. 表示更新
// ======================================

// ---------- 運動画面UI ----------
function updateTrainingUI(){

    sqText.innerText =
    squatCount;

    jpText.innerText =
    jumpCount;

    kcalText.innerText =
    calories.toFixed(1);
}


// ---------- FPS ----------
function updateFPS(){

    const now =
    performance.now();

    const diff =
    now - lastFrameTime;

    if(diff > 0){
        const fps =
        Math.round(1000 / diff);
        fpsText.innerText = fps;
    }

    lastFrameTime = now;
}


// ---------- 結果画面 ----------
function updateResultUI(){

    beforeCorrectText.innerText =
    `${beforeCorrectCount} / 10`;

    beforeRateText.innerText =
    `${beforeRate}%`;

    afterCorrectText.innerText =
    `${afterCorrectCount} / 10`;

    afterRateText.innerText =
    `${afterRate}%`;

    if(improveRate >= 0){
        improveRateText.innerText =
        `+${improveRate}%`;
    }else{
        improveRateText.innerText =
        `${improveRate}%`;
    }

    resultSquatText.innerText =
    `${squatCount}回`;

    resultJumpText.innerText =
    `${jumpCount}回`;

    resultKcalText.innerText =
    `${calories.toFixed(1)} kcal`;
}



// ======================================
// 10. 状態初期化
// ======================================

// ---------- 記憶テスト状態 ----------
function resetMemoryState(){

    memoryDigits = "";
    memoryPhase = "before";

    beforeAnswer = "";
    afterAnswer = "";

    beforeCorrectCount = 0;
    afterCorrectCount = 0;

    beforeRate = 0;
    afterRate = 0;

    improveRate = 0;

    memoryAnswerInput.value = "";
}


// ---------- 運動状態 ----------
function resetTrainingState(){

    running = false;
    trainingFinished = false;

    squatCount = 0;
    jumpCount = 0;
    calories = 0;

    squatState = "UP";

    jumpState = false;
    jumpCooldown = 0;

    prevHipY = null;
    prevAnkleY = null;

    lastFrameTime =
    performance.now();

    warning.innerText = "";

    updateTrainingUI();
}


// ---------- 全体リセット ----------
function resetAllState(){

    clearAllTimers();

    resetMemoryState();
    resetTrainingState();
}



// ======================================
// 11. タイマー停止
// ======================================

function clearAllTimers(){

    if(countdownTimerId){
        clearInterval(countdownTimerId);
        countdownTimerId = null;
    }

    if(memoryTimerId){
        clearInterval(memoryTimerId);
        memoryTimerId = null;
    }

    if(trainingTimerId){
        clearTimeout(trainingTimerId);
        trainingTimerId = null;
    }
}



// ======================================
// 12. カメラ準備
// iPad Safari / GitHub Pages を想定
// ======================================

async function setupCamera(){

    if(
        !navigator.mediaDevices ||
        !navigator.mediaDevices.getUserMedia
    ){
        throw new Error("camera_not_supported");
    }

    const stream =
    await navigator.mediaDevices.getUserMedia({
        video:{
            facingMode:"user",
            width:{ ideal:640 },
            height:{ ideal:480 }
        },
        audio:false
    });

    video.srcObject = stream;

    return new Promise((resolve,reject)=>{

        video.onloadedmetadata = async ()=>{

            try{
                await video.play();

                canvas.width =
                video.videoWidth || 640;

                canvas.height =
                video.videoHeight || 480;

                resolve();
            }
            catch(err){
                reject(err);
            }
        };
    });
}



// ======================================
// 13. MoveNet読み込み
// ======================================

async function loadModel(){

    loadingText.innerText =
    "MoveNet を読み込んでいます...";

    await tf.setBackend("webgl");
    await tf.ready();

    detector =
    await poseDetection.createDetector(
        poseDetection.SupportedModels.MoveNet,
        MODEL_CONFIG
    );

    loadingText.innerText =
    "準備完了";
}



// ======================================
// 14. 全身が映っているか確認
// 必須部位が一定以上の精度で見えているか
// ======================================

function isFullBodyVisible(keypoints){

    const required = [
        5, 6,   // 肩
        11,12,  // 腰
        13,14,  // 膝
        15,16   // 足首
    ];

    return required.every(index => {
        return (
            keypoints[index] &&
            keypoints[index].score > 0.3
        );
    });
}



// ======================================
// 15. 初期表示
// ======================================

showScreen("setup");
updateTrainingUI();
updateResultUI();
warning.innerText = "";
// ======================================
// 集中力向上トレーニングアプリ
// app.js Part2
// 役割：
// 1. 記憶テスト前半
// 2. カウントダウン
// 3. 数字表示
// 4. 回答入力
// 5. 運動前採点
// ======================================



// ======================================
// 16. ランダム10桁生成
// ======================================

function generateMemoryDigits(){

    let result = "";

    for(let i = 0; i < 10; i++){
        result += Math.floor(Math.random() * 10);
    }

    return result;
}



// ======================================
// 17. 回答入力の整形
// 数字以外を除去し、10桁までに制限
// ======================================

function normalizeAnswerInput(value){

    if(!value) return "";

    return value
        .replace(/\D/g, "")
        .slice(0, 10);
}



// ======================================
// 18. 正解数を数える
// 位置まで一致した桁数を返す
// 例:
// 正解 1234567890
// 回答 1234067899
// -> 一致した位置の桁数を数える
// ======================================

function countCorrectDigits(answer, correct){

    const safeAnswer =
    String(answer || "");

    const safeCorrect =
    String(correct || "");

    let count = 0;

    for(let i = 0; i < 10; i++){

        const a = safeAnswer[i] || "";
        const c = safeCorrect[i] || "";

        if(a === c && a !== ""){
            count++;
        }
    }

    return count;
}



// ======================================
// 19. 正答率計算
// 10桁中何桁一致したか → %
// ======================================

function calcRate(correctCount){

    return Math.round((correctCount / 10) * 100);
}



// ======================================
// 20. 記憶テスト表示内容更新
// phase = "before" or "after"
// ======================================

function setMemoryPhaseUI(phase){

    memoryPhase = phase;

    if(phase === "before"){
        memoryPhaseLabel.innerText =
        "運動前 記憶テスト";

        answerPhaseLabel.innerText =
        "覚えた数字を入力してください";
    }
    else{
        memoryPhaseLabel.innerText =
        "運動後 記憶テスト";

        answerPhaseLabel.innerText =
        "もう一度、覚えた数字を入力してください";
    }
}



// ======================================
// 21. 10秒カウントダウン開始
// 終了後に数字表示へ進む
// ======================================

function startIntroCountdown(phase = "before"){

    clearAllTimers();

    setMemoryPhaseUI(phase);

    countdownTitle.innerText =
    "ランダムな数字を覚えてもらいます";

    let remain = 10;

    countdownNumber.innerText = remain;
    showScreen("countdown");

    countdownTimerId = setInterval(()=>{

        remain--;
        countdownNumber.innerText = remain;

        if(remain <= 0){

            clearInterval(countdownTimerId);
            countdownTimerId = null;

            startMemoryDisplay(phase);
        }

    }, 1000);
}



// ======================================
// 22. 記憶数字15秒表示
// before時は新しい10桁を生成
// after時は同じ数字を再利用
// ======================================

function startMemoryDisplay(phase = "before"){

    clearAllTimers();

    setMemoryPhaseUI(phase);

    if(phase === "before"){
        memoryDigits = generateMemoryDigits();
    }

    memoryNumber.innerText = memoryDigits;

    let remain = 15;
    memoryTimer.innerText = remain;

    showScreen("memory");

    memoryTimerId = setInterval(()=>{

        remain--;
        memoryTimer.innerText = remain;

        if(remain <= 0){

            clearInterval(memoryTimerId);
            memoryTimerId = null;

            openAnswerScreen(phase);
        }

    }, 1000);
}



// ======================================
// 23. 回答画面を開く
// phase に応じて前半/後半の回答画面を切替
// ======================================

function openAnswerScreen(phase = "before"){

    clearAllTimers();

    setMemoryPhaseUI(phase);

    memoryAnswerInput.value = "";

    if(phase === "before"){
        answerPhaseLabel.innerText =
        "覚えた数字を入力してください";
    }else{
        answerPhaseLabel.innerText =
        "もう一度、覚えた数字を入力してください";
    }

    showScreen("answer");

    setTimeout(()=>{
        memoryAnswerInput.focus();
    }, 80);
}



// ======================================
// 24. 回答確定
// giveUp = true なら途中でも送信
// ======================================

function submitMemoryAnswer(giveUp = false){

    const inputValue =
    normalizeAnswerInput(memoryAnswerInput.value);

    // ギブアップ時も入力途中の内容は残して採点対象にする
    const finalAnswer =
    giveUp ? inputValue : inputValue;

    if(memoryPhase === "before"){

        beforeAnswer = finalAnswer;

        beforeCorrectCount =
        countCorrectDigits(
            beforeAnswer,
            memoryDigits
        );

        beforeRate =
        calcRate(beforeCorrectCount);

        // 次はロード画面 → 運動開始
        beginTrainingPreparation();
    }
    else{

        afterAnswer = finalAnswer;

        afterCorrectCount =
        countCorrectDigits(
            afterAnswer,
            memoryDigits
        );

        afterRate =
        calcRate(afterCorrectCount);

        // Part4 で結果計算へ進む
        finishAfterMemoryTest();
    }
}



// ======================================
// 25. 入力欄のリアルタイム整形
// 数字以外を自動削除
// ======================================

memoryAnswerInput.addEventListener("input", ()=>{

    const fixed =
    normalizeAnswerInput(
        memoryAnswerInput.value
    );

    if(memoryAnswerInput.value !== fixed){
        memoryAnswerInput.value = fixed;
    }
});



// ======================================
// 26. 回答ボタン
// ======================================

submitAnswerBtn.addEventListener("click", ()=>{

    submitMemoryAnswer(false);
});



// ======================================
// 27. ギブアップボタン
// 空欄でもそのまま進める
// ======================================

giveUpBtn.addEventListener("click", ()=>{

    submitMemoryAnswer(true);
});



// ======================================
// 28. Enterキーで回答
// iPad外付けキーボードなどにも対応
// ======================================

memoryAnswerInput.addEventListener("keydown", (e)=>{

    if(e.key === "Enter"){
        e.preventDefault();
        submitMemoryAnswer(false);
    }
});



// ======================================
// 29. 開始ボタン
// 初期設定を読み込み、最初の記憶テストへ
// ======================================

startBtn.addEventListener("click", ()=>{

    loadUserSettings();
    resetAllState();

    startIntroCountdown("before");
});



// ======================================
// 30. リスタートボタン
// 結果画面から最初へ戻る
// ======================================

restartBtn.addEventListener("click", ()=>{

    resetAllState();
    showScreen("setup");
});



// ======================================
// 31. リセットボタン（運動画面用）
// ここでは運動回数だけ初期化
// 記憶テスト結果までは消さない
// ======================================

resetBtn.addEventListener("click", ()=>{

    squatCount = 0;
    jumpCount = 0;
    calories = 0;

    squatState = "UP";
    jumpState = false;
    jumpCooldown = 0;

    prevHipY = null;
    prevAnkleY = null;

    warning.innerText = "";

    updateTrainingUI();
});



// ======================================
// 32. ロード画面へ移る準備
// ここから先の本処理は Part3 で実装
// ======================================

async function beginTrainingPreparation(){

    showScreen("loading");
    loadingText.innerText =
    "運動測定の準備をしています...";

    try{

        // detector 未生成ならモデル読み込み
        if(!detector){
            await loadModel();
        }

        // カメラ映像が未接続なら初期化
        if(!video.srcObject){
            loadingText.innerText =
            "カメラを起動しています...";
            await setupCamera();
        }

        loadingText.innerText =
        "準備完了。運動を開始します。";

        // 少しだけ待ってから運動開始
        setTimeout(()=>{

            // Part3 で定義する関数
            startTrainingSession();

        }, 600);

    }
    catch(err){

        console.error(err);

        loadingText.innerText =
        "カメラまたはモデルの準備に失敗しました。";

        setTimeout(()=>{
            showScreen("setup");
            alert(
                "カメラまたはMoveNetの初期化に失敗しました。Safariのカメラ許可や通信状況を確認してください。"
            );
        }, 1200);
    }
}



// ======================================
// 33. Part4で使う仮の関数宣言メモ
// ここではまだ未定義でOK
// - startTrainingSession() : Part3
// - finishAfterMemoryTest() : Part4
// ======================================
// ======================================
// 集中力向上トレーニングアプリ
// app.js Part3
// 役割：
// 1. 運動開始
// 2. MoveNet推論ループ
// 3. 骨格描画
// 4. スクワット判定
// 5. ジャンプ判定
// 6. kcal計算
// 7. 20分終了 → 運動後記憶テストへ
// ======================================



// ======================================
// 34. 定数（判定しきい値）
// ======================================

// --- keypoint の最低信頼度 ---
const MIN_SCORE = 0.30;

// --- スクワット判定用膝角度 ---
// 立ち姿勢に戻った判定
const SQUAT_UP_ANGLE = 155;

// しゃがんだ判定
const SQUAT_DOWN_ANGLE = 105;

// --- ジャンプ判定しきい値 ---
// 正規化された腰上昇量（身長スケール比）
const JUMP_HIP_THRESHOLD = 0.055;

// 正規化された足首上昇量（身長スケール比）
const JUMP_ANKLE_THRESHOLD = 0.040;

// ジャンプ後のクールダウンフレーム数
const JUMP_COOLDOWN_FRAMES = 18;

// スクワット姿勢中はジャンプ判定しにくくする
const JUMP_BLOCK_KNEE_ANGLE = 120;


// ======================================
// 35. kcal加算量
// ※「毎秒0.1増える」ではなく
//   回数が増えた時だけ加算する
// ======================================

const KCAL_PER_SQUAT = 0.40;
const KCAL_PER_JUMP  = 0.80;



// ======================================
// 36. 2点間距離
// ======================================

function distance2D(a, b){

    const dx = a.x - b.x;
    const dy = a.y - b.y;

    return Math.sqrt(dx * dx + dy * dy);
}



// ======================================
// 37. 角度計算
// angle ABC（Bが頂点）を度で返す
// ======================================

function getAngleDeg(a, b, c){

    const abx = a.x - b.x;
    const aby = a.y - b.y;

    const cbx = c.x - b.x;
    const cby = c.y - b.y;

    const dot =
    abx * cbx + aby * cby;

    const mag1 =
    Math.sqrt(abx * abx + aby * aby);

    const mag2 =
    Math.sqrt(cbx * cbx + cby * cby);

    if(mag1 === 0 || mag2 === 0){
        return 180;
    }

    let cos =
    dot / (mag1 * mag2);

    // 誤差対策
    cos = Math.max(-1, Math.min(1, cos));

    return Math.acos(cos) * 180 / Math.PI;
}



// ======================================
// 38. 左右の膝角度平均
// 見える側だけでも計算可能にする
// ======================================

function getAverageKneeAngle(keypoints){

    const leftHip   = keypoints[11];
    const leftKnee  = keypoints[13];
    const leftAnkle = keypoints[15];

    const rightHip   = keypoints[12];
    const rightKnee  = keypoints[14];
    const rightAnkle = keypoints[16];

    const angles = [];

    if(
        leftHip && leftKnee && leftAnkle &&
        leftHip.score > MIN_SCORE &&
        leftKnee.score > MIN_SCORE &&
        leftAnkle.score > MIN_SCORE
    ){
        angles.push(
            getAngleDeg(leftHip, leftKnee, leftAnkle)
        );
    }

    if(
        rightHip && rightKnee && rightAnkle &&
        rightHip.score > MIN_SCORE &&
        rightKnee.score > MIN_SCORE &&
        rightAnkle.score > MIN_SCORE
    ){
        angles.push(
            getAngleDeg(rightHip, rightKnee, rightAnkle)
        );
    }

    if(angles.length === 0){
        return null;
    }

    const sum =
    angles.reduce((a,b)=>a+b,0);

    return sum / angles.length;
}



// ======================================
// 39. 身長スケール（正規化用）
// 肩〜足首くらいの長さを使って
// 人が画面内で近い/遠い影響を減らす
// ======================================

function getBodyScale(keypoints){

    const leftShoulder = keypoints[5];
    const rightShoulder = keypoints[6];
    const leftAnkle = keypoints[15];
    const rightAnkle = keypoints[16];

    let shoulderY = null;
    let ankleY = null;

    if(
        leftShoulder && rightShoulder &&
        leftShoulder.score > MIN_SCORE &&
        rightShoulder.score > MIN_SCORE
    ){
        shoulderY =
        (leftShoulder.y + rightShoulder.y) / 2;
    }
    else if(leftShoulder && leftShoulder.score > MIN_SCORE){
        shoulderY = leftShoulder.y;
    }
    else if(rightShoulder && rightShoulder.score > MIN_SCORE){
        shoulderY = rightShoulder.y;
    }

    if(
        leftAnkle && rightAnkle &&
        leftAnkle.score > MIN_SCORE &&
        rightAnkle.score > MIN_SCORE
    ){
        ankleY =
        (leftAnkle.y + rightAnkle.y) / 2;
    }
    else if(leftAnkle && leftAnkle.score > MIN_SCORE){
        ankleY = leftAnkle.y;
    }
    else if(rightAnkle && rightAnkle.score > MIN_SCORE){
        ankleY = rightAnkle.y;
    }

    if(shoulderY == null || ankleY == null){
        return null;
    }

    return Math.abs(ankleY - shoulderY);
}



// ======================================
// 40. 腰中心Y
// ======================================

function getHipCenterY(keypoints){

    const leftHip = keypoints[11];
    const rightHip = keypoints[12];

    if(
        leftHip && rightHip &&
        leftHip.score > MIN_SCORE &&
        rightHip.score > MIN_SCORE
    ){
        return (leftHip.y + rightHip.y) / 2;
    }

    if(leftHip && leftHip.score > MIN_SCORE){
        return leftHip.y;
    }

    if(rightHip && rightHip.score > MIN_SCORE){
        return rightHip.y;
    }

    return null;
}



// ======================================
// 41. 足首中心Y
// ======================================

function getAnkleCenterY(keypoints){

    const leftAnkle = keypoints[15];
    const rightAnkle = keypoints[16];

    if(
        leftAnkle && rightAnkle &&
        leftAnkle.score > MIN_SCORE &&
        rightAnkle.score > MIN_SCORE
    ){
        return (leftAnkle.y + rightAnkle.y) / 2;
    }

    if(leftAnkle && leftAnkle.score > MIN_SCORE){
        return leftAnkle.y;
    }

    if(rightAnkle && rightAnkle.score > MIN_SCORE){
        return rightAnkle.y;
    }

    return null;
}



// ======================================
// 42. スクワット判定
// 「しゃがむ」→「立つ」で1回
// ======================================

function judgeSquat(keypoints){

    const kneeAngle =
    getAverageKneeAngle(keypoints);

    if(kneeAngle == null){
        return;
    }

    // しゃがみ判定
    if(
        squatState === "UP" &&
        kneeAngle <= SQUAT_DOWN_ANGLE
    ){
        squatState = "DOWN";
        return;
    }

    // 立ち上がり判定
    if(
        squatState === "DOWN" &&
        kneeAngle >= SQUAT_UP_ANGLE
    ){
        squatState = "UP";
        squatCount++;
        calories += KCAL_PER_SQUAT;
        updateTrainingUI();
    }
}



// ======================================
// 43. ジャンプ判定
// 腰・足首が前フレームより上がったかを見る
//
// ポイント:
// - 身長スケールで正規化
// - 膝が深く曲がっている最中は判定しにくくする
// - クールダウンを入れる
// ======================================

function judgeJump(keypoints){

    if(jumpCooldown > 0){
        jumpCooldown--;
    }

    const bodyScale =
    getBodyScale(keypoints);

    const hipY =
    getHipCenterY(keypoints);

    const ankleY =
    getAnkleCenterY(keypoints);

    const kneeAngle =
    getAverageKneeAngle(keypoints);

    if(
        bodyScale == null ||
        hipY == null ||
        ankleY == null
    ){
        prevHipY = hipY;
        prevAnkleY = ankleY;
        return;
    }

    // 初回フレーム
    if(prevHipY == null || prevAnkleY == null){
        prevHipY = hipY;
        prevAnkleY = ankleY;
        return;
    }

    // Y座標は上に行くほど小さくなるので、
    // 「前回 - 今回」が正なら上昇したことになる
    const hipRise =
    (prevHipY - hipY) / bodyScale;

    const ankleRise =
    (prevAnkleY - ankleY) / bodyScale;

    // 深いスクワット中はジャンプ判定を抑制
    const squatLike =
    kneeAngle != null &&
    kneeAngle < JUMP_BLOCK_KNEE_ANGLE;

    const jumpDetected =
        hipRise > JUMP_HIP_THRESHOLD &&
        ankleRise > JUMP_ANKLE_THRESHOLD &&
        !squatLike &&
        jumpCooldown <= 0;

    if(jumpDetected){
        jumpCount++;
        calories += KCAL_PER_JUMP;
        jumpCooldown = JUMP_COOLDOWN_FRAMES;
        updateTrainingUI();
    }

    prevHipY = hipY;
    prevAnkleY = ankleY;
}



// ======================================
// 44. 点描画
// ======================================

function drawPoint(x, y, r = 5){

    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
}



// ======================================
// 45. 線描画
// ======================================

function drawLine(x1, y1, x2, y2){

    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
}



// ======================================
// 46. 骨格描画
// 重要:
// 「カメラ映像だけ左右反転、骨格は人物に正しく重なる」
// ため、座標変換をそろえて描画する
//
// 今回は canvas 全体を左右反転してから
// 映像も骨格も同じ座標系で描く方式にする
// → 人物にぴったり重なりやすい
// ======================================

function drawPoseFrame(keypoints){

    const w = canvas.width;
    const h = canvas.height;

    // 画面クリア
    ctx.clearRect(0, 0, w, h);

    // ----------------------------------
    // 1. 左右反転してカメラ映像を描画
    // ----------------------------------
    ctx.save();
    ctx.translate(w, 0);
    ctx.scale(-1, 1);

    ctx.drawImage(video, 0, 0, w, h);

    // ----------------------------------
    // 2. 骨格線
    // ----------------------------------
    ctx.lineWidth = 4;
    ctx.strokeStyle = "rgba(0,255,180,0.95)";
    ctx.fillStyle = "rgba(255,255,0,0.95)";

    for(const [i1, i2] of SKELETON){

        const p1 = keypoints[i1];
        const p2 = keypoints[i2];

        if(
            !p1 || !p2 ||
            p1.score < MIN_SCORE ||
            p2.score < MIN_SCORE
        ){
            continue;
        }

        drawLine(p1.x, p1.y, p2.x, p2.y);
    }

    // ----------------------------------
    // 3. 関節点
    // ----------------------------------
    for(const p of keypoints){

        if(!p || p.score < MIN_SCORE){
            continue;
        }

        drawPoint(p.x, p.y, 5);
    }

    ctx.restore();
}



// ======================================
// 47. 警告表示更新
// ======================================

function updateBodyWarning(keypoints){

    if(!keypoints || keypoints.length === 0){
        warning.innerText =
        "姿勢を検出できません。全身が映る位置に立ってください。";
        return;
    }

    if(!isFullBodyVisible(keypoints)){
        warning.innerText =
        "全身が画面に入るように立ってください。";
        return;
    }

    warning.innerText = "";
}



// ======================================
// 48. 推論1フレーム処理
// ======================================

async function detectLoop(){

    if(!running || !detector){
        return;
    }

    try{

        const poses =
        await detector.estimatePoses(video, {
            flipHorizontal: false
        });

        if(!running){
            return;
        }

        if(poses && poses.length > 0){

            const keypoints =
            poses[0].keypoints;

            updateBodyWarning(keypoints);

            drawPoseFrame(keypoints);

            if(isFullBodyVisible(keypoints)){

                judgeSquat(keypoints);
                judgeJump(keypoints);
            }
        }
        else{
            warning.innerText =
            "姿勢を検出できません。全身が映る位置に立ってください。";

            ctx.clearRect(0, 0, canvas.width, canvas.height);

            ctx.save();
            ctx.translate(canvas.width, 0);
            ctx.scale(-1, 1);
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            ctx.restore();
        }

        updateFPS();
    }
    catch(err){
        console.error("detectLoop error:", err);
    }

    if(running){
        requestAnimationFrame(detectLoop);
    }
}



// ======================================
// 49. 運動開始
// Part2 の beginTrainingPreparation() から呼ばれる
// ======================================

function startTrainingSession(){

    resetTrainingState();

    running = true;
    trainingFinished = false;

    updateTrainingUI();
    showScreen("training");

    // 20分後に終了
    trainingTimerId = setTimeout(()=>{
        finishTrainingSession();
    }, TRAINING_TIME_MS);

    // 推論開始
    requestAnimationFrame(detectLoop);
}



// ======================================
// 50. 運動終了
// → 運動後の記憶テストへ
// ======================================

function finishTrainingSession(){

    if(trainingFinished){
        return;
    }

    trainingFinished = true;
    running = false;

    clearAllTimers();

    // 少しだけ見た目を落ち着かせる
    warning.innerText = "運動終了です。次は記憶テストです。";

    setTimeout(()=>{
        startIntroCountdown("after");
    }, 900);
}
// ======================================
// 集中力向上トレーニングアプリ
// app.js Part4
// 役割：
// 1. 運動後記憶テストの採点完了
// 2. 向上率計算
// 3. 結果画面表示
// 4. 後片付け
// ======================================



// ======================================
// 51. 向上率を計算
// 今回は「正答率の差」をそのまま使う
//
// 例:
// beforeRate = 40
// afterRate  = 70
// improveRate = +30
//
// ※もし「40→80 は 2倍だから +100%」
//   のような相対増加率にしたいなら
//   別式に変えられる
// ======================================

function calculateImproveRate(){

    improveRate =
    afterRate - beforeRate;
}



// ======================================
// 52. 運動後テスト終了処理
// Part2 の submitMemoryAnswer() から呼ばれる
// ======================================

function finishAfterMemoryTest(){

    clearAllTimers();
    running = false;

    calculateImproveRate();
    updateResultUI();
    showScreen("result");
}



// ======================================
// 53. カメラ停止
// 「最初からやり直す」時に毎回
// カメラを止めたい場合に使える
//
// 今回は UX 的に再スタートが早いよう
// デフォルトでは停止しなくてもOK。
// ただし完全に終了したい時用に残す。
// ======================================

function stopCameraStream(){

    if(!video || !video.srcObject){
        return;
    }

    const tracks =
    video.srcObject.getTracks();

    tracks.forEach(track => {
        try{
            track.stop();
        }catch(err){
            console.warn(err);
        }
    });

    video.srcObject = null;
}



// ======================================
// 54. 完全初期化
// 必要に応じて「全部最初から」に戻す
// ======================================

function hardResetApp(stopCamera = false){

    clearAllTimers();

    running = false;
    trainingFinished = false;

    resetMemoryState();
    resetTrainingState();

    if(stopCamera){
        stopCameraStream();
    }

    updateTrainingUI();
    updateResultUI();
    showScreen("setup");
}



// ======================================
// 55. 結果画面の補助表示を整える
// improveRate の表示が見やすくなるように
// 必要なら文言をここで追加できる
// ======================================

function getImproveComment(){

    if(improveRate >= 40){
        return "とても大きく向上しました";
    }

    if(improveRate >= 20){
        return "記憶成績が向上しました";
    }

    if(improveRate >= 1){
        return "少し向上しました";
    }

    if(improveRate === 0){
        return "運動前後で同じ成績でした";
    }

    return "今回は運動後の成績が下がりました";
}



// ======================================
// 56. 結果画面更新を上書き拡張
// Part1 の updateResultUI() はそのままでも動くが、
// コメント表示欄を追加したい場合に備えて
// 拡張版も用意しておく
//
// ※ index.html に resultComment がない場合でも
//   エラーにならないよう安全に書く
// ======================================

const resultComment =
document.getElementById("resultComment");

const correctDigitsBeforeAnswerText =
document.getElementById("correctDigitsBeforeAnswer");

const correctDigitsAfterAnswerText =
document.getElementById("correctDigitsAfterAnswer");

const beforeUserAnswerText =
document.getElementById("beforeUserAnswer");

const afterUserAnswerText =
document.getElementById("afterUserAnswer");

const correctDigitsText =
document.getElementById("correctDigitsText");

function updateResultUIExtended(){

    updateResultUI();

    if(resultComment){
        resultComment.innerText =
        getImproveComment();
    }

    // 正解数字そのものを表示したい場合
    if(correctDigitsText){
        correctDigitsText.innerText = memoryDigits || "-";
    }

    // 運動前の自分の回答
    if(beforeUserAnswerText){
        beforeUserAnswerText.innerText =
        beforeAnswer ? beforeAnswer : "（未入力）";
    }

    // 運動後の自分の回答
    if(afterUserAnswerText){
        afterUserAnswerText.innerText =
        afterAnswer ? afterAnswer : "（未入力）";
    }

    // 運動前に何桁合っていたか
    if(correctDigitsBeforeAnswerText){
        correctDigitsBeforeAnswerText.innerText =
        `${beforeCorrectCount} / 10`;
    }

    // 運動後に何桁合っていたか
    if(correctDigitsAfterAnswerText){
        correctDigitsAfterAnswerText.innerText =
        `${afterCorrectCount} / 10`;
    }
}



// ======================================
// 57. finishAfterMemoryTest を拡張版へ差し替え
// すでに上で finishAfterMemoryTest を定義したが、
// こちらの最終版を使う
// ======================================

function finishAfterMemoryTest(){

    clearAllTimers();
    running = false;
    trainingFinished = true;

    calculateImproveRate();
    updateResultUIExtended();
    showScreen("result");
}



// ======================================
// 58. リスタートボタンの動作を強化
// すでに Part2 でイベントを付けているので、
// ここでは追加の安全策として上書きする
// ======================================

restartBtn.onclick = () => {

    hardResetApp(false);
};



// ======================================
// 59. ページを離れる時の後片付け
// Safari / iPad でカメラが残るのを防ぎやすい
// ======================================

window.addEventListener("beforeunload", ()=>{

    try{
        clearAllTimers();
        running = false;
        stopCameraStream();
    }catch(err){
        console.warn(err);
    }
});



// ======================================
// 60. 開発確認用の補助関数
// コンソールから呼びたい時に便利
// ======================================

// すぐ運動後テストへ飛ぶ
window.debugGoAfterTest = function(){

    running = false;
    clearAllTimers();
    startIntroCountdown("after");
};

// 結果画面へ直接飛ぶ
window.debugShowResult = function(){

    beforeCorrectCount = 4;
    beforeRate = 40;

    afterCorrectCount = 7;
    afterRate = 70;

    improveRate = 30;

    squatCount = 12;
    jumpCount = 8;
    calories = 11.2;

    memoryDigits = "1234567890";
    beforeAnswer = "1234067000";
    afterAnswer = "1234567899";

    updateResultUIExtended();
    showScreen("result");
};

// 最初へ戻る
window.debugResetApp = function(){

    hardResetApp(false);
};



// ======================================
// 61. もし結果画面にコメント欄などを
// 追加したくなった時のためのメモ
//
// 例: index.html 側に以下を追加すると使える
//
// <div class="resultRow">
//   <span>正解数字</span>
//   <span id="correctDigitsText">-</span>
// </div>
//
// <div class="resultRow">
//   <span>運動前の回答</span>
//   <span id="beforeUserAnswer">-</span>
// </div>
//
// <div class="resultRow">
//   <span>運動後の回答</span>
//   <span id="afterUserAnswer">-</span>
// </div>
//
// <p id="resultComment"></p>
//
// 追加しなくても今のコードは動くようにしてある。
// ======================================