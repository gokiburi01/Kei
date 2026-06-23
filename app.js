// ======================================
// 集中力向上トレーニングアプリ
// app.js Part1
// 役割：
// 1. 定数
// 2. DOM取得
// 3. 状態変数
// 4. 画面切り替え
// 5. 共通UI更新
// ======================================



// ======================================
// 1. 定数
// ======================================

// 記憶テスト前カウントダウン秒数
const INTRO_COUNTDOWN_SEC = 10;

// 数字を表示して覚えてもらう秒数
const MEMORY_SHOW_SEC = 15;

// 運動時間（20分）
// ※ 動作確認時だけ 30 * 1000 などに変更すると楽
const TRAINING_TIME_MS = 20 * 60 * 1000;

// 記憶数字の桁数
const MEMORY_DIGITS_LENGTH = 10;

// カメラ設定
const CAMERA_WIDTH = 1280;
const CAMERA_HEIGHT = 720;

// MoveNetモデル設定
const MOVENET_MODEL = poseDetection.SupportedModels.MoveNet;
const MOVENET_CONFIG = {
    modelType: poseDetection.movenet.modelType.SINGLEPOSE_LIGHTNING
};

// スケルトン接続定義
// MoveNet keypoints の index を結ぶ
const SKELETON = [
    [5, 7], [7, 9],      // 左肩-左肘-左手首
    [6, 8], [8, 10],     // 右肩-右肘-右手首
    [5, 6],              // 肩同士
    [5, 11], [6, 12],    // 肩-腰
    [11, 12],            // 腰同士
    [11, 13], [13, 15],  // 左腰-左膝-左足首
    [12, 14], [14, 16]   // 右腰-右膝-右足首
];



// ======================================
// 2. DOM取得
// ======================================

// ---------- setup ----------
const setupScreen = document.getElementById("setupScreen");
const heightInput = document.getElementById("heightInput");
const weightInput = document.getElementById("weightInput");
const genderInput = document.getElementById("genderInput");
const ageGroup = document.getElementById("ageGroup");
const startBtn = document.getElementById("startBtn");

// ---------- loading ----------
const loadingScreen = document.getElementById("loadingScreen");
const loadingText = document.getElementById("loadingText");

// ---------- countdown ----------
const countdownScreen = document.getElementById("countdownScreen");
const countdownNumber = document.getElementById("countdownNumber");
const countdownMessage = document.getElementById("countdownMessage");

// ---------- memory show ----------
const memoryScreen = document.getElementById("memoryScreen");
const memoryDigitsText = document.getElementById("memoryDigitsText");
const memoryTimerText = document.getElementById("memoryTimerText");

// ---------- answer ----------
const answerScreen = document.getElementById("answerScreen");
const answerTitle = document.getElementById("answerTitle");
const memoryAnswerInput = document.getElementById("memoryAnswerInput");
const submitAnswerBtn = document.getElementById("submitAnswerBtn");
const giveUpBtn = document.getElementById("giveUpBtn");

// ---------- before memory result（追加部分） ----------
const beforeMemoryResultScreen =
document.getElementById("beforeMemoryResultScreen");

const beforeMemoryResultRate =
document.getElementById("beforeMemoryResultRate");

const beforeMemoryResultCorrect =
document.getElementById("beforeMemoryResultCorrect");

const startTrainingFromMemoryResultBtn =
document.getElementById("startTrainingFromMemoryResultBtn");

// ---------- training ----------
const trainingScreen = document.getElementById("trainingScreen");
const safetyMessage = document.getElementById("safetyMessage");
const warning = document.getElementById("warning");

const sq = document.getElementById("sq");
const jp = document.getElementById("jp");
const kcal = document.getElementById("kcal");

const fpsValue = document.getElementById("fpsValue");
const resetBtn = document.getElementById("resetBtn");

const video = document.getElementById("video");
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

// ---------- result ----------
const resultScreen = document.getElementById("resultScreen");

const beforeCorrect = document.getElementById("beforeCorrect");
const beforeRateText = document.getElementById("beforeRate");
const afterCorrect = document.getElementById("afterCorrect");
const afterRateText = document.getElementById("afterRate");
const improveRateText = document.getElementById("improveRate");

const resultSquat = document.getElementById("resultSquat");
const resultJump = document.getElementById("resultJump");
const resultKcal = document.getElementById("resultKcal");

const restartBtn = document.getElementById("restartBtn");



