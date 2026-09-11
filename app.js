// ==========================================================
// 集中力向上トレーニングアプリ
// app.js 完成版
// ==========================================================


// ==========================================================
// 1. 定数
// ==========================================================

const INTRO_COUNTDOWN = 10;
const MEMORY_DISPLAY_TIME = 15;
const MEMORY_DIGITS_LENGTH = 20;

const TOTAL_TRAINING_TIME = 300; // 5分

// 7セットで合計5分になるように設定
// 6セット × 40秒 + 最後の1セット × 60秒 = 300秒
const NORMAL_EXERCISE_DURATION = 40;
const LAST_EXERCISE_DURATION = 60;

const TOTAL_EXERCISES = 7;

const GOAL_REPS = 20;

const SCORE_PER_SQUAT = 2;
const SCORE_PER_JUMP = 3;
const SCORE_PER_HIGH_KNEE = 2;
const SCORE_PER_GRIP = 1;

const KEYPOINT_SCORE = 0.3;


// ==========================================================
// 2. DOM取得
// ==========================================================

const video = document.getElementById("video");
const canvas = document.getElementById("canvas");

const ctx = canvas ? canvas.getContext("2d") : null;

const loadingScreen = document.getElementById("loadingScreen");
const loadingText = document.getElementById("loadingText");

const setupScreen = document.getElementById("setupScreen");

const startBtn = document.getElementById("startBtn");

const resetBtn = document.getElementById("resetBtn");

const warning = document.getElementById("warning");

const fpsText = document.getElementById("fpsValue");

const sqText = document.getElementById("sq");
const jpText = document.getElementById("jp");
const kcalText = document.getElementById("kcal");
const scoreText = document.getElementById("score");


// ==========================================================
// 3. 追加UI
// ==========================================================

function getOrCreateElement(id, tag = "div") {

    let element = document.getElementById(id);

    if (!element) {
        element = document.createElement(tag);
        element.id = id;
        document.body.appendChild(element);
    }

    return element;
}


const countdownScreen =
    getOrCreateElement("countdownScreen");

const countdownText =
    getOrCreateElement("countdownText");

const memoryScreen =
    getOrCreateElement("memoryScreen");

const memoryInstruction =
    getOrCreateElement("memoryInstruction");

const memoryNumber =
    getOrCreateElement("memoryNumber");

const memoryAnswerScreen =
    getOrCreateElement("memoryAnswerScreen");

const memoryAnswerInput =
    getOrCreateElement("memoryAnswerInput", "input");

const submitMemoryBtn =
    getOrCreateElement("submitMemoryBtn", "button");

const giveUpBtn =
    getOrCreateElement("giveUpBtn", "button");

const memoryResultScreen =
    getOrCreateElement("memoryResultScreen");

const memoryResultText =
    getOrCreateElement("memoryResultText");

const startTrainingBtn =
    getOrCreateElement("startTrainingBtn", "button");

const trainingScreen =
    getOrCreateElement("trainingScreen");

const exerciseName =
    getOrCreateElement("exerciseName");

const exerciseGoal =
    getOrCreateElement("exerciseGoal");

const exerciseTarget =
    getOrCreateElement("exerciseTarget");

const exerciseSet =
    getOrCreateElement("exerciseSet");

const trainingLoading =
    getOrCreateElement("trainingLoading");

const endTrainingBtn =
    getOrCreateElement("endTrainingBtn", "button");

const resultScreen =
    getOrCreateElement("resultScreen");

const resultText =
    getOrCreateElement("resultText");

const beforeScoreText =
    getOrCreateElement("beforeScoreText");

const afterScoreText =
    getOrCreateElement("afterScoreText");

const improvementText =
    getOrCreateElement("improvementText");

const retryBtn =
    getOrCreateElement("retryBtn", "button");


// ==========================================================
// 4. ユーザー情報
// ==========================================================

let userHeight = 170;
let userWeight = 60;
let userAge = 16;
let userGender = "male";


// ==========================================================
// 5. AI・カメラ関連
// ==========================================================

let detector = null;

let handDetector = null;

let stream = null;

// インカメラ固定
const currentFacing = "user";


// ==========================================================
// 6. アプリ状態
// ==========================================================

let phase = "setup";

let running = false;

let cameraReady = false;

let modelReady = false;

let handModelReady = false;


// ==========================================================
// 7. 記憶テスト
// ==========================================================

let randomDigits = "";

let beforeMemoryScore = 0;

let afterMemoryScore = 0;

let memoryStartTime = 0;

let memoryTimer = null;

let countdownTimer = null;


// ==========================================================
// 8. 運動関連
// ==========================================================

let currentExercise = 0;

let elapsedTraining = 0;

let exerciseElapsed = 0;

let completedExercises = 0;

let trainingTimer = null;


// ==========================================================
// 9. 運動回数
// ==========================================================

let squatCount = 0;

let jumpCount = 0;

let highKneeCount = 0;

