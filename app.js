const INTRO_COUNTDOWN = 10, MEMORY_TIME = 15, MEMORY_LENGTH = 20;
const EXERCISE_TIME = 40, TOTAL_EXERCISES = 30, GOAL_REPS = 15, SCORE_THRESHOLD = 0.3;
// 描画・姿勢推定は端末性能によらず最大30fpsにそろえる。手の推定は十分な判定精度を
// 保てる12.5fpsに限定し、グーパー運動だけが重くなるのを防ぐ。
const TARGET_FPS = 30, FRAME_INTERVAL = 1000 / TARGET_FPS, HAND_INTERVAL = 80;
const $ = (id) => document.getElementById(id);
const setupScreen = $("setupScreen"), loadingScreen = $("loadingScreen"), countdownScreen = $("countdownScreen");
const memoryScreen = $("memoryScreen"), answerScreen = $("answerScreen"), beforeMemoryResultScreen = $("beforeMemoryResultScreen");
const trainingScreen = $("trainingScreen"), resultScreen = $("resultScreen");
const screens = [setupScreen, loadingScreen, countdownScreen, memoryScreen, answerScreen, beforeMemoryResultScreen, trainingScreen, resultScreen];
const heightInput = $("heightInput"), weightInput = $("weightInput"), genderInput = $("genderInput"), ageGroupInput = $("ageGroup");
const startBtn = $("startBtn"), loadingText = $("loadingText"), countdownNumber = $("countdownNumber");
const memoryDigits = $("memoryDigits"), memoryTimer = $("memoryTimer"), memoryAnswerInput = $("memoryAnswerInput");
const submitAnswerBtn = $("submitAnswer"), giveUpBtn = $("giveUpBtn"), beforeRate = $("beforeRate"), beforeCorrect = $("beforeCorrect");
const startTrainingBtn = $("startTrainingBtn"), video = $("video"), canvas = $("canvas"), ctx = canvas.getContext("2d");
const warning = $("warning"), exerciseName = $("exerciseName"), exerciseTarget = $("exerciseTarget"), progressText = $("progressText");
const exerciseGoal = $("exerciseGoal");
const kcal = $("kcal"), fpsValue = $("fpsValue"), resetBtn = $("resetBtn");
const beforeCorrectResult = $("beforeCorrectResult"), beforeRateResult = $("beforeRateResult");
const afterCorrectResult = $("afterCorrectResult"), afterRateResult = $("afterRateResult"), improveRate = $("improveRate");
const resultSquat = $("resultSquat"), resultJump = $("resultJump"), resultKcal = $("resultKcal"), restartBtn = $("restartBtn");

const exercises = [
    { name: "グーパー運動", type: "grip" }, { name: "もも上げ", type: "highKnee" },
    { name: "スクワット", type: "squat" }, { name: "ジャンプ", type: "jump" }
];
const skeleton = [[5,7],[7,9],[6,8],[8,10],[5,6],[5,11],[6,12],[11,12],[11,13],[13,15],[12,14],[14,16]];
let phase = "before", randomDigits = "";
let beforeCorrectCount = 0, afterCorrectCount = 0, beforeScore = 0, afterScore = 0, improveScore = 0;
let detector = null, handDetector = null, cameraStream = null, running = false;
let gripCount = 0, highKneeCount = 0, squatCount = 0, jumpCount = 0, calorie = 0, currentExercise = 0, completedExercises = 0, remainExerciseTime = EXERCISE_TIME;
let squatState = "UP", kneeState = false, jumpCooldown = 0, prevHipY = null;
let handLandmarks = [], handDetectionPending = false, lastHandDetectionAt = 0, handResultVersion = 0, processedHandResultVersion = 0, gripPhase = "closed", gripPhaseEndsAt = 0, gripPhaseValidated = false, gripStableFrames = 0;
let countdownTimer = null, memoryTimerId = null, trainingTimer = null, animationId = null, fpsFrame = 0, lastFpsTime = performance.now(), lastInferenceAt = 0;

