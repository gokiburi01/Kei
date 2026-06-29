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
const MEMORY_DIGITS_LENGTH = 20;

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
// ======================================
// 集中力向上トレーニングアプリ
// app.js Part3
// 役割：
// 1. 運動セッション開始
// 2. MoveNet 推論ループ
// 3. スクワット判定
// 4. ジャンプ判定
// 5. 骨格描画
// 6. kcal更新
// 7. 運動終了 → 運動後記憶テストへ
// ======================================



// ======================================
// 34. 運動判定用しきい値
// ======================================

// スクワット膝角度しきい値
// 角度が小さいほど深くしゃがんでいる
const SQUAT_DOWN_ANGLE = 105;  // これ未満で「しゃがんだ」
const SQUAT_UP_ANGLE   = 155;  // これ以上で「立った」

// ジャンプ判定しきい値
// 値は「画面高さに対する割合」なので環境差に強い
const JUMP_HIP_THRESHOLD   = 0.055;
const JUMP_ANKLE_THRESHOLD = 0.040;

// ジャンプ後、数フレームは再判定しない
const JUMP_COOLDOWN_FRAMES = 12;

// 消費カロリー係数
// 1回ごとに増やす方式にする
// ※ 毎秒増え続けるバグを防ぐため、時間ではなく回数加算
const KCAL_PER_SQUAT = 0.32;
const KCAL_PER_JUMP  = 0.45;



// ======================================
// 35. 運動セッション開始
// - 運動画面表示
// - 20分タイマー開始
// - 推論ループ開始
// ======================================

function startTrainingSession(){

    showScreen("training");

    running = true;
    trainingFinished = false;

    // 運動終了タイマー（20分）
    trainingTimerId = setTimeout(()=>{
        finishTrainingSession();
    }, TRAINING_TIME_MS);

    // FPS計測リセット
    lastFpsTime = performance.now();
    fpsFrameCount = 0;
    currentFps = 0;

    // 推論開始
    requestAnimationFrame(runPoseLoop);
}



// ======================================
// 36. 運動終了
// - 推論停止
// - 運動後記憶テストへ進む
// ======================================

function finishTrainingSession(){

    running = false;
    trainingFinished = true;

    clearAllTimers();

    // 運動後フェーズへ
    memoryPhase = "after";

    // 同じ数字をもう一度覚えてもらう
    // memoryDigits は運動前に生成したものをそのまま使う
    startIntroCountdown("after");
}



// ======================================
// 37. 推論メインループ
// 毎フレーム以下を行う：
// 1. 姿勢推定
// 2. 全身が映っているか判定
// 3. 骨格描画
// 4. スクワット/ジャンプ判定
// 5. UI更新
// ======================================

async function runPoseLoop(){

    if(!running){
        return;
    }

    try{
        if(!detector || !video || video.readyState < 2){
            requestAnimationFrame(runPoseLoop);
            return;
        }

        const poses = await detector.estimatePoses(video, {
            maxPoses: 1,
            flipHorizontal: false
        });

        // 背景（カメラ映像）を描画
        drawVideoFrame();

        if(!poses || poses.length === 0){
            showBodyWarning("人物を検出できません。全身が映る位置に立ってください。");
            updateFPS();
            requestAnimationFrame(runPoseLoop);
            return;
        }

        const keypoints = poses[0].keypoints;

        if(!isFullBodyVisible(keypoints)){
            showBodyWarning("全身が画面に入るように立ってください。");
            drawSkeleton(keypoints);
            updateFPS();
            requestAnimationFrame(runPoseLoop);
            return;
        }

        // 警告を消す
        showBodyWarning("");

        // 骨格描画
        drawSkeleton(keypoints);

        // スクワット判定
        detectSquat(keypoints);

        // ジャンプ判定
        detectJump(keypoints);

        // クールダウン減少
        if(jumpCooldown > 0){
            jumpCooldown--;
        }

        // UI更新
        updateTrainingUI();
        updateFPS();

    }catch(err){
        console.error("Pose loop error:", err);
    }

    requestAnimationFrame(runPoseLoop);
}



// ======================================
// 38. canvas にカメラ映像を描く
//
// ここでは「カメラ映像だけ左右反転」させる。
// 以前の会話で、
// - カメラ映像は鏡のように左右反転したい
// - 骨格は人物に正しく重ねたい
// という要望があったので、
// 映像だけ反転して骨格はその座標に合わせて描く。
// ======================================

function drawVideoFrame(){

    if(!ctx || !video){
        return;
    }

    const w = canvas.width;
    const h = canvas.height;

    ctx.clearRect(0, 0, w, h);

    // カメラ映像を左右反転して描画
    ctx.save();
    ctx.translate(w, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0, w, h);
    ctx.restore();
}