let gripCount = 0;


// ==========================================================
// 10. 運動判定用状態
// ==========================================================

let squatState = "UP";

let leftSquatDown = false;

let rightSquatDown = false;

let previousHipY = null;

let jumping = false;

let jumpStartY = null;

let lastJumpTime = 0;

let highKneeState = "DOWN";

let gripOpen = false;

let gripCloseState = false;

let lastGripTime = 0;


// ==========================================================
// 11. カロリー・スコア
// ==========================================================

let calories = 0;

let score = 0;


// ==========================================================
// 12. FPS
// ==========================================================

let lastFrameTime = performance.now();

let fpsFrames = 0;

let fpsLastUpdate = performance.now();


// ==========================================================
// 13. MoveNet骨格
// ==========================================================

const skeleton = [

    [5, 6],

    [5, 7],
    [7, 9],

    [6, 8],
    [8, 10],

    [5, 11],
    [6, 12],

    [11, 12],

    [11, 13],
    [13, 15],

    [12, 14],
    [14, 16]

];


// ==========================================================
// 14. 運動一覧
// ==========================================================

const exercises = [

    {
        name: "グーパー運動",
        type: "grip",
        duration: NORMAL_EXERCISE_DURATION,
        mets: 2.5
    },

    {
        name: "もも上げ",
        type: "highKnee",
        duration: NORMAL_EXERCISE_DURATION,
        mets: 4.0
    },

    {
        name: "スクワット",
        type: "squat",
        duration: NORMAL_EXERCISE_DURATION,
        mets: 5.0
    },

    {
        name: "ジャンプ",
        type: "jump",
        duration: NORMAL_EXERCISE_DURATION,
        mets: 8.0
    },

    {
        name: "グーパー運動",
        type: "grip",
        duration: NORMAL_EXERCISE_DURATION,
        mets: 2.5
    },

    {
        name: "もも上げ",
        type: "highKnee",
        duration: NORMAL_EXERCISE_DURATION,
        mets: 4.0
    },

    {
        name: "スクワット",
        type: "squat",
        duration: LAST_EXERCISE_DURATION,
        mets: 5.0
    }

];


// ==========================================================
// 15. 初期表示
// ==========================================================

function hideAllScreens() {

    const screens = [

        countdownScreen,
        memoryScreen,
        memoryAnswerScreen,
        memoryResultScreen,
        trainingScreen,
        trainingLoading,
        resultScreen

    ];

    screens.forEach(screen => {

        if (screen) {
            screen.style.display = "none";
        }

    });

}


function showSetup() {

    hideAllScreens();

    if (setupScreen) {
        setupScreen.style.display = "flex";
    }

}


function showScreen(screen) {

    hideAllScreens();

    if (screen) {
        screen.style.display = "flex";
    }

}


// ==========================================================
// 16. 数字生成
// ==========================================================

function generateDigits() {

    let digits = "";

    for (let i = 0; i < MEMORY_DIGITS_LENGTH; i++) {

        digits += Math.floor(Math.random() * 10);

    }

    return digits;

}


// ==========================================================
// 17. 記憶テスト開始
// ==========================================================

function startMemoryTest() {

    phase = "beforeMemory";

    randomDigits = generateDigits();

    showScreen(memoryScreen);

    if (memoryInstruction) {

        memoryInstruction.textContent =
            "ランダムな数字を覚えてもらいます";

    }

    if (memoryNumber) {

        memoryNumber.textContent = randomDigits;

    }

    memoryStartTime = performance.now();

    clearTimeout(memoryTimer);

    memoryTimer = setTimeout(() => {

        finishMemoryDisplay();

    }, MEMORY_DISPLAY_TIME * 1000);

}


// ==========================================================
// 18. 記憶数字を隠す
// ==========================================================

function finishMemoryDisplay() {

    if (memoryNumber) {

        memoryNumber.textContent = "";

    }

    phase = "memoryAnswer";

    showScreen(memoryAnswerScreen);

    if (memoryAnswerInput) {

        memoryAnswerInput.value = "";

        setTimeout(() => {

            memoryAnswerInput.focus();

        }, 100);

    }

}


// ==========================================================
// 19. 記憶テスト採点
// ==========================================================

function calculateMemoryScore(answer) {

    let correct = 0;

    const answerText = String(answer || "");

    for (
        let i = 0;
        i < MEMORY_DIGITS_LENGTH;
        i++
    ) {

        if (
            answerText[i] === randomDigits[i]
        ) {

            correct++;

        }

    }

    return correct;

}


// ==========================================================
// 20. 記憶テスト提出
// ==========================================================

function submitMemory() {

    const answer =
        memoryAnswerInput ?
        memoryAnswerInput.value :
        "";

    const correct =
        calculateMemoryScore(answer);

    const percentage =
        Math.round(
            correct / MEMORY_DIGITS_LENGTH * 100
        );

    if (phase === "beforeMemory") {

        beforeMemoryScore = percentage;

    }

    else if (phase === "afterMemory") {

        afterMemoryScore = percentage;

    }

    showMemoryResult(
        correct,
        percentage
    );

}


