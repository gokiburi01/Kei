const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

let video;
let detector;
let hands;

let handResults = [];
let frame = 0;

// ===== カメラ =====
async function setupCamera(){
  video = document.createElement("video");
  video.autoplay = true;
  video.playsInline = true;

  const stream = await navigator.mediaDevices.getUserMedia({
    video:{width:640,height:480,facingMode:"user"}
  });

  video.srcObject = stream;
  await new Promise(res=>video.onloadedmetadata=res);
}

// ===== 体の骨格（下半身あり） =====
const body = [
  ["left_shoulder","right_shoulder"],
  ["left_shoulder","left_elbow"],
  ["left_elbow","left_wrist"],
  ["right_shoulder","right_elbow"],
  ["right_elbow","right_wrist"],

  ["left_shoulder","left_hip"],
  ["right_shoulder","right_hip"],
  ["left_hip","right_hip"],

  ["left_hip","left_knee"],
  ["left_knee","left_ankle"],
  ["right_hip","right_knee"],
  ["right_knee","right_ankle"]
];

// ===== 指（21点） =====
const fingers = [
  [0,1],[1,2],[2,3],[3,4],
  [0,5],[5,6],[6,7],[7,8],
  [5,9],[9,10],[10,11],[11,12],
  [9,13],[13,14],[14,15],[15,16],
  [13,17],[17,18],[18,19],[19,20]
];

// ===== 体描画 =====
function drawBody(kp){
  body.forEach(([a,b])=>{
    const p1 = kp.find(k=>k.name===a);
    const p2 = kp.find(k=>k.name===b);

    if(p1 && p2 && p1.score>0.3 && p2.score>0.3){
      ctx.beginPath();
      ctx.moveTo(p1.x,p1.y);
      ctx.lineTo(p2.x,p2.y);
      ctx.strokeStyle="lime";
      ctx.lineWidth=3;
      ctx.stroke();
    }
  });
}

// ===== 手描画 =====
function drawHands(){
  handResults.forEach(hand=>{
    const pts = hand;

    // 点
    pts.forEach(p=>{
      ctx.beginPath();
      ctx.arc(p.x*canvas.width,p.y*canvas.height,2,0,Math.PI*2);
      ctx.fillStyle="cyan";
      ctx.fill();
    });

    // 指
    fingers.forEach(([a,b])=>{
      const p1=pts[a], p2=pts[b];
      ctx.beginPath();
      ctx.moveTo(p1.x*canvas.width,p1.y*canvas.height);
      ctx.lineTo(p2.x*canvas.width,p2.y*canvas.height);
      ctx.strokeStyle="yellow";
      ctx.lineWidth=2;
      ctx.stroke();
    });
  });
}

// ===== 初期化 =====
async function init(){
  await setupCamera();

  // 複数人（軽量）
  detector = await poseDetection.createDetector(
    poseDetection.SupportedModels.MoveNet,
    {
      modelType:"MultiPose.Lightning"
    }
  );

  // 手
  hands = new Hands({
    locateFile: file =>
      `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
  });

  hands.setOptions({
    maxNumHands:2,
    modelComplexity:0
  });

  hands.onResults(res=>{
    handResults = res.multiHandLandmarks || [];
  });

  loop();
}

// ===== ループ =====
async function loop(){
  ctx.drawImage(video,0,0,canvas.width,canvas.height);

  // ---- 体（毎フレーム）----
  const poses = await detector.estimatePoses(video);
  poses.forEach(p=>drawBody(p.keypoints));

  // ---- 手（間引き）----
  frame++;
  if(frame % 4 === 0){
    await hands.send({image:video});
  }

  drawHands();

  requestAnimationFrame(loop);
}

init();
