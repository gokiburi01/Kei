const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

let video, detector, hands;

// 下半身を含む骨格線
const bodyConnections = [
  ["left_shoulder", "right_shoulder"],
  ["left_shoulder", "left_elbow"],
  ["left_elbow", "left_wrist"],
  ["right_shoulder", "right_elbow"],
  ["right_elbow", "right_wrist"],

  // 下半身
  ["left_shoulder", "left_hip"],
  ["right_shoulder", "right_hip"],
  ["left_hip", "right_hip"],
  ["left_hip", "left_knee"],
  ["left_knee", "left_ankle"],
  ["right_hip", "right_knee"],
  ["right_knee", "right_ankle"]
];

// 手指の線
const fingerConnections = [
  [0,1],[1,2],[2,3],[3,4],
  [0,5],[5,6],[6,7],[7,8],
  [5,9],[9,10],[10,11],[11,12],
  [9,13],[13,14],[14,15],[15,16],
  [13,17],[17,18],[18,19],[19,20]
];

// カメラ
async function setupCamera(){
  video = document.createElement("video");
  video.autoplay = true;
  video.playsInline = true;

  const stream = await navigator.mediaDevices.getUserMedia({
    video: { width: 640, height: 480, facingMode: "user" }
  });

  video.srcObject = stream;
  await new Promise(res => video.onloadedmetadata = res);
}

// 骨格描画
function drawBody(keypoints){
  keypoints.forEach(p => {
    if(p.score > 0.3){
      ctx.beginPath();
      ctx.arc(p.x, p.y, 4, 0, Math.PI*2);
      ctx.fillStyle = "red";
      ctx.fill();
    }
  });

  bodyConnections.forEach(([a,b])=>{
    const p1 = keypoints.find(k => k.name === a);
    const p2 = keypoints.find(k => k.name === b);
    if(p1 && p2 && p1.score>0.3 && p2.score>0.3){
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.strokeStyle = "lime";
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  });
}

// 手描画
function drawHands(results){
  results.multiHandLandmarks &&
    results.multiHandLandmarks.forEach(hand => {
      // 点
      hand.forEach(p=>{
        ctx.beginPath();
        ctx.arc(p.x * canvas.width, p.y * canvas.height, 3, 0, Math.PI*2);
        ctx.fillStyle = "cyan";
        ctx.fill();
      });
      // 線
      fingerConnections.forEach(([a,b])=>{
        const p1 = hand[a], p2 = hand[b];
        ctx.beginPath();
        ctx.moveTo(p1.x * canvas.width, p1.y * canvas.height);
        ctx.lineTo(p2.x * canvas.width, p2.y * canvas.height);
        ctx.strokeStyle = "yellow";
        ctx.lineWidth = 2;
        ctx.stroke();
      });
    });
}

// メイン
async function init(){
  await setupCamera();

  detector = await poseDetection.createDetector(
    poseDetection.SupportedModels.MoveNet,
    { modelType: "SinglePose.Lightning" }
  );

  hands = new Hands({
    locateFile: file => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
  });

  hands.setOptions({
    maxNumHands: 2,
    minDetectionConfidence: 0.6,
    minTrackingConfidence: 0.6
  });

  hands.onResults(drawHands);

  async function loop(){
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const poses = await detector.estimatePoses(video);
    poses.forEach(p => drawBody(p.keypoints));

    await hands.send({image: video});

    requestAnimationFrame(loop);
  }

  loop();
}

init();