// ==========================================================
// 21. ギブアップ
// ==========================================================

function giveUpMemory() {

    if (phase !== "beforeMemory" &&
        phase !== "afterMemory") {

        return;

    }

    showMemoryResult(0, 0);

}


// ==========================================================
// 22. 記憶結果表示
// ==========================================================

function showMemoryResult(correct, percentage) {

    clearTimeout(memoryTimer);

    phase =
        phase === "beforeMemory"
        ? "beforeResult"
        : "afterResult";

    showScreen(memoryResultScreen);

    if (memoryResultText) {

        memoryResultText.innerHTML =
            `あなたは<strong>${percentage}%</strong>覚えることができました<br>` +
            `${MEMORY_DIGITS_LENGTH}個中 ${correct}個正解`;

    }

    if (phase === "beforeResult") {

        if (startTrainingBtn) {

            startTrainingBtn.style.display =
                "inline-block";

        }

    }

    else {

        showFinalResult();

    }

}


// ==========================================================
// 23. 運動開始準備
// ==========================================================

async function startTraining() {

    phase = "trainingLoading";

    showScreen(trainingLoading);

    running = false;

    try {

        await prepareCamera();

        await prepareModels();

        if (trainingLoading) {

            trainingLoading.style.display =
                "none";

        }

        phase = "training";

        showScreen(trainingScreen);

        resetExerciseStates();

        currentExercise = 0;

        elapsedTraining = 0;

        exerciseElapsed = 0;

        completedExercises = 0;

        running = true;

        updateExerciseUI();

        startTrainingTimer();

        requestAnimationFrame(poseLoop);

    }

    catch (error) {

        console.error(error);

        alert(
            "カメラまたはAIの読み込みに失敗しました。\n" +
            "カメラの使用を許可してから、もう一度お試しください。"
        );

        running = false;

        showSetup();

    }

}


// ==========================================================
// 24. カメラ準備
// ==========================================================

async function prepareCamera() {

    if (!navigator.mediaDevices ||
        !navigator.mediaDevices.getUserMedia) {

        throw new Error(
            "カメラ機能が利用できません"
        );

    }

    if (stream) {

        stream
            .getTracks()
            .forEach(track => track.stop());

    }

    stream =
        await navigator.mediaDevices.getUserMedia({

            video: {

                facingMode: {
                    ideal: "user"
                },

                width: {
                    ideal: 640
                },

                height: {
                    ideal: 480
                },

                frameRate: {
                    ideal: 30,
                    max: 30
                }

            },

            audio: false

        });

    video.srcObject = stream;

    video.style.display = "none";

    await video.play();

    await waitForVideo();

    canvas.width =
        video.videoWidth || 640;

    canvas.height =
        video.videoHeight || 480;

    cameraReady = true;

}


// ==========================================================
// 25. ビデオ準備待ち
// ==========================================================

function waitForVideo() {

    return new Promise(resolve => {

        if (
            video.readyState >= 2 &&
            video.videoWidth > 0
        ) {

            resolve();

            return;

        }

        const check = () => {

            if (
                video.readyState >= 2 &&
                video.videoWidth > 0
            ) {

                resolve();

            }

            else {

                requestAnimationFrame(check);

            }

        };

        check();

    });

}


// ==========================================================
// 26. AIモデル準備
// ==========================================================

async function prepareModels() {

    if (!detector) {

        if (loadingText) {

            loadingText.textContent =
                "MoveNetを読み込んでいます...";

        }

        await tf.setBackend("webgl");

        await tf.ready();

        detector =
            await poseDetection.createDetector(

                poseDetection.SupportedModels.MoveNet,

                {

                    modelType:
                        poseDetection.movenet
                        .modelType
                        .SINGLEPOSE_LIGHTNING,

                    enableSmoothing: true

                }

            );

    }

    modelReady = true;


    // グーパー運動用
    // MediaPipe Handsが利用可能な場合だけ読み込む

    if (
        typeof Hands !== "undefined" &&
        !handDetector
    ) {

        try {

            handDetector =
                new Hands({

                    locateFile: file => {

                        return (
                            "https://cdn.jsdelivr.net/npm/" +
                            "@mediapipe/hands/" +
                            file
                        );

                    }

                });

            handDetector.setOptions({

                maxNumHands: 2,

                modelComplexity: 0,

                minDetectionConfidence: 0.5,

                minTrackingConfidence: 0.5,

                selfieMode: true

            });

            handModelReady = true;

        }

        catch (error) {

            console.warn(
                "Handsの読み込みに失敗しました",
                error
            );

            handDetector = null;

        }

    }

}


// ==========================================================
// 27. トレーニングタイマー
// ==========================================================

