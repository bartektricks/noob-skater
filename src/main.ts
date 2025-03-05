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

// Create skateboard model
const skateboardGroup = new THREE.Group();

// Deck (main board)
const deckGeometry = new THREE.BoxGeometry(2, 0.1, 0.5);
const deckMaterial = new THREE.MeshPhongMaterial({ color: 0x8B4513 }); // Brown color
const deck = new THREE.Mesh(deckGeometry, deckMaterial);
deck.position.set(0, 0.1, 0);
skateboardGroup.add(deck);

// Wheels
const wheelGeometry = new THREE.CylinderGeometry(0.1, 0.1, 0.1, 16);
const wheelMaterial = new THREE.MeshPhongMaterial({ color: 0x808080 }); // Gray color

// Create 4 wheels
const wheelPositions = [
    { x: -0.7, y: 0.05, z: 0.25 },  // Front left
    { x: -0.7, y: 0.05, z: -0.25 }, // Front right
    { x: 0.7, y: 0.05, z: 0.25 },   // Back left
    { x: 0.7, y: 0.05, z: -0.25 }   // Back right
];

wheelPositions.forEach(pos => {
    const wheel = new THREE.Mesh(wheelGeometry, wheelMaterial);
    wheel.position.set(pos.x, pos.y, pos.z);
    wheel.rotation.x = Math.PI / 2; // Rotate to lay flat
    skateboardGroup.add(wheel);
});

// Add skateboard to scene
scene.add(skateboardGroup);

// Add lighting
const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
directionalLight.position.set(5, 5, 5);
scene.add(directionalLight);

// Create physics for skateboard
const skateboardBodyDesc = RAPIER.RigidBodyDesc.dynamic()
    .setTranslation(0.0, 1.0, 0.0)
    .setRotation(new THREE.Quaternion(0, 1, 0, 1));
const skateboardBody = world.createRigidBody(skateboardBodyDesc);

// Create colliders for deck and wheels
const deckCollider = RAPIER.ColliderDesc.cuboid(1.0, 0.05, 0.25);
world.createCollider(deckCollider, skateboardBody);

// Add wheel colliders
wheelPositions.forEach(pos => {
    const wheelCollider = RAPIER.ColliderDesc.cylinder(0.1, 0.05);
    wheelCollider.setTranslation(pos.x, pos.y, pos.z);
    world.createCollider(wheelCollider, skateboardBody);
});

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

    // Update skateboard position and rotation based on physics
    const position = skateboardBody.translation();
    const rotation = skateboardBody.rotation();
    
    skateboardGroup.position.set(position.x, position.y, position.z);
    skateboardGroup.quaternion.set(rotation.x, rotation.y, rotation.z, rotation.w);

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

