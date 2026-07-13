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