function startTrainingTimer() {

    clearInterval(trainingTimer);

    const startTime = performance.now();

    trainingTimer =
        setInterval(() => {

            if (!running) {

                return;

            }

            elapsedTraining =
                (performance.now() - startTime) / 1000;

            exerciseElapsed =
                elapsedTraining -
                getPreviousExerciseTime();

            if (
                elapsedTraining >=
                TOTAL_TRAINING_TIME
            ) {

                elapsedTraining =
                    TOTAL_TRAINING_TIME;

                finishTraining();

                return;

            }

            updateExerciseUI();

        }, 100);

}


// ==========================================================
// 28. 現在の運動時間
// ==========================================================

function getExerciseDuration(index) {

    if (index < 0) {

        return 0;

    }

    if (index >= exercises.length) {

        return 0;

    }

    return exercises[index].duration;

}


// ==========================================================
// 29. 現在までの運動時間
// ==========================================================

function getPreviousExerciseTime() {

    let time = 0;

    for (
        let i = 0;
        i < currentExercise;
        i++
    ) {

        time +=
            getExerciseDuration(i);

    }

    return time;

}


// ==========================================================
// 30. 現在の運動時間
// ==========================================================

function getCurrentExerciseDuration() {

    return getExerciseDuration(
        currentExercise
    );

}


// ==========================================================
// 31. 現在の運動回数
// ==========================================================

function currentExerciseCount() {

    if (
        !exercises[currentExercise]
    ) {

        return 0;

    }

    switch (
        exercises[currentExercise].type
    ) {

        case "grip":

            return gripCount;


        case "highKnee":

            return highKneeCount;


        case "squat":

            return squatCount;


        case "jump":

            return jumpCount;


        default:

            return 0;

    }

}


// ==========================================================
// 32. 運動目標表示
// ==========================================================

function updateExerciseGoal() {

    const count =
        currentExerciseCount();

    if (!exerciseGoal) {

        return;

    }

    if (count >= GOAL_REPS) {

        exerciseGoal.textContent =
            "目標達成！ " +
            count +
            "回";

        exerciseGoal.classList.add(
            "isCleared"
        );

    }

    else {

        exerciseGoal.textContent =
            "目標 " +
            GOAL_REPS +
            "回　現在 " +
            count +
            "回";

        exerciseGoal.classList.remove(
            "isCleared"
        );

    }

}


// ==========================================================
// 33. 運動画面更新
// ==========================================================

function updateExerciseUI() {

    if (!exercises[currentExercise]) {

        return;

    }

    const exercise =
        exercises[currentExercise];

    if (exerciseName) {

        exerciseName.textContent =
            exercise.name;

    }

    if (exerciseSet) {

        exerciseSet.textContent =
            `${currentExercise + 1} / ${TOTAL_EXERCISES}`;

    }

    updateExerciseGoal();

    // 残り時間
    // グーパー運動では必要に応じて非表示

    const remaining =
        Math.max(
            0,
            Math.ceil(
                exercise.duration -
                exerciseElapsed
            )
        );

    if (exerciseTarget) {

        exerciseTarget.textContent =
            `残り ${remaining} 秒`;

    }

}


// ==========================================================
// 34. 次の運動
// ==========================================================

function nextExercise() {

    completedExercises++;

    if (
        currentExercise >=
        TOTAL_EXERCISES - 1
    ) {

        finishTraining();

        return;

    }

    currentExercise++;

    exerciseElapsed = 0;

    resetExerciseStates();

    updateExerciseUI();

}


// ==========================================================
// 35. 運動判定状態リセット
// ==========================================================

function resetExerciseStates() {

    squatState = "UP";

    leftSquatDown = false;

    rightSquatDown = false;

    previousHipY = null;

    jumping = false;

    jumpStartY = null;

    highKneeState = "DOWN";

    gripOpen = false;

    gripCloseState = false;

    lastJumpTime = 0;

    lastGripTime = 0;

}


// ==========================================================
// 36. 骨格描画
// ==========================================================

function drawSkeleton(keypoints) {

    if (!ctx) {

        return;

    }

    ctx.save();

    // カメラを左右反転
    ctx.translate(canvas.width, 0);

    ctx.scale(-1, 1);

    ctx.strokeStyle = "#00ff88";

    ctx.lineWidth = 4;

    skeleton.forEach(([a, b]) => {

        const p1 = keypoints[a];

        const p2 = keypoints[b];

        if (
            p1 &&
            p2 &&
            p1.score > KEYPOINT_SCORE &&
            p2.score > KEYPOINT_SCORE
        ) {

            ctx.beginPath();

            ctx.moveTo(
                canvas.width - p1.x,
                p1.y
            );

            ctx.lineTo(
                canvas.width - p2.x,
                p2.y
            );

            ctx.stroke();

        }

    });


    keypoints.forEach(kp => {

        if (
            kp &&
            kp.score > KEYPOINT_SCORE
        ) {

            ctx.beginPath();

            ctx.arc(
                canvas.width - kp.x,
                kp.y,
                5,
                0,
                Math.PI * 2
            );

            ctx.fillStyle = "#00ffff";

            ctx.fill();

        }

    });

    ctx.restore();

}


