// ----------------------------
// 基本設定
// ----------------------------
let video = document.getElementById("video");

// Three.js シーン
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.01, 100);
camera.position.z = 2;

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// 手の骨格ライン（MediaPipeの手の接続）
const HAND_CONNECTIONS = [
    [0,1],[1,2],[2,3],[3,4],      // 親指
    [0,5],[5,6],[6,7],[7,8],      // 人差し指
    [5,9],[9,10],[10,11],[11,12], // 中指
    [9,13],[13,14],[14,15],[15,16], // 薬指
    [13,17],[17,18],[18,19],[19,20], // 小指
    [0,17] // 手の甲
];

// Three.js ラインを準備
let lineMaterial = new THREE.LineBasicMaterial({ color: 0x00ffcc });
let points = [];
for (let i = 0; i < 21; i++) points.push(new THREE.Vector3(0, 0, 0));
let handGeometry = new THREE.BufferGeometry().setFromPoints(points);
let handLine = new THREE.LineSegments(handGeometry, lineMaterial);
scene.add(handLine);

// ----------------------------
// カメラ起動
// ----------------------------
navigator.mediaDevices.getUserMedia({ video: true }).then(stream => {
    video.srcObject = stream;
});

// ----------------------------
// MediaPipe HandLandmarker
// ----------------------------
let handLandmarker;
const vision = await FilesetResolver.forVisionTasks(
    "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0/wasm"
);
handLandmarker = await HandLandmarker.createFromOptions(vision, {
    baseOptions: {
        modelAssetPath:
            "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0/wasm/hand_landmarker.task"
    },
    runningMode: "video",
    numHands: 1
});

let lastVideoTime = -1;

// ----------------------------
// 毎フレーム処理
// ----------------------------
function animate() {
    requestAnimationFrame(animate);
    renderer.render(scene, camera);

    if (!handLandmarker) return;
    if (video.readyState < 2) return;

    // 同じフレームを再処理しないことで高速化
    if (video.currentTime === lastVideoTime) return;
    lastVideoTime = video.currentTime;

    const results = handLandmarker.detectForVideo(video, performance.now());
    if (!results.landmarks || results.landmarks.length === 0) return;

    const lm = results.landmarks[0];

    // 21点の座標を Three.js 用に変換
    const verts = [];
    HAND_CONNECTIONS.forEach(pair => {
        const [a, b] = pair;

        verts.push(new THREE.Vector3(
            (lm[a].x - 0.5) * 1.6,
            -(lm[a].y - 0.5) * 1.6,
            -lm[a].z * 0.5
        ));
        verts.push(new THREE.Vector3(
            (lm[b].x - 0.5) * 1.6,
            -(lm[b].y - 0.5) * 1.6,
            -lm[b].z * 0.5
        ));
    });

    handGeometry.setFromPoints(verts);
}

animate();