// ======================================
// 39. 警告文表示
// ======================================

function showBodyWarning(text){

    if(!warning){
        return;
    }

    warning.innerText = text || "";
}



// ======================================
// 40. 骨格描画
//
// ポイント：
// カメラ映像を左右反転しているので、
// 骨格も同じように x 座標だけ反転して描く。
// これで人物の上に正しく重なる。
// ======================================

function drawSkeleton(keypoints){

    if(!ctx || !keypoints){
        return;
    }

    const w = canvas.width;
    const h = canvas.height;

    // 線
    ctx.lineWidth = 4;
    ctx.strokeStyle = "#00e5ff";

    for(const [a, b] of SKELETON){

        const p1 = keypoints[a];
        const p2 = keypoints[b];

        if(!p1 || !p2){
            continue;
        }

        if(p1.score < 0.25 || p2.score < 0.25){
            continue;
        }

        const x1 = w - p1.x;
        const y1 = p1.y;
        const x2 = w - p2.x;
        const y2 = p2.y;

        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
    }

    // 点
    for(const p of keypoints){

        if(!p || p.score < 0.25){
            continue;
        }

        const x = w - p.x;
        const y = p.y;

        ctx.beginPath();
        ctx.fillStyle = "#ffeb3b";
        ctx.arc(x, y, 6, 0, Math.PI * 2);
        ctx.fill();
    }
}



// ======================================
// 41. 2点間距離
// ======================================

function getDistance(ax, ay, bx, by){

    const dx = ax - bx;
    const dy = ay - by;

    return Math.sqrt(dx * dx + dy * dy);
}



// ======================================
// 42. 3点から角度を求める
//
// angleABC を返す
// B が頂点
// ======================================

function getAngleDeg(ax, ay, bx, by, cx, cy){

    const abx = ax - bx;
    const aby = ay - by;
    const cbx = cx - bx;
    const cby = cy - by;

    const dot = abx * cbx + aby * cby;
    const ab = Math.sqrt(abx * abx + aby * aby);
    const cb = Math.sqrt(cbx * cbx + cby * cby);

    if(ab === 0 || cb === 0){
        return 180;
    }

    let cos = dot / (ab * cb);

    // 誤差で 1.0000002 などになるのを防ぐ
    cos = Math.max(-1, Math.min(1, cos));

    const rad = Math.acos(cos);
    return rad * 180 / Math.PI;
}



// ======================================
// 43. 左右の膝角度の平均を求める
//
// 左膝角度 = ∠(hip - knee - ankle)
// 右膝角度 = ∠(hip - knee - ankle)
// ======================================

function getAverageKneeAngle(keypoints){

    const lHip   = keypoints[11];
    const lKnee  = keypoints[13];
    const lAnkle = keypoints[15];

    const rHip   = keypoints[12];
    const rKnee  = keypoints[14];
    const rAnkle = keypoints[16];

    const leftOk =
        lHip && lKnee && lAnkle &&
        lHip.score > 0.25 &&
        lKnee.score > 0.25 &&
        lAnkle.score > 0.25;

    const rightOk =
        rHip && rKnee && rAnkle &&
        rHip.score > 0.25 &&
        rKnee.score > 0.25 &&
        rAnkle.score > 0.25;

    let angles = [];

    if(leftOk){
        const a = getAngleDeg(
            lHip.x, lHip.y,
            lKnee.x, lKnee.y,
            lAnkle.x, lAnkle.y
        );
        angles.push(a);
    }

    if(rightOk){
        const a = getAngleDeg(
            rHip.x, rHip.y,
            rKnee.x, rKnee.y,
            rAnkle.x, rAnkle.y
        );
        angles.push(a);
    }

    if(angles.length === 0){
        return null;
    }

    const sum = angles.reduce((s, v)=> s + v, 0);
    return sum / angles.length;
}



// ======================================
// 44. スクワット判定
//
// 仕組み：
// - 膝角度が十分小さくなったら DOWN
// - その後、再び十分伸びたら 1回カウント
//
// これで「低いジャンプがスクワット扱い」になるのを
// ある程度減らせる。
// ======================================

function detectSquat(keypoints){

    const kneeAngle = getAverageKneeAngle(keypoints);

    if(kneeAngle === null){
        return;
    }

    // 立ち状態 → しゃがみ状態へ
    if(squatState === "UP" && kneeAngle < SQUAT_DOWN_ANGLE){
        squatState = "DOWN";
        return;
    }

    // しゃがみ状態 → 立ち状態へ戻ったら1回
    if(squatState === "DOWN" && kneeAngle > SQUAT_UP_ANGLE){
        squatState = "UP";
        squatCount++;
        calories += KCAL_PER_SQUAT;
    }
}