// ==========================================================
// 37. カメラ映像描画
// ==========================================================

function drawCamera() {

    if (!ctx || !video) {

        return;

    }

    ctx.save();

    ctx.translate(canvas.width, 0);

    ctx.scale(-1, 1);

    ctx.drawImage(
        video,
        0,
        0,
        canvas.width,
        canvas.height
    );

    ctx.restore();

}


// ==========================================================
// 38. 全身が映っているか
// ==========================================================

function isFullBodyVisible(kp) {

    const required = [

        5,
        6,

        11,
        12,

        13,
        14,

        15,
        16

    ];

    return required.every(index => {

        return (
            kp[index] &&
            kp[index].score >
            KEYPOINT_SCORE
        );

    });

}


// ==========================================================
// 39. 膝の角度
// ==========================================================

function calculateAngle(a, b, c) {

    const abx = a.x - b.x;

    const aby = a.y - b.y;

    const cbx = c.x - b.x;

    const cby = c.y - b.y;

    const dot =
        abx * cbx +
        aby * cby;

    const mag1 =
        Math.sqrt(
            abx * abx +
            aby * aby
        );

    const mag2 =
        Math.sqrt(
            cbx * cbx +
            cby * cby
        );

    if (
        mag1 === 0 ||
        mag2 === 0
    ) {

        return 180;

    }

    const cos =
        dot / (mag1 * mag2);

    const safeCos =
        Math.max(
            -1,
            Math.min(1, cos)
        );

    return (
        Math.acos(safeCos) *
        180 /
        Math.PI
    );

}


// ==========================================================
// 40. スクワット判定
// ==========================================================

function detectSquat(kp) {

    const leftHip = kp[11];

    const rightHip = kp[12];

    const leftKnee = kp[13];

    const rightKnee = kp[14];

    const leftAnkle = kp[15];

    const rightAnkle = kp[16];


    if (
        !leftHip ||
        !rightHip ||
        !leftKnee ||
        !rightKnee ||
        !leftAnkle ||
        !rightAnkle
    ) {

        return;

    }


    if (
        leftHip.score < KEYPOINT_SCORE ||
        rightHip.score < KEYPOINT_SCORE ||
        leftKnee.score < KEYPOINT_SCORE ||
        rightKnee.score < KEYPOINT_SCORE ||
        leftAnkle.score < KEYPOINT_SCORE ||
        rightAnkle.score < KEYPOINT_SCORE
    ) {

        return;

    }


    const leftAngle =
        calculateAngle(
            leftHip,
            leftKnee,
            leftAnkle
        );

    const rightAngle =
        calculateAngle(
            rightHip,
            rightKnee,
            rightAnkle
        );


    // 両膝がしっかり曲がった状態
    const down =
        leftAngle < 125 &&
        rightAngle < 125;


    if (
        squatState === "UP" &&
        down
    ) {

        squatState = "DOWN";

    }


    if (
        squatState === "DOWN" &&
        !down
    ) {

        squatState = "UP";

        squatCount++;

        addExerciseCalories(
            5.0
        );

        score +=
            SCORE_PER_SQUAT;

    }

}


// ==========================================================
// 41. ジャンプ判定
// ==========================================================

function detectJump(kp) {

    const leftHip = kp[11];

    const rightHip = kp[12];

    const leftAnkle = kp[15];

    const rightAnkle = kp[16];


    if (
        !leftHip ||
        !rightHip ||
        !leftAnkle ||
        !rightAnkle
    ) {

        return;

    }


    if (
        leftHip.score < KEYPOINT_SCORE ||
        rightHip.score < KEYPOINT_SCORE ||
        leftAnkle.score < KEYPOINT_SCORE ||
        rightAnkle.score < KEYPOINT_SCORE
    ) {

        return;

    }


    const hipY =
        (
            leftHip.y +
            rightHip.y
        ) / 2;


    if (previousHipY === null) {

        previousHipY = hipY;

        return;

    }


    const movement =
        previousHipY - hipY;


    const now =
        performance.now();


    // 上方向に大きく動いた
    if (
        movement > 18 &&
        !jumping &&
        now - lastJumpTime > 500
    ) {

        jumping = true;

        jumpStartY = hipY;

    }


    // 上昇後に下降したら着地
    if (
        jumping &&
        movement < -3
    ) {

        jumpCount++;

        addExerciseCalories(
            8.0
        );

        score +=
            SCORE_PER_JUMP;

        jumping = false;

        lastJumpTime = now;

    }


    previousHipY = hipY;

}


// ==========================================================
// 42. もも上げ判定
// ==========================================================