function showScreen(screen) { screens.forEach((item) => item.classList.add("hidden")); screen.classList.remove("hidden"); }
function clearTimers() {
    clearInterval(countdownTimer); clearInterval(memoryTimerId); clearInterval(trainingTimer);
    countdownTimer = memoryTimerId = trainingTimer = null;
}
function resetMemory() {
    phase = "before"; randomDigits = "";
    beforeCorrectCount = afterCorrectCount = beforeScore = afterScore = improveScore = 0;
    memoryAnswerInput.value = "";
}
function resetTraining() {
    running = false; gripCount = highKneeCount = squatCount = jumpCount = calorie = currentExercise = completedExercises = 0;
    remainExerciseTime = EXERCISE_TIME; squatState = "UP"; kneeState = false; jumpCooldown = 0; prevHipY = null;
    handLandmarks = []; handDetectionPending = false; lastHandDetectionAt = 0; handResultVersion = processedHandResultVersion = 0; gripStableFrames = 0;
    updateTrainingUI();
}
function updateTrainingUI() { kcal.textContent = calorie.toFixed(1); }
function updateResultUI() {
    beforeCorrectResult.textContent = beforeCorrectCount + " / " + MEMORY_LENGTH;
    beforeRateResult.textContent = beforeScore + "%"; afterCorrectResult.textContent = afterCorrectCount + " / " + MEMORY_LENGTH;
    afterRateResult.textContent = afterScore + "%"; improveRate.textContent = (improveScore >= 0 ? "+" : "") + improveScore + "%";
    resultSquat.textContent = squatCount + "回"; resultJump.textContent = jumpCount + "回"; resultKcal.textContent = calorie.toFixed(1) + " kcal";
}
function generateDigits() { return Array.from({ length: MEMORY_LENGTH }, () => Math.floor(Math.random() * 10)).join(""); }
function countCorrect(answer, correct) {
    return Array.from({ length: MEMORY_LENGTH }, (_, index) => answer[index] === correct[index]).filter(Boolean).length;
}

function startApp() { clearTimers(); resetMemory(); resetTraining(); randomDigits = generateDigits(); startCountdown(); }
function startCountdown() {
    showScreen(countdownScreen); let seconds = INTRO_COUNTDOWN; countdownNumber.textContent = seconds;
    countdownTimer = setInterval(() => {
        countdownNumber.textContent = --seconds;
        if (seconds <= 0) { clearInterval(countdownTimer); countdownTimer = null; startMemory(); }
    }, 1000);
}
function startMemory() {
    showScreen(memoryScreen);
    memoryDigits.textContent = randomDigits.slice(0, 10) + "\n" + randomDigits.slice(10);
    let seconds = MEMORY_TIME; memoryTimer.textContent = seconds;
    memoryTimerId = setInterval(() => {
        memoryTimer.textContent = --seconds;
        if (seconds <= 0) { clearInterval(memoryTimerId); memoryTimerId = null; showAnswer(); }
    }, 1000);
}
function showAnswer() { showScreen(answerScreen); memoryAnswerInput.value = ""; memoryAnswerInput.focus(); }
function submitMemory(giveUp = false) {
    const answer = giveUp ? "" : String(memoryAnswerInput.value).replace(/\D/g, "");
    const correct = countCorrect(answer, randomDigits), score = Math.round(correct * 100 / MEMORY_LENGTH);
    if (phase === "before") {
        beforeCorrectCount = correct; beforeScore = score; beforeRate.textContent = score;
        beforeCorrect.textContent = correct + " / " + MEMORY_LENGTH; showScreen(beforeMemoryResultScreen); return;
    }
    afterCorrectCount = correct; afterScore = score; improveScore = afterScore - beforeScore; updateResultUI(); showScreen(resultScreen);
}

