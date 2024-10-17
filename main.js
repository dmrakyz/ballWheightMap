import * as THREE from 'three';
import * as CANNON from 'cannon';
import { OrbitControls } from '/library/OrbitControls.js';
import { createHeightmap } from '/library/heightmap.js';

document.addEventListener('touchmove', function(event) {
    event.preventDefault();
}, { passive: false });

// Constants
const SKY_TEXTURE_PATH = 'images/skyTextures/stars.png';
const BALL_TEXTURE_PATH = 'images/ballTextures/granite/Granite07.png';
const PI = Math.PI;

// Scene and camera setup
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);

const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Physics world setup
const world = new CANNON.World({
    gravity: new CANNON.Vec3(0, -9.82, 0)
});

// Materials
const groundCaM = new CANNON.Material('groundCaM');
const ucubeCaM = new CANNON.Material('ucubeCaM');

const Ucube_GroundCM = new CANNON.ContactMaterial(groundCaM, ucubeCaM, {
    friction: 0.4,
    restitution: 0.4
});
world.addContactMaterial(Ucube_GroundCM);

// Load and create heightmap
const heightmapPath = 'images/heightMaps/heightMap.png'; // Heightmap image path
const scale = 24; // Height scaling factor
createHeightmap(scene, heightmapPath, scale, world); // Heightmap oluştur

// ucube setup
const ucubeBody = new CANNON.Body({
    mass: 6,
    shape: new CANNON.Sphere(0.5),
    position: new CANNON.Vec3(0, 2, 0),
    material: ucubeCaM
});
ucubeBody.angularDamping = 0.5;
world.addBody(ucubeBody);

// Utility function to create textured material
function createTexturedMaterial(texturePath, repeatX, repeatY) {
    const texture = new THREE.TextureLoader().load(texturePath);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(repeatX, repeatY);
    return new THREE.MeshStandardMaterial({ map: texture });
}

// Sky setup
const skyR = 256;
const skyG = new THREE.SphereGeometry(skyR, 360, 360);
const skyTex = new THREE.TextureLoader().load(SKY_TEXTURE_PATH);
skyTex.wrapS = THREE.RepeatWrapping;
skyTex.wrapT = THREE.RepeatWrapping;
skyTex.repeat.set(360, 360);
const skyM = new THREE.MeshBasicMaterial({ map: skyTex });
skyM.side = THREE.BackSide;
const sky = new THREE.Mesh(skyG, skyM);
scene.add(sky);

// ucube mesh setup
const ucubeG = new THREE.SphereGeometry(0.5, 360, 360);
const ballTex = new THREE.TextureLoader().load(BALL_TEXTURE_PATH);
const ucubeM = new THREE.MeshStandardMaterial({ 
    map: ballTex
});
const ucube = new THREE.Mesh(ucubeG, ucubeM);
scene.add(ucube);

// Lighting setup
const ambientLight = new THREE.AmbientLight(0x404040, 0.7);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
directionalLight.position.set(0, 10, 0);
directionalLight.castShadow = true;
directionalLight.shadow.mapSize.width = 1024;
directionalLight.shadow.mapSize.height = 1024;
directionalLight.shadow.camera.near = 0.5;
directionalLight.shadow.camera.far = 50; 
scene.add(directionalLight);

// Controls setup
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.25;
controls.maxPolarAngle = PI / 2;
controls.target.copy(ucube.position);
camera.position.set(0, 2, 5);
controls.minDistance = 5;
controls.maxDistance = Infinity;
controls.update();

// Initial state variables
let isMovingForward = false;
let isFollowingBall = true;
const fixedDistance = 5;
const MAX_ANGULAR_VELOCITY = 40;

// Game loop function
function Zynthify() {
    world.step(1 / 60);

    if (isMovingForward) {
        const forwardDirection = new THREE.Vector3();
        camera.getWorldDirection(forwardDirection);
        forwardDirection.y = 0;
        forwardDirection.normalize();

        const torque = new CANNON.Vec3(
            forwardDirection.z * 20,
            0,
            -forwardDirection.x * 20
        );
        ucubeBody.applyTorque(torque);
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
        camera.position.copy(controls.target).sub(direction.multiplyScalar(fixedDistance));
    }

    controls.update();
    renderer.render(scene, camera);
}

renderer.setAnimationLoop(Zynthify);

// Button visibility and event listeners
function updateButtonVisibility() {
    jumpButton.style.display = isFollowingBall ? 'block' : 'none';
    moveForwardButton.style.display = isFollowingBall ? 'block' : 'none';
    toggleCameraButton.style.display = 'block';
}

document.getElementById('toggleCameraButton').addEventListener('click', () => {
    isFollowingBall = !isFollowingBall;

    controls.minDistance = isFollowingBall ? 5 : -Infinity;
    controls.maxDistance = isFollowingBall ? Infinity : Infinity;
    controls.maxPolarAngle = isFollowingBall ? PI / 2 : PI;
    controls.target.set(ucube.position.x, ucube.position.y, ucube.position.z);

    updateButtonVisibility();
    controls.update();
});

updateButtonVisibility();

document.getElementById('jumpButton').addEventListener('touchstart', () => {
    if (Math.abs(ucubeBody.velocity.y) < 0.1) {
        ucubeBody.velocity.y = 5;
    }
});

// Optimized event listener for moving forward
const moveForwardButtonElement = document.getElementById('moveForwardButton');
moveForwardButtonElement.addEventListener('touchstart', () => {
    isMovingForward = true;
});
moveForwardButtonElement.addEventListener('touchend', () => {
    isMovingForward = false;
});

window.addEventListener('touchstart', function() {
    goFullscreen();
}, { once: true });