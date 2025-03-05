import RAPIER from '@dimforge/rapier3d';
import * as THREE from 'three';

// Set up Three.js scene
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Create a new physics world
const gravity = { x: 0.0, y: -9.81, z: 0.0 };
const world = new RAPIER.World(gravity);

// Create a ground plane
const groundColliderDesc = RAPIER.ColliderDesc.cuboid(10.0, 0.1, 10.0);
world.createCollider(groundColliderDesc);

// Create a dynamic rigid body (a cube)
const rigidBodyDesc = RAPIER.RigidBodyDesc.dynamic()
    .setTranslation(0.0, 1.0, 0.0);
const rigidBody = world.createRigidBody(rigidBodyDesc);

const colliderDesc = RAPIER.ColliderDesc.cuboid(0.5, 0.5, 0.5);
world.createCollider(colliderDesc, rigidBody);

// Set up camera position
camera.position.set(0, 5, 10);
camera.lookAt(0, 0, 0);

// Create debug lines
const debugLines = new THREE.LineSegments(
    new THREE.BufferGeometry(),
    new THREE.LineBasicMaterial({ color: 0xffffff })
);
scene.add(debugLines);

// Animation loop
const eventQueue = new RAPIER.EventQueue(true);

function animate() {
    requestAnimationFrame(animate);

    // Step the physics simulation
    world.step(eventQueue);

    // Get debug render data
    const { vertices, colors } = world.debugRender();

    // Update debug lines
    const positions = new Float32Array(vertices);
    const colorArray = new Float32Array(colors);
    
    debugLines.geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    debugLines.geometry.setAttribute('color', new THREE.BufferAttribute(colorArray, 4));
    
    debugLines.material = new THREE.LineBasicMaterial({ 
        vertexColors: true,
        opacity: 0.5,
        transparent: true
    });

    renderer.render(scene, camera);
}

// Handle window resize
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

animate();