async function prepareTraining() {
    showScreen(loadingScreen);
    try {
        loadingText.textContent = "カメラを起動しています..."; await setupCamera();
        loadingText.textContent = "AIを読み込んでいます..."; await setupDetector(); await setupHandDetector(); startTraining();
    } catch (error) {
        console.error("トレーニングの準備に失敗しました", error);
        loadingText.textContent = "カメラまたはAIを開始できませんでした。カメラの許可と通信状態を確認してください。";
        setTimeout(() => showScreen(beforeMemoryResultScreen), 2500);
    }
}
async function setupCamera() {
    if (cameraStream) return;
    if (!navigator.mediaDevices?.getUserMedia) throw new Error("このブラウザはカメラに対応していません");
    cameraStream = await navigator.mediaDevices.getUserMedia({
        video: {
            facingMode: "user",
            // 高解像度の入力は推論量を大きく増やすため、運動判定に十分なVGA/30fpsを要求する。
            width: { ideal: 640, max: 640 }, height: { ideal: 480, max: 480 },
            frameRate: { ideal: TARGET_FPS, max: TARGET_FPS }
        },
        audio: false
    });
    video.srcObject = cameraStream;
    await new Promise((resolve) => {
        video.onloadedmetadata = async () => {
            await video.play(); canvas.width = video.videoWidth || 1280; canvas.height = video.videoHeight || 720; resolve();
        };
    });
}
async function setupDetector() {
    if (detector) return;
    if (!window.tf || !window.poseDetection) throw new Error("MoveNetの読み込みに失敗しました");
    await tf.setBackend("webgl"); await tf.ready();
    detector = await poseDetection.createDetector(poseDetection.SupportedModels.MoveNet, { modelType: poseDetection.movenet.modelType.SINGLEPOSE_LIGHTNING });
}
async function setupHandDetector() {
    if (handDetector) return;
    if (!window.Hands) throw new Error("手の検出AIの読み込みに失敗しました");
    handDetector = new Hands({ locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}` });
    handDetector.setOptions({
        maxNumHands: 2,
        modelComplexity: 0,
        minDetectionConfidence: 0.75,
        minTrackingConfidence: 0.75,
        selfieMode: true
    });
    handDetector.onResults((results) => {
        handLandmarks = results.multiHandLandmarks || [];
        handResultVersion += 1;
        handDetectionPending = false;
    });
}
function startTraining() {
    showScreen(trainingScreen); running = true; fpsFrame = 0; lastFpsTime = performance.now(); lastInferenceAt = 0; startExercise();
    animationId = requestAnimationFrame(poseLoop);
}
function startExercise() {
    const exercise = exercises[currentExercise]; remainExerciseTime = EXERCISE_TIME; exerciseName.textContent = exercise.name;
    if (exercise.type === "grip") {
        gripPhase = "closed"; gripPhaseEndsAt = performance.now() + 5000;
        gripPhaseValidated = false; gripStableFrames = 0; processedHandResultVersion = handResultVersion; updateGripInstruction();
    }
    updateExerciseGoal();
    progressText.textContent = (completedExercises + 1) + " / " + TOTAL_EXERCISES + " セット";
    if (exercise.type !== "grip") exerciseTarget.textContent = "残り " + remainExerciseTime + " 秒";
    clearInterval(trainingTimer);
    trainingTimer = setInterval(() => {
        remainExerciseTime -= 1;
        if (exercise.type === "grip") updateGripPhase(performance.now());
        else exerciseTarget.textContent = "残り " + remainExerciseTime + " 秒";
        if (remainExerciseTime <= 0) nextExercise();
    }, 1000);
}
function nextExercise() {
    clearInterval(trainingTimer); completedExercises += 1;
    if (completedExercises >= TOTAL_EXERCISES) { finishTraining(); return; }
    currentExercise = (currentExercise + 1) % exercises.length; startExercise();
}
function finishTraining() {
    clearTimers(); running = false; cancelAnimationFrame(animationId); phase = "after"; startCountdown();
}

function showWarning(message) { warning.textContent = message; warning.style.display = message ? "block" : "none"; }
function isGripPoseVisible(points) {
    return [5,6,9,10].every((index) => points[index]?.score >= SCORE_THRESHOLD);
}
async function poseLoop(now = performance.now()) {
    if (!running) return;
    if (now - lastInferenceAt < FRAME_INTERVAL) {
        animationId = requestAnimationFrame(poseLoop);
        return;
    }
    lastInferenceAt = now;
    try {
        const poses = await detector.estimatePoses(video); drawCamera();
        if (exercises[currentExercise]?.type === "grip") requestHandDetection();
        // 人物未検出・全身が入っていない場合はメッセージを表示せず、映像だけを維持する。
        if (!poses.length) showWarning("");
        else if (exercises[currentExercise]?.type === "grip" && !isGripPoseVisible(poses[0].keypoints)) showWarning("両手を肩の前でカメラに向けてください");
        else { showWarning(""); drawSkeleton(poses[0].keypoints); executeExercise(poses[0].keypoints); }
        updateTrainingUI(); updateFPS();
    } catch (error) { console.error("姿勢推定に失敗しました", error); }
    if (running) animationId = requestAnimationFrame(poseLoop);
}
function drawCamera() {
    ctx.save(); ctx.translate(canvas.width, 0); ctx.scale(-1, 1); ctx.drawImage(video, 0, 0, canvas.width, canvas.height); ctx.restore();
}
function drawSkeleton(points) {
    ctx.lineWidth = 4; ctx.strokeStyle = "#00e5ff";
    skeleton.forEach(([a,b]) => {
        const first = points[a], second = points[b];
        if (first.score < SCORE_THRESHOLD || second.score < SCORE_THRESHOLD) return;
        ctx.beginPath(); ctx.moveTo(canvas.width - first.x, first.y); ctx.lineTo(canvas.width - second.x, second.y); ctx.stroke();
    });
}
function executeExercise(points) {
    switch (exercises[currentExercise].type) {
        case "grip": {
            // 同じHands結果を30fpsの姿勢ループで繰り返し数えない。
            if (handResultVersion !== processedHandResultVersion) {
                processedHandResultVersion = handResultVersion;
                detectGrip();
            }
            break;
        }
        case "highKnee": detectHighKnee(points); break;
        case "squat": detectSquat(points); break; case "jump": detectJump(points); break;
    }
    updateExerciseGoal();
}
function currentExerciseCount() {
    switch (exercises[currentExercise].type) {
        case "grip": return gripCount;
        case "highKnee": return highKneeCount;
        case "squat": return squatCount;
        case "jump": return jumpCount;
        default: return 0;
    }
}
function updateExerciseGoal() {
    const count = currentExerciseCount();
    exerciseGoal.textContent = count >= GOAL_REPS
        ? "クリア！ " + count + "回　そのまま続けてもよいです"
        : "目標 " + GOAL_REPS + "回　現在 " + count + "回";
    exerciseGoal.classList.toggle("isCleared", count >= GOAL_REPS);
}
function getAngle(a, b, c) {
    const ab = { x: a.x - b.x, y: a.y - b.y }, cb = { x: c.x - b.x, y: c.y - b.y };
    const size = Math.hypot(ab.x, ab.y) * Math.hypot(cb.x, cb.y);
    return size ? Math.acos(Math.max(-1, Math.min(1, (ab.x * cb.x + ab.y * cb.y) / size))) * 180 / Math.PI : 180;
}
function detectSquat(points) {
    const [hip,knee,ankle] = [points[11],points[13],points[15]];
    if (![hip,knee,ankle].every((point) => point.score >= SCORE_THRESHOLD)) return;
    const angle = getAngle(hip,knee,ankle);
    if (squatState === "UP" && angle < 100) squatState = "DOWN";
    if (squatState === "DOWN" && angle > 160) { squatState = "UP"; squatCount += 1; calorie += 0.32; }
}
function detectJump(points) {
    const hip = points[11]; if (hip.score < SCORE_THRESHOLD) return;
    if (prevHipY === null) { prevHipY = hip.y; return; }
    if (jumpCooldown > 0) { jumpCooldown -= 1; prevHipY = hip.y; return; }
    if (prevHipY - hip.y > 35) { jumpCount += 1; calorie += 0.45; jumpCooldown = 15; }
    prevHipY = hip.y;
}
function requestHandDetection() {
    const now = performance.now();
    if (!handDetector || handDetectionPending || now - lastHandDetectionAt < HAND_INTERVAL) return;
    lastHandDetectionAt = now;
    handDetectionPending = true;
    handDetector.send({ image: video }).catch((error) => {
        console.error("手の検出に失敗しました", error);
        handDetectionPending = false;
    });
}
function distance(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }
function handGesture(landmarks) {
    // 手の大きさに対する指先距離と、4本の指の第2関節の角度を組み合わせる。
    // どちらか一方だけでは誤判定しやすいため、両方を満たす時だけ確定する。
    const palmWidth = Math.max(distance(landmarks[5], landmarks[17]), 0.001);
    const fingers = [[5,6,8], [9,10,12], [13,14,16], [17,18,20]];
    const tipDistance = fingers.reduce((sum, [, , tip]) => sum + distance(landmarks[tip], landmarks[0]), 0) / fingers.length / palmWidth;
    const angles = fingers.map(([base, joint, tip]) => getAngle(landmarks[base], landmarks[joint], landmarks[tip]));
    const bentFingers = angles.filter((angle) => angle < 125).length;
    const straightFingers = angles.filter((angle) => angle > 150).length;
    if (tipDistance < 1.45 && bentFingers >= 3) return "closed";
    if (tipDistance > 1.9 && straightFingers >= 3) return "open";
    return "unknown";
}
function detectGrip() {
    if (handLandmarks.length !== 2) {
        gripStableFrames = 0;
        showWarning("両手を前に出し、手のひらをカメラに向けてください");
        return;
    }
    const states = handLandmarks.map(handGesture);
    const expected = gripPhase;
    if (states.every((state) => state === expected)) {
        gripStableFrames += 1;
        // Handsは12.5fpsに間引いているため、約0.24秒の安定検出で確定する。
        if (gripStableFrames >= 3) gripPhaseValidated = true;
    } else {
        gripStableFrames = 0;
        showWarning(gripPhase === "closed" ? "両手をしっかり握ってください" : "両手の指を大きく開いてください");
    }
}
function updateGripInstruction() {
    const remaining = Math.max(0, Math.ceil((gripPhaseEndsAt - performance.now()) / 1000));
    const instruction = gripPhase === "closed" ? "握ってください" : "手を開いてください";
    exerciseTarget.textContent = `${instruction}（あと ${remaining} 秒）`;
    exerciseTarget.classList.toggle("openHand", gripPhase === "open");
}
function updateGripPhase(now) {
    if (exercises[currentExercise]?.type !== "grip") return;
    while (now >= gripPhaseEndsAt) {
        if (gripPhase === "open" && gripPhaseValidated) { gripCount += 1; calorie += 0.02; }
        gripPhase = gripPhase === "closed" ? "open" : "closed";
        gripPhaseEndsAt += 5000;
        gripPhaseValidated = false; gripStableFrames = 0;
        updateExerciseGoal();
    }
    updateGripInstruction();
}
function detectHighKnee(points) {
    const [hip,knee] = [points[11],points[13]];
    if (![hip,knee].every((point) => point.score >= SCORE_THRESHOLD)) return;
    if (knee.y < hip.y && !kneeState) { kneeState = true; highKneeCount += 1; calorie += 0.05; }
    if (knee.y > hip.y) kneeState = false;
}
function updateFPS() {
    fpsFrame += 1; const now = performance.now();
    if (now - lastFpsTime >= 1000) { fpsValue.textContent = Math.round(fpsFrame * 1000 / (now - lastFpsTime)); fpsFrame = 0; lastFpsTime = now; }
}
function stopCamera() {
    cameraStream?.getTracks().forEach((track) => track.stop()); cameraStream = null; video.srcObject = null;
}
function restartApp() {
    clearTimers(); running = false; cancelAnimationFrame(animationId); stopCamera(); resetMemory(); resetTraining();
    beforeRate.textContent = "0"; beforeCorrect.textContent = "0 / " + MEMORY_LENGTH; updateResultUI(); showScreen(setupScreen);
}

startBtn.addEventListener("click", startApp);
submitAnswerBtn.addEventListener("click", () => submitMemory(false));
giveUpBtn.addEventListener("click", () => submitMemory(true));
memoryAnswerInput.addEventListener("keydown", (event) => { if (event.key === "Enter") submitMemory(false); });
startTrainingBtn.addEventListener("click", prepareTraining);
resetBtn.addEventListener("click", restartApp);
restartBtn.addEventListener("click", restartApp);
window.addEventListener("beforeunload", stopCamera);
resetMemory(); resetTraining(); updateResultUI(); showScreen(setupScreen);