function detectHighKnee(kp) {

    const leftHip = kp[11];

    const rightHip = kp[12];

    const leftKnee = kp[13];

    const rightKnee = kp[14];


    if (
        !leftHip ||
        !rightHip ||
        !leftKnee ||
        !rightKnee
    ) {

        return;

    }


    if (
        leftHip.score < KEYPOINT_SCORE ||
        rightHip.score < KEYPOINT_SCORE ||
        leftKnee.score < KEYPOINT_SCORE ||
        rightKnee.score < KEYPOINT_SCORE
    ) {

        return;

    }


    const leftLift =
        leftKnee.y <
        leftHip.y + 20;


    const rightLift =
        rightKnee.y <
        rightHip.y + 20;


    const lifted =
        leftLift ||
        rightLift;


    if (
        highKneeState === "DOWN" &&
        lifted
    ) {

        highKneeState = "UP";

    }


    if (
        highKneeState === "UP" &&
        !lifted
    ) {

        highKneeCount++;

        addExerciseCalories(
            4.0
        );

        score +=
            SCORE_PER_HIGH_KNEE;

        highKneeState = "DOWN";

    }

}


// ==========================================================
// 43. 手の角度
// ==========================================================

function handFingerAngle(a, b, c) {

    return calculateAngle(
        a,
        b,
        c
    );

}


// ==========================================================
// 44. グーパー判定
// ==========================================================

function handGesture(landmarks) {

    if (
        !landmarks ||
        landmarks.length < 21
    ) {

        return "unknown";

    }


    const wrist =
        landmarks[0];


    const fingerTips = [

        8,
        12,
        16,
        20

    ];


    let extended = 0;


    fingerTips.forEach(tipIndex => {

        const tip =
            landmarks[tipIndex];

        const distance =
            Math.hypot(
                tip.x - wrist.x,
                tip.y - wrist.y
            );

        if (distance > 0.22) {

            extended++;

        }

    });


    if (extended >= 3) {

        return "open";

    }


    if (extended <= 1) {

        return "closed";

    }


    return "unknown";

}


// ==========================================================
// 45. グーパー回数加算
// ==========================================================

function detectGripGesture(landmarks) {

    const gesture =
        handGesture(landmarks);


    if (gesture === "open") {

        gripOpen = true;

    }


    if (
        gesture === "closed" &&
        gripOpen
    ) {

        const now =
            performance.now();


        if (
            now - lastGripTime >
            300
        ) {

            gripCount++;

            addExerciseCalories(
                2.5
            );

            score +=
                SCORE_PER_GRIP;

            lastGripTime = now;

            gripOpen = false;

        }

    }

}


// ==========================================================
// 46. カロリー計算
// ==========================================================

function addExerciseCalories(mets) {

    const exercise =
        exercises[currentExercise];


    if (!exercise) {

        return;

    }


    // 1回の動作について、
    // 運動時間全体ではなく動作の一部として
    // 小さく加算する。
    //
    // 最終的な研究用の値は、
    // 運動時間×METsによる値で計算する。

    updateUI();

}


// ==========================================================
// 47. METsによるカロリー計算
// ==========================================================

function calculateMETCalories(
    mets,
    minutes
) {

    if (
        !userWeight ||
        userWeight <= 0
    ) {

        return 0;

    }


    // METs × 3.5 × 体重kg ÷ 200
    // kcal / 分

    return (
        mets *
        3.5 *
        userWeight /
        200 *
        minutes
    );

}


// ==========================================================
// 48. 運動時間からカロリー計算
// ==========================================================

function calculateTrainingCalories() {

    let total = 0;


    exercises.forEach(exercise => {

        total +=
            calculateMETCalories(
                exercise.mets,
                exercise.duration / 60
            );

    });


    return total;

}


// ==========================================================
// 49. UI更新
// ==========================================================

function updateUI() {

    if (sqText) {

        sqText.textContent =
            squatCount;

    }


    if (jpText) {

        jpText.textContent =
            jumpCount;

    }


    const kcal =
        calculateTrainingCalories();


    calories = kcal;


    if (kcalText) {

        kcalText.textContent =
            calories.toFixed(1);

    }


    if (scoreText) {

        scoreText.textContent =
            Math.min(
                100,
                Math.floor(score)
            );

    }


    updateExerciseGoal();

}


// ==========================================================
// 50. FPS
// ==========================================================

function updateFPS() {

    const now =
        performance.now();

    fpsFrames++;


    if (
        now - fpsLastUpdate >=
        1000
    ) {

        const fps =
            Math.round(
                fpsFrames /
                (
                    (now -
                        fpsLastUpdate) /
                    1000
                )
            );


        if (fpsText) {

            fpsText.textContent =
                fps;

        }


        fpsFrames = 0;

        fpsLastUpdate = now;

    }


}


// ==========================================================
// 51. ポーズ検出ループ
// ==========================================================

let poseLoopBusy = false;


