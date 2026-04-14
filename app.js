const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

let video;
let detector;
let hands;
let handResults = [];

let frameCount = 0;

// ===== 骨格 =====
const bodyConnections = [
  ['left_shoulder','right_shoulder'],
  ['left_shoulder','left_elbow'],
  ['left_elbow','left_wrist'],
  ['right_shoulder','right_elbow'],
  ['right_elbow','right_wrist']
];

const fingerConnections = [
  [0,1],[1,2],[2,3],[3,4],
  [0,5],[5,6],[6,7],[7,8],
  [5,9],[9,10],[10,11],[11,12],
  [9,13],[13,14],[14,15],[15,16],
  [13,17],[17,18],[18,19],[19,20]
];

// ===== カメラ =====
async function setupCamera(){
  video = document.createElement("video");
  video.autoplay = true;
  video.playsInline = true;

  const stream = await navigator.mediaDevices.getUserMedia({
    video: { width:480, height:360, facingMode:"user" }
  });

  video.srcObject = stream;
  await new Promise(res => video.onloadedmetadata = res);
}

// ===== 描画 =====
function drawBody(kp){
  kp.forEach(p=>{
    if(p.score > 0.3){
      ctx.beginPath();
      ctx.arc(p.x,p.y,3,0,Math.PI*2);
      ctx.fillStyle="red";
      ctx.fill();
    }
  });

  bodyConnections.forEach(([a,b])=>{
    const p1 = kp.find(k=>k.name===a);
    const p2 = kp.find(k=>k.name===b);

    if(p1 && p2 && p1.score>0.3 && p2.score>0.3){
      ctx.beginPath();
      ctx.moveTo(p1.x,p1.y);
      ctx.lineTo(p2.x,p2.y);
      ctx.strokeStyle="lime";
      ctx.stroke();
    }
  });
}

function drawHands(){
  handResults.forEach(hand=>{
    hand.forEach(p=>{
      ctx.beginPath();
      ctx.arc(p.x*canvas.width,p.y*canvas.height,2,0,Math.PI*2);
      ctx.fillStyle="cyan";
      ctx.fill();
    });

    fingerConnections.forEach(([a,b])=>{
      const p1=hand[a];
      const p2=hand[b];

      ctx.beginPath();
      ctx.moveTo(p1.x*canvas.width,p1.y*canvas.height);
      ctx.lineTo(p2.x*canvas.width,p2.y*canvas.height);
      ctx.strokeStyle="yellow";
      ctx.stroke();
    });
  });
}

// ===== 初期化 =====
async function init(){
  await setupCamera();

  // 軽量 MultiPose
  detector = await poseDetection.createDetector(
    poseDetection.SupportedModels.MoveNet,
    {
      modelType: "MultiPose.Lightning" // ← 軽量化
    }
  );

  hands = new Hands({
    locateFile: file =>
      `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
  });

  hands.setOptions({
    maxNumHands: 2,
    modelComplexity: 0
  });

  hands.onResults(res=>{
    handResults = res.multiHandLandmarks || [];
  });

  loop();
}

// ===== ループ =====
async function loop(){
  ctx.drawImage(video,0,0,canvas.width,canvas.height);

  // ---- 体（複数人）----
  const poses = await detector.estimatePoses(video);
  poses.forEach(p=>{
    drawBody(p.keypoints);
  });

  // ---- 手（間引きで軽量化）----
  frameCount++;
  if(frameCount % 3 === 0){
    await hands.send({image: video});
  }

  drawHands();

  requestAnimationFrame(loop);
}

init();