// ======================================
// 45. ジャンプ判定用の基準値を取る
//
// ヒップの平均Y、足首の平均Yを返す
// Yは上が小さく、下が大きい。
// ジャンプすると身体が上に行くので Y が小さくなる。
// ======================================

function getBodyVerticalRefs(keypoints){

    const lHip   = keypoints[11];
    const rHip   = keypoints[12];
    const lAnkle = keypoints[15];
    const rAnkle = keypoints[16];

    const hipOk =
        lHip && rHip &&
        lHip.score > 0.25 &&
        rHip.score > 0.25;

    const ankleOk =
        lAnkle && rAnkle &&
        lAnkle.score > 0.25 &&
        rAnkle.score > 0.25;

    if(!hipOk || !ankleOk){
        return null;
    }

    const hipY = (lHip.y + rHip.y) / 2;
    const ankleY = (lAnkle.y + rAnkle.y) / 2;

    return { hipY, ankleY };
}



// ======================================
// 46. ジャンプ判定
//
// 考え方：
// 1. 前フレームより hipY と ankleY が上へ大きく動く
// 2. クールダウン中でない
//
// ※ 低いジャンプもある程度拾えるように、
//    膝角度ではなく「身体全体の上昇量」を見る。
// ======================================

function detectJump(keypoints){

    const refs = getBodyVerticalRefs(keypoints);

    if(!refs){
        return;
    }

    const { hipY, ankleY } = refs;

    // 最初の1フレーム目は比較できないので保存だけ
    if(prevHipY === null || prevAnkleY === null){
        prevHipY = hipY;
        prevAnkleY = ankleY;
        return;
    }

    // 前フレームとの差
    const hipMove = prevHipY - hipY;
    const ankleMove = prevAnkleY - ankleY;

    // 正規化（画面高さで割る）
    const hipMoveNorm = hipMove / canvas.height;
    const ankleMoveNorm = ankleMove / canvas.height;

    // クールダウン中は更新だけして終了
    if(jumpCooldown > 0){
        prevHipY = hipY;
        prevAnkleY = ankleY;
        return;
    }

    // ジャンプ条件
    const jumped =
        hipMoveNorm > JUMP_HIP_THRESHOLD &&
        ankleMoveNorm > JUMP_ANKLE_THRESHOLD;

    if(jumped){
        jumpCount++;
        calories += KCAL_PER_JUMP;
        jumpCooldown = JUMP_COOLDOWN_FRAMES;
    }

    prevHipY = hipY;
    prevAnkleY = ankleY;
}



// ======================================
// 47. デバッグ表示用（任意）
// 必要なら骨格の横に角度などを表示できる
// 今は未使用だが、今後の調整に便利なので残しておく
// ======================================

function drawDebugText(text, x, y){

    if(!ctx){
        return;
    }

    ctx.save();
    ctx.font = "20px sans-serif";
    ctx.fillStyle = "#ffffff";
    ctx.strokeStyle = "rgba(0,0,0,0.7)";
    ctx.lineWidth = 4;
    ctx.strokeText(text, x, y);
    ctx.fillText(text, x, y);
    ctx.restore();
}



// ======================================
// 48. 運動中の姿勢リセット補助
//
// 例えば一度画面外に出た後などに、
// ジャンプの基準値が古いままだと誤判定しやすい。
// 必要ならここでリセットできる。
// ======================================

function resetPoseMotionState(){

    prevHipY = null;
    prevAnkleY = null;
    jumpCooldown = 0;
    squatState = "UP";
}



// ======================================
// 49. 全身が見えなくなったときの安全対策
//
// 今回は「見えていない間は判定しない」だけにする。
// そのとき、古い基準値を持ち越すと誤検知しやすいので
// ジャンプ基準もリセットする。
// ======================================

function handlePoseNotVisible(){

    resetPoseMotionState();
    updateFPS();
}



// ======================================
// 50. runPoseLoop の中で使う改善版メモ
//
// もし今後さらに誤検知を減らしたくなったら、
// 「全身が見えていないとき」に以下を呼ぶとよい：
//
// if(!isFullBodyVisible(keypoints)){
//     showBodyWarning("全身が画面に入るように立ってください。");
//     drawSkeleton(keypoints);
//     handlePoseNotVisible();
//     requestAnimationFrame(runPoseLoop);
//     return;
// }
//
// 今回は読みやすさ優先で runPoseLoop 本体は
// シンプルにしてある。
// ======================================
// ======================================
// 集中力向上トレーニングアプリ
// app.js Part4
// 役割：
// 1. 運動後記憶テスト終了処理
// 2. 向上率計算
// 3. 最終結果画面表示
// 4. リスタート / 後片付け
// ======================================