async function poseLoop() {

    if (
        !running ||
        !detector ||
        !cameraReady
    ) {

        return;

    }


    if (poseLoopBusy) {

        requestAnimationFrame(
            poseLoop
        );

        return;

    }


    poseLoopBusy = true;


    try {

        updateFPS();

        drawCamera();


        const poses =
            await detector.estimatePoses(
                video
            );


        if (
            poses &&
            poses.length > 0
        ) {

            const kp =
                poses[0].keypoints;


            if (
                !isFullBodyVisible(kp)
            ) {

                if (warning) {

                    warning.style.display =
                        "block";

                    warning.textContent =
                        "全身が映っていません";

                }

            }

            else {

                if (warning) {

                    warning.style.display =
                        "none";

                }


                drawSkeleton(kp);


                const exercise =
                    exercises[currentExercise];


                if (exercise) {

                    switch (
                        exercise.type
                    ) {

                        case "squat":

                            detectSquat(kp);

                            break;


                        case "jump":

                            detectJump(kp);

                            break;


                        case "highKnee":

                            detectHighKnee(kp);

                            break;

                    }

                }


                updateUI();

            }

        }

        else {

            if (warning) {

                warning.style.display =
                    "block";

                warning.textContent =
                    "全身が映っていません";

            }

        }

    }

    catch (error) {

        console.error(
            "Pose detection error:",
            error
        );

    }


    poseLoopBusy = false;


    if (running) {

        requestAnimationFrame(
            poseLoop
        );

    }

}


// ==========================================================
// 52. トレーニング終了
// ==========================================================

function finishTraining() {

    if (!running) {

        return;

    }


    running = false;

    clearInterval(
        trainingTimer
    );

    trainingTimer = null;


    phase = "after";


    // 運動後は必ず新しい20桁を作る
    randomDigits =
        generateDigits();


    showScreen(memoryScreen);


    if (memoryInstruction) {

        memoryInstruction.textContent =
            "もう一度、ランダムな数字を覚えてもらいます";

    }


    if (memoryNumber) {

        memoryNumber.textContent =
            randomDigits;

    }


    memoryStartTime =
        performance.now();


    clearTimeout(memoryTimer);


    memoryTimer =
        setTimeout(() => {

            finishAfterMemoryDisplay();

        }, MEMORY_DISPLAY_TIME * 1000);

}


// ==========================================================
// 53. 運動後記憶テスト
// ==========================================================

function finishAfterMemoryDisplay() {

    if (memoryNumber) {

        memoryNumber.textContent =
            "";

    }


    phase = "afterMemory";

    showScreen(
        memoryAnswerScreen
    );


    if (memoryAnswerInput) {

        memoryAnswerInput.value = "";

        setTimeout(() => {

            memoryAnswerInput.focus();

        }, 100);

    }

}


// ==========================================================
// 54. 最終結果
// ==========================================================

function showFinalResult() {

    showScreen(resultScreen);


    const improvement =
        afterMemoryScore -
        beforeMemoryScore;


    const improvementRate =
        beforeMemoryScore === 0
        ? afterMemoryScore
        : (
            improvement /
            beforeMemoryScore *
            100
        );


    if (beforeScoreText) {

        beforeScoreText.textContent =
            `${beforeMemoryScore}%`;

    }


    if (afterScoreText) {

        afterScoreText.textContent =
            `${afterMemoryScore}%`;

    }


    if (improvementText) {

        if (improvement > 0) {

            improvementText.textContent =
                `集中力・記憶テスト結果が ${improvement}ポイント向上しました！`;

        }

        else if (improvement < 0) {

            improvementText.textContent =
                `集中力・記憶テスト結果が ${Math.abs(improvement)}ポイント下がりました。`;

        }

        else {

            improvementText.textContent =
                "記憶テスト結果に変化はありませんでした。";

        }

    }


    if (resultText) {

        resultText.innerHTML =
            `
            運動前：${beforeMemoryScore}%<br>
            運動後：${afterMemoryScore}%<br>
            変化：${improvement >= 0 ? "+" : ""}${improvement}ポイント
            `;

    }

}


// ==========================================================
// 55. アプリ開始
// ==========================================================