// ======================================
// 3. ユーザー入力情報
// ======================================

let userHeight = 170;
let userWeight = 60;
let userGender = "male";
let userAgeGroup = "10-20";



// ======================================
// 4. 記憶テスト関連の状態
// ======================================

// before / after
// "before" = 運動前
// "after"  = 運動後
let memoryPhase = "before";

// 表示する10桁数字
let memoryDigits = "";

// ユーザー回答
let beforeAnswer = "";
let afterAnswer = "";

// 正解数
let beforeCorrectCount = 0;
let afterCorrectCount = 0;

// 正答率（0〜100）
let beforeRate = 0;
let afterRate = 0;

// 向上率
let improveRate = 0;



// ======================================
// 5. 運動関連の状態
// ======================================

// カメラ / モデル
let detector = null;
let stream = null;

// 推論ループ中かどうか
let running = false;

// 20分終了済みか
let trainingFinished = false;

// 運動結果
let squatCount = 0;
let jumpCount = 0;
let calories = 0;

// スクワット状態
// "UP" / "DOWN"
let squatState = "UP";

// ジャンプ判定用
let prevHipY = null;
let prevAnkleY = null;
let jumpCooldown = 0;



// ======================================
// 6. タイマー管理
// ======================================

let introCountdownTimerId = null;
let memoryShowTimerId = null;
let trainingTimerId = null;

// FPS計測
let lastFpsTime = performance.now();
let fpsFrameCount = 0;
let currentFps = 0;



// ======================================
// 7. 全画面を hidden にしてから
// 必要な画面だけ表示する
// ======================================

function hideAllScreens(){

    // setup
    if(setupScreen){
        setupScreen.classList.add("hidden");
    }

    // loading
    if(loadingScreen){
        loadingScreen.classList.add("hidden");
    }

    // countdown
    if(countdownScreen){
        countdownScreen.classList.add("hidden");
    }

    // memory
    if(memoryScreen){
        memoryScreen.classList.add("hidden");
    }

    // answer
    if(answerScreen){
        answerScreen.classList.add("hidden");
    }

    // ★ 運動前記憶テスト結果
    if(beforeMemoryResultScreen){
        beforeMemoryResultScreen.classList.add("hidden");
    }

    // training
    if(trainingScreen){
        trainingScreen.classList.add("hidden");
    }

    // result
    if(resultScreen){
        resultScreen.classList.add("hidden");
    }
}



// ======================================
// 8. 画面切り替え
//
// name に入る値：
// "setup"
// "loading"
// "countdown"
// "memory"
// "answer"
// "beforeMemoryResult"
// "training"
// "result"
// ======================================

function showScreen(name){

    hideAllScreens();

    if(name === "setup"){
        setupScreen.classList.remove("hidden");
    }
    else if(name === "loading"){
        loadingScreen.classList.remove("hidden");
    }
    else if(name === "countdown"){
        countdownScreen.classList.remove("hidden");
    }
    else if(name === "memory"){
        memoryScreen.classList.remove("hidden");
    }
    else if(name === "answer"){
        answerScreen.classList.remove("hidden");
    }
    else if(name === "beforeMemoryResult"){
        beforeMemoryResultScreen.classList.remove("hidden");
    }
    else if(name === "training"){
        trainingScreen.classList.remove("hidden");
    }
    else if(name === "result"){
        resultScreen.classList.remove("hidden");
    }
}



// ======================================
// 9. 10桁のランダム数字を作る
// 例: 5831049276
// ======================================

function generateRandomDigits(length = MEMORY_DIGITS_LENGTH){

    let result = "";

    for(let i = 0; i < length; i++){
        result += Math.floor(Math.random() * 10);
    }

    return result;
}



// ======================================
// 10. 回答文字列を整形
// ・空白削除
// ・数字以外を除去
// ======================================

function normalizeAnswer(text){

    if(!text){
        return "";
    }

    return String(text)
        .replace(/\s+/g, "")
        .replace(/[^0-9]/g, "");
}



// ======================================
// 11. 正解数を数える
//
// 例:
// 正解 1234567890
// 回答 1234067000
//
// 同じ位置の数字が一致した数を数える
// ======================================

function countCorrectDigits(answer, correct){

    const a = normalizeAnswer(answer);
    const c = normalizeAnswer(correct);

    const len = Math.min(a.length, c.length);

    let count = 0;

    for(let i = 0; i < len; i++){
        if(a[i] === c[i]){
            count++;
        }
    }

    return count;
}