// ======================================
// 51. 向上率計算
//
// 今回は「運動前と比べて何ポイント上がったか」
// をそのまま表示する方式にする。
// 例:
// beforeRate = 40
// afterRate  = 70
// improveRate = +30
//
// もし「40→70 は何%増えたか」という
// 相対増加率に変えたければ、式を変えればOK。
// ======================================

function calculateImproveRate(){

    improveRate = afterRate - beforeRate;
}



// ======================================
// 52. 運動後記憶テスト終了
//
// submitMemoryAnswer() の
// memoryPhase === "after"
// から呼ばれる
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
// 53. 結果画面に表示するコメント文
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
// 54. 追加表示欄のDOM取得
//
// これらは index.html に存在すれば使う。
// 無くてもアプリが止まらないようにしてある。
// ======================================

const resultComment =
document.getElementById("resultComment");

const correctDigitsText =
document.getElementById("correctDigitsText");

const beforeUserAnswerText =
document.getElementById("beforeUserAnswer");

const afterUserAnswerText =
document.getElementById("afterUserAnswer");

const correctDigitsBeforeAnswerText =
document.getElementById("correctDigitsBeforeAnswer");

const correctDigitsAfterAnswerText =
document.getElementById("correctDigitsAfterAnswer");



// ======================================
// 55. 結果画面UI更新（拡張版）
//
// Part1 の updateResultUI() に加えて、
// ・コメント
// ・正解数字
// ・運動前/後の自分の回答
// も表示できるようにする
// ======================================

function updateResultUIExtended(){

    // まず基本結果を反映
    updateResultUI();

    // コメント
    if(resultComment){
        resultComment.innerText = getImproveComment();
    }

    // 正解の数字列
    if(correctDigitsText){
        correctDigitsText.innerText =
        memoryDigits ? memoryDigits : "-";
    }

    // 運動前の回答
    if(beforeUserAnswerText){
        beforeUserAnswerText.innerText =
        beforeAnswer ? beforeAnswer : "（未入力）";
    }

    // 運動後の回答
    if(afterUserAnswerText){
        afterUserAnswerText.innerText =
        afterAnswer ? afterAnswer : "（未入力）";
    }

    // 運動前の正解数
    if(correctDigitsBeforeAnswerText){
        correctDigitsBeforeAnswerText.innerText =
        `${beforeCorrectCount} / ${MEMORY_DIGITS_LENGTH}`;
    }

    // 運動後の正解数
    if(correctDigitsAfterAnswerText){
        correctDigitsAfterAnswerText.innerText =
        `${afterCorrectCount} / ${MEMORY_DIGITS_LENGTH}`;
    }
}



// ======================================
// 56. カメラ停止
// 完全終了したい場合に使う
// ======================================

function stopCameraStream(){

    if(!video || !video.srcObject){
        return;
    }

    const tracks = video.srcObject.getTracks();

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
// 57. 完全初期化
//
// stopCamera = true にすると
// カメラも停止して完全に最初へ戻る
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

    // 入力欄・回答欄など見た目を戻す
    if(memoryAnswerInput){
        memoryAnswerInput.value = "";
    }

    updateTrainingUI();
    updateResultUIExtended();
    showScreen("setup");
}



// ======================================
// 58. リスタートボタン
// 結果画面から最初へ戻る
// ======================================

if(restartBtn){
    restartBtn.onclick = () => {
        hardResetApp(false);
    };
}



// ======================================
// 59. ページを離れる時の後片付け
//
// iPad / Safari でカメラが残りにくくなる
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
// 60. デバッグ用ショートカット
// コンソールから使えるようにしておく
// ======================================

// 運動後テストへ直接飛ぶ
window.debugGoAfterTest = function(){

    running = false;
    clearAllTimers();
    startIntroCountdown("after");
};

// 結果画面を仮表示
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

// 完全リセット
window.debugResetApp = function(){

    hardResetApp(false);
};



// ======================================
// 61. 追加欄を index.html に入れたい場合の例
//
// もし結果画面にさらに詳しく出したいなら、
// index.html の resultScreen の中に
// 次のような要素を追加すると使える。
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
// <div class="resultRow">
//   <span>運動前の正解数</span>
//   <span id="correctDigitsBeforeAnswer">-</span>
// </div>
//
// <div class="resultRow">
//   <span>運動後の正解数</span>
//   <span id="correctDigitsAfterAnswer">-</span>
// </div>
//
// <p id="resultComment"></p>
//
// 追加しなくても、このJSは落ちない。
// ======================================