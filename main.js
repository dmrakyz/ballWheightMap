import * as THREE from 'three';
import * as CANNON from 'cannon';
import { OrbitControls } from '/library/OrbitControls.js';
import { createHeightfield } from '/library/maplifter.js';

// Constants
const PI = Math.PI;
const MAX_ANGULAR_VELOCITY = 40;
const FIXED_DISTANCE = 5;

// Paths
const SKY_TEXTURE_PATH = 'images/skyTextures/stars.png';
const BALL_TEXTURE_PATH = 'images/ballTextures/granite/Granite07.png';
const HEIGHTMAP_PATH = '/images/heightMaps/heightMap1.png';

// Scene setup
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// World setup
const world = new CANNON.World({ gravity: new CANNON.Vec3(0, -9.82, 0) });

// ucube
const ucubeBody = new CANNON.Body({
    mass: 6,
    position: new CANNON.Vec3(0, 2, 0),
    shape: new CANNON.Sphere(0.5),
    material: new CANNON.Material('ucubeCaM'),
    angularDamping: 0.5
});
world.addBody(ucubeBody);

// Texture and material helper
function createTexturedMaterial(texturePath, repeatX, repeatY) {
    const texture = new THREE.TextureLoader().load(texturePath);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(repeatX, repeatY);
    return new THREE.MeshStandardMaterial({ map: texture });
}

// Sky setup
const skyGeometry = new THREE.SphereGeometry(256, 360, 360);
const skyMaterial = new THREE.MeshBasicMaterial({ 
    map: createTexturedMaterial(SKY_TEXTURE_PATH, 360, 360).map, 
    side: THREE.BackSide 
});
const sky = new THREE.Mesh(skyGeometry, skyMaterial);
scene.add(sky);

// ucube setup
const ucubeGeometry = new THREE.SphereGeometry(0.5, 360, 360);
const ucubeMaterial = new THREE.MeshStandardMaterial({ map: createTexturedMaterial(BALL_TEXTURE_PATH, 1, 1).map });
const ucube = new THREE.Mesh(ucubeGeometry, ucubeMaterial);
scene.add(ucube);

// Lighting setup
scene.add(new THREE.AmbientLight(0x404040, 0.7));
const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
directionalLight.position.set(0, 10, 0);
directionalLight.castShadow = true;
directionalLight.shadow.mapSize.set(1024, 1024);
scene.add(directionalLight);

// Controls setup
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.25;
controls.maxPolarAngle = PI / 2;
camera.position.set(0, 2, 5);
controls.target.copy(ucube.position);
controls.update();

// heightfield
createHeightfield(HEIGHTMAP_PATH, 256, 256, 50).then(heightMapMesh => {
    heightMapMesh.rotation.x = -PI / 2;
    heightMapMesh.position.y = -25;
    scene.add(heightMapMesh);

    const heightData = [];
    const shape = new CANNON.Heightfield(heightData, { elementSize: 1 });
    const heightfieldBody = new CANNON.Body({
        mass: 0,
        position: new CANNON.Vec3(0, 0, 0)
    });
    
    heightfieldBody.addShape(shape);
    world.addBody(heightfieldBody);
});

// Game logic
let isMovingForward = false;
let isFollowingBall = true;

function Zynthify() {
    world.step(1 / 60);

    if (isMovingForward) {
        const forwardDirection = new THREE.Vector3();
        camera.getWorldDirection(forwardDirection);
forwardDirection.y = 0;
forwardDirection.normalize();
ucubeBody.applyTorque(new CANNON.Vec3(forwardDirection.z * 20, 0, -forwardDirection.x * 20));
    }

    if (ucubeBody.angularVelocity.length() > MAX_ANGULAR_VELOCITY) {
        ucubeBody.angularVelocity.scale(MAX_ANGULAR_VELOCITY / ucubeBody.angularVelocity.length());
    }

    ucube.position.copy(ucubeBody.position);
    ucube.quaternion.copy(ucubeBody.quaternion);

    if (isFollowingBall) {
        controls.target.copy(ucube.position);
const direction = new THREE.Vector3();
        direction.copy(controls.target).sub(camera.position).normalize();
        camera.position.copy(controls.target).sub(direction.multiplyScalar(FIXED_DISTANCE));
    }

    controls.update();
    renderer.render(scene, camera);
}

renderer.setAnimationLoop(Zynthify);

// Event listeners
function updateButtonVisibility() {
jumpButton.style.display = moveForwardButton.style.display = isFollowingBall ? 'block' : 'none';
toggleCameraButton.style.display = 'block';
}

document.getElementById('toggleCameraButton').addEventListener('click', () => {
isFollowingBall = !isFollowingBall;
controls.minDistance = isFollowingBall ? 5 : -Infinity;
controls.maxDistance = Infinity;
controls.maxPolarAngle = isFollowingBall ? PI / 2 : PI;
controls.update();
updateButtonVisibility();
});

document.getElementById('jumpButton').addEventListener('touchstart', () => {
if (Math.abs(ucubeBody.velocity.y) < 0.1) {
ucubeBody.velocity.y = 5;
}
});

const moveForwardButtonElement = document.getElementById('moveForwardButton');
moveForwardButtonElement.addEventListener('touchstart', () => { isMovingForward = true; });
moveForwardButtonElement.addEventListener('touchend', () => { isMovingForward = false; });

updateButtonVisibility();
window.addEventListener('touchstart', () => goFullscreen(), { once: true });