// ======================================
// 12. 正答率を計算
// 10桁中 7桁なら 70
// ======================================

function calcRate(correctCount){

    return Math.round(
        (correctCount / MEMORY_DIGITS_LENGTH) * 100
    );
}



// ======================================
// 13. タイマーを全部止める
// ======================================

function clearAllTimers(){

    if(introCountdownTimerId){
        clearInterval(introCountdownTimerId);
        introCountdownTimerId = null;
    }

    if(memoryShowTimerId){
        clearInterval(memoryShowTimerId);
        memoryShowTimerId = null;
    }

    if(trainingTimerId){
        clearTimeout(trainingTimerId);
        trainingTimerId = null;
    }
}



// ======================================
// 14. 記憶テスト状態をリセット
// ======================================

function resetMemoryState(){

    memoryPhase = "before";
    memoryDigits = "";

    beforeAnswer = "";
    afterAnswer = "";

    beforeCorrectCount = 0;
    afterCorrectCount = 0;

    beforeRate = 0;
    afterRate = 0;
    improveRate = 0;
}



// ======================================
// 15. 運動状態をリセット
// ======================================

function resetTrainingState(){

    running = false;
    trainingFinished = false;

    squatCount = 0;
    jumpCount = 0;
    calories = 0;

    squatState = "UP";

    prevHipY = null;
    prevAnkleY = null;
    jumpCooldown = 0;

    if(warning){
        warning.innerText = "";
    }

    updateTrainingUI();
}



// ======================================
// 16. setup入力値を読み込む
// ======================================

function readUserProfile(){

    userHeight = Number(heightInput.value) || 170;
    userWeight = Number(weightInput.value) || 60;
    userGender = genderInput.value || "male";
    userAgeGroup = ageGroup.value || "10-20";
}



// ======================================
// 17. 運動画面UI更新
// ======================================

function updateTrainingUI(){

    if(sq){
        sq.innerText = squatCount;
    }

    if(jp){
        jp.innerText = jumpCount;
    }

    if(kcal){
        kcal.innerText = calories.toFixed(1);
    }
}



// ======================================
// 18. 結果画面UI更新
// ======================================

function updateResultUI(){

    if(beforeCorrect){
        beforeCorrect.innerText =
        `${beforeCorrectCount} / ${MEMORY_DIGITS_LENGTH}`;
    }

    if(beforeRateText){
        beforeRateText.innerText = `${beforeRate}%`;
    }

    if(afterCorrect){
        afterCorrect.innerText =
        `${afterCorrectCount} / ${MEMORY_DIGITS_LENGTH}`;
    }

    if(afterRateText){
        afterRateText.innerText = `${afterRate}%`;
    }

    if(improveRateText){
        const sign = improveRate > 0 ? "+" : "";
        improveRateText.innerText = `${sign}${improveRate}%`;
    }

    if(resultSquat){
        resultSquat.innerText = squatCount;
    }

    if(resultJump){
        resultJump.innerText = jumpCount;
    }

    if(resultKcal){
        resultKcal.innerText = calories.toFixed(1);
    }
}



// ======================================
// 19. FPS表示更新
// ======================================

function updateFPS(){

    fpsFrameCount++;

    const now = performance.now();
    const elapsed = now - lastFpsTime;

    if(elapsed >= 1000){
        currentFps = Math.round(
            (fpsFrameCount * 1000) / elapsed
        );

        if(fpsValue){
            fpsValue.innerText = currentFps;
        }

        fpsFrameCount = 0;
        lastFpsTime = now;
    }
}



// ======================================
// 20. 全身が映っているかの簡易判定
//
// 主に見る点：
// 鼻 / 両肩 / 両腰 / 両膝 / 両足首
// ======================================

function isFullBodyVisible(keypoints){

    if(!keypoints || keypoints.length < 17){
        return false;
    }

    const requiredIndexes = [
        0,   // nose
        5, 6, // shoulders
        11, 12, // hips
        13, 14, // knees
        15, 16  // ankles
    ];

    for(const idx of requiredIndexes){

        const p = keypoints[idx];

        if(!p || p.score < 0.25){
            return false;
        }
    }

    return true;
}



// ======================================
// 21. 初期表示
// ======================================

showScreen("setup");
updateTrainingUI();
updateResultUI();
// ======================================
// 集中力向上トレーニングアプリ
// app.js Part2
// 役割：
// 1. スタート処理
// 2. 記憶テスト（運動前 / 運動後）
// 3. 運動前テスト結果表示
// 4. カメラ・モデル準備
// ======================================