async function startApp() {

    if (phase !== "setup") {

        return;

    }


    // --------------------------
    // 入力値取得
    // --------------------------

    const heightInput =
        document.getElementById(
            "heightInput"
        );

    const weightInput =
        document.getElementById(
            "weightInput"
        );

    const ageInput =
        document.getElementById(
            "ageInput"
        );

    const ageGroup =
        document.getElementById(
            "ageGroup"
        );

    const genderInput =
        document.getElementById(
            "genderInput"
        );


    if (heightInput) {

        userHeight =
            Number(
                heightInput.value
            ) || 170;

    }


    if (weightInput) {

        userWeight =
            Number(
                weightInput.value
            ) || 60;

    }


    if (ageInput) {

        userAge =
            Number(
                ageInput.value
            ) || 16;

    }


    if (genderInput) {

        userGender =
            genderInput.value;

    }


    // 年齢グループ方式にも対応
    if (
        ageGroup &&
        ageGroup.value
    ) {

        userAge =
            ageGroup.value;

    }


    // --------------------------
    // 入力チェック
    // --------------------------

    if (
        userHeight <= 0 ||
        userWeight <= 0
    ) {

        alert(
            "身長と体重を正しく入力してください。"
        );

        return;

    }


    if (
        startBtn
    ) {

        startBtn.disabled = true;

        startBtn.textContent =
            "準備しています...";

    }


    try {

        phase = "before";

        // 最初にカメラとAIを準備
        if (loadingScreen) {

            loadingScreen.style.display =
                "flex";

        }


        if (loadingText) {

            loadingText.textContent =
                "カメラを準備しています...";

        }


        await prepareCamera();


        if (loadingText) {

            loadingText.textContent =
                "AIを読み込んでいます...";

        }


        await prepareModels();


        if (setupScreen) {

            setupScreen.style.display =
                "none";

        }


        if (loadingScreen) {

            loadingScreen.style.display =
                "none";

        }


        // 記憶テスト開始
        startMemoryCountdown();

    }

    catch (error) {

        console.error(
            "startApp error:",
            error
        );


        alert(
            "アプリの開始に失敗しました。\n" +
            "カメラの使用を許可しているか確認してください。"
        );


        phase = "setup";


        if (loadingScreen) {

            loadingScreen.style.display =
                "none";

        }


        if (setupScreen) {

            setupScreen.style.display =
                "flex";

        }

    }

    finally {

        if (startBtn) {

            startBtn.disabled =
                false;

            startBtn.textContent =
                "トレーニング開始";

        }

    }

}


// ==========================================================
// 56. 記憶テスト前のカウントダウン
// ==========================================================

function startMemoryCountdown() {

    phase = "countdown";

    showScreen(
        countdownScreen
    );


    let count =
        INTRO_COUNTDOWN;


    if (countdownText) {

        countdownText.textContent =
            count;

    }


    clearInterval(
        countdownTimer
    );


    countdownTimer =
        setInterval(() => {

            count--;


            if (countdownText) {

                countdownText.textContent =
                    count;

            }


            if (count <= 0) {

                clearInterval(
                    countdownTimer
                );

                countdownTimer =
                    null;


                startMemoryTest();

            }

        }, 1000);

}


// ==========================================================
// 57. リセット
// ==========================================================

function resetApp() {

    running = false;

    phase = "setup";


    clearInterval(
        trainingTimer
    );

    clearInterval(
        countdownTimer
    );

    clearTimeout(
        memoryTimer
    );


    trainingTimer = null;

    countdownTimer = null;

    memoryTimer = null;


    squatCount = 0;

    jumpCount = 0;

    highKneeCount = 0;

    gripCount = 0;


    calories = 0;

    score = 0;


    beforeMemoryScore = 0;

    afterMemoryScore = 0;


    currentExercise = 0;

    elapsedTraining = 0;

    exerciseElapsed = 0;

    completedExercises = 0;


    resetExerciseStates();


    if (warning) {

        warning.style.display =
            "none";

    }


    if (canvas && ctx) {

        ctx.clearRect(
            0,
            0,
            canvas.width,
            canvas.height
        );

    }


    updateUI();


    showSetup();

}


// ==========================================================
// 58. イベント設定
// ==========================================================

if (startBtn) {

    startBtn.addEventListener(
        "click",
        startApp
    );

}


if (submitMemoryBtn) {

    submitMemoryBtn.addEventListener(
        "click",
        submitMemory
    );

}


if (giveUpBtn) {

    giveUpBtn.addEventListener(
        "click",
        giveUpMemory
    );

}


if (startTrainingBtn) {

    startTrainingBtn.addEventListener(
        "click",
        startTraining
    );

}


if (endTrainingBtn) {

    endTrainingBtn.addEventListener(
        "click",
        finishTraining
    );

}


if (retryBtn) {

    retryBtn.addEventListener(
        "click",
        resetApp
    );

}


if (resetBtn) {

    resetBtn.addEventListener(
        "click",
        resetApp
    );

}


// ==========================================================
// 59. Enterキーでも記憶テスト提出
// ==========================================================

if (memoryAnswerInput) {

    memoryAnswerInput.addEventListener(
        "keydown",
        event => {

            if (
                event.key === "Enter"
            ) {

                submitMemory();

            }

        }
    );

}


// ==========================================================
// 60. ページ読み込み時
// ==========================================================

document.addEventListener(
    "DOMContentLoaded",
    () => {

        phase = "setup";

        running = false;

        hideAllScreens();

        if (setupScreen) {

            setupScreen.style.display =
                "flex";

        }

        updateUI();

    }
);


// ==========================================================
// 61. ページを閉じるときにカメラ停止
// ==========================================================

window.addEventListener(
    "beforeunload",
    () => {

        running = false;


        if (stream) {

            stream
                .getTracks()
                .forEach(track => {

                    track.stop();

                });

        }

    }
);