// ======================================
// 22. 最初の開始ボタン
// setup入力後、運動前記憶テストへ進む
// ======================================

function startAppFlow(){

    // 入力値を保存
    readUserProfile();

    // 状態初期化
    clearAllTimers();
    resetMemoryState();
    resetTrainingState();

    // 運動前フェーズに設定
    memoryPhase = "before";

    // 運動前テスト用の数字を生成
    memoryDigits = generateRandomDigits(MEMORY_DIGITS_LENGTH);

    // 最初のカウントダウン開始
    startIntroCountdown("before");
}



// ======================================
// 23. 記憶テスト前の10秒カウントダウン開始
//
// phase:
// "before" -> 運動前テスト
// "after"  -> 運動後テスト
// ======================================

function startIntroCountdown(phase){

    clearAllTimers();

    memoryPhase = phase;

    showScreen("countdown");

    // 表示メッセージ
    if(countdownMessage){
        countdownMessage.innerText =
        "ランダムな数字を覚えてもらいます";
    }

    let remain = INTRO_COUNTDOWN_SEC;

    if(countdownNumber){
        countdownNumber.innerText = remain;
    }

    introCountdownTimerId = setInterval(()=>{

        remain--;

        if(countdownNumber){
            countdownNumber.innerText = remain;
        }

        if(remain <= 0){
            clearInterval(introCountdownTimerId);
            introCountdownTimerId = null;

            startMemoryShow();
        }

    }, 1000);
}



// ======================================
// 24. 10桁数字を表示して覚えてもらう
// 15秒後に自動で非表示 → 回答画面へ
// ======================================

function startMemoryShow(){

    showScreen("memory");

    // 表示する数字
    if(memoryDigitsText){
        memoryDigitsText.innerText = memoryDigits;
    }

    let remain = MEMORY_SHOW_SEC;

    if(memoryTimerText){
        memoryTimerText.innerText = `残り ${remain} 秒`;
    }

    memoryShowTimerId = setInterval(()=>{

        remain--;

        if(memoryTimerText){
            memoryTimerText.innerText = `残り ${remain} 秒`;
        }

        if(remain <= 0){
            clearInterval(memoryShowTimerId);
            memoryShowTimerId = null;

            showAnswerScreen();
        }

    }, 1000);
}



// ======================================
// 25. 回答画面を表示
// 運動前か運動後かでタイトルを変える
// ======================================

function showAnswerScreen(){

    showScreen("answer");

    if(memoryPhase === "before"){
        if(answerTitle){
            answerTitle.innerText =
            "先ほどの10桁の数字を入力してください";
        }
    }
    else{
        if(answerTitle){
            answerTitle.innerText =
            "もう一度、先ほどの10桁の数字を入力してください";
        }
    }

    if(memoryAnswerInput){
        memoryAnswerInput.value = "";
        memoryAnswerInput.focus();
    }
}



// ======================================
// 26. 回答送信
//
// giveUp = true ならギブアップ扱い
// → 空文字として採点する
//
// 重要：
// 運動前は「結果画面をいったん表示」
// 運動後は「最終結果画面」へ進む
// ======================================

function submitMemoryAnswer(giveUp = false){

    let finalAnswer = "";

    if(!giveUp && memoryAnswerInput){
        finalAnswer = normalizeAnswer(memoryAnswerInput.value);
    }

    // ------------------------------
    // 運動前テスト
    // ------------------------------
    if(memoryPhase === "before"){

        beforeAnswer = finalAnswer;

        beforeCorrectCount =
        countCorrectDigits(
            beforeAnswer,
            memoryDigits
        );

        beforeRate =
        calcRate(beforeCorrectCount);

        // ★ここが今回の追加仕様
        // すぐ運動開始ではなく、
        // いったん結果を表示する
        showBeforeMemoryResult();
        return;
    }

    // ------------------------------
    // 運動後テスト
    // ------------------------------
    if(memoryPhase === "after"){

        afterAnswer = finalAnswer;

        afterCorrectCount =
        countCorrectDigits(
            afterAnswer,
            memoryDigits
        );

        afterRate =
        calcRate(afterCorrectCount);

        // 最終結果画面へ
        finishAfterMemoryTest();
    }
}



// ======================================
// 27. 運動前記憶テストの結果画面を表示
//
// 例:
// あなたは 70% 覚えることができました
// 正解数 7 / 10
// ======================================

function showBeforeMemoryResult(){

    if(beforeMemoryResultRate){
        beforeMemoryResultRate.innerText = beforeRate;
    }

    if(beforeMemoryResultCorrect){
        beforeMemoryResultCorrect.innerText =
        beforeCorrectCount;
    }

    showScreen("beforeMemoryResult");
}



// ======================================
// 28. 運動開始準備
// 運動前テスト結果画面の「運動を開始する」ボタンから呼ぶ
//
// 流れ：
// loading表示 → カメラ準備 → MoveNet準備 → 運動開始
// ======================================

async function beginTrainingPreparation(){

    showScreen("loading");

    if(loadingText){
        loadingText.innerText = "カメラを起動しています...";
    }

    try{
        await setupCamera();

        if(loadingText){
            loadingText.innerText = "姿勢推定モデルを読み込んでいます...";
        }

        await setupDetector();

        if(loadingText){
            loadingText.innerText = "準備完了。運動を開始します";
        }

        // 少しだけ待ってから開始
        setTimeout(()=>{
            startTrainingSession();
        }, 500);

    }catch(err){
        console.error(err);
        alert("カメラまたはモデルの準備に失敗しました。ページを再読み込みしてもう一度お試しください。");
        showScreen("setup");
    }
}



// ======================================
// 29. カメラ準備
// iPad / Safari でも動きやすいように
// playsinline 前提
// ======================================

async function setupCamera(){

    // すでに起動済みなら再利用
    if(video.srcObject){
        stream = video.srcObject;

        // canvasサイズも合わせる
        syncCanvasToVideo();
        return;
    }

    const constraints = {
        audio: false,
        video: {
            facingMode: "user",
            width: { ideal: CAMERA_WIDTH },
            height: { ideal: CAMERA_HEIGHT }
        }
    };

    stream = await navigator.mediaDevices.getUserMedia(constraints);
    video.srcObject = stream;

    await new Promise((resolve)=>{

        video.onloadedmetadata = ()=>{
            video.play().then(()=>{
                syncCanvasToVideo();
                resolve();
            }).catch(()=>{
                syncCanvasToVideo();
                resolve();
            });
        };
    });
}



// ======================================
// 30. detector準備
// TensorFlow backend → MoveNet detector
// ======================================

async function setupDetector(){

    if(detector){
        return;
    }

    await tf.setBackend("webgl");
    await tf.ready();

    detector =
    await poseDetection.createDetector(
        MOVENET_MODEL,
        MOVENET_CONFIG
    );
}



// ======================================
// 31. canvasサイズをvideoに合わせる
// 骨格が人物に重なりやすくなる
// ======================================

function syncCanvasToVideo(){

    const w = video.videoWidth || CAMERA_WIDTH;
    const h = video.videoHeight || CAMERA_HEIGHT;

    canvas.width = w;
    canvas.height = h;
}



// ======================================
// 32. リセットボタン
// 運動中でも最初の設定画面に戻せる
//
// 今回は「カメラはそのまま」でもよいが、
// 状態はリセットする
// ======================================

function resetToSetupFromTraining(){

    clearAllTimers();

    running = false;
    trainingFinished = false;

    resetMemoryState();
    resetTrainingState();

    showScreen("setup");
}



// ======================================
// 33. イベント登録
// ======================================

// 最初の開始ボタン
if(startBtn){
    startBtn.addEventListener("click", ()=>{
        startAppFlow();
    });
}

// 回答送信
if(submitAnswerBtn){
    submitAnswerBtn.addEventListener("click", ()=>{
        submitMemoryAnswer(false);
    });
}

// ギブアップ
if(giveUpBtn){
    giveUpBtn.addEventListener("click", ()=>{
        submitMemoryAnswer(true);
    });
}

// Enterキーで回答送信
if(memoryAnswerInput){
    memoryAnswerInput.addEventListener("keydown", (e)=>{
        if(e.key === "Enter"){
            submitMemoryAnswer(false);
        }
    });
}

// ★運動前テスト結果画面 → 運動開始
if(startTrainingFromMemoryResultBtn){
    startTrainingFromMemoryResultBtn.addEventListener("click", ()=>{
        beginTrainingPreparation();
    });
}

// 運動画面のリセット
if(resetBtn){
    resetBtn.addEventListener("click", ()=>{
        resetToSetupFromTraining();
    });
}
