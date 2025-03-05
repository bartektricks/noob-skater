import * as THREE from 'three';
import { Skateboard } from './Skateboard';
import { UI } from './UI';
import { Camera } from './Camera';

export class Game {
  private scene: THREE.Scene;
  private cameraManager: Camera;
  private renderer: THREE.WebGLRenderer;
  private skateboard: Skateboard;
  private ui: UI;
  private clock: THREE.Clock;

  constructor() {
    // Create scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x87ceeb); // Sky blue background

    // Create camera manager
    this.cameraManager = new Camera(window.innerWidth / window.innerHeight);
    
    // Create renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    document.body.appendChild(this.renderer.domElement);

    // Create skateboard
    this.skateboard = new Skateboard();
    this.scene.add(this.skateboard.mesh);

    // Create UI
    this.ui = new UI(this.skateboard);

    // Setup lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    this.scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(5, 5, 5);
    directionalLight.castShadow = true;
    this.scene.add(directionalLight);

    // Create ground
    const groundGeometry = new THREE.PlaneGeometry(100, 100);
    const groundMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x1a472a,
      roughness: 0.8,
      metalness: 0.2
    });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    this.scene.add(ground);

    // Setup clock for animations
    this.clock = new THREE.Clock();

    // Handle window resize
    window.addEventListener('resize', this.onWindowResize.bind(this));
  }

  // Camera getter and setter methods - these methods can be kept for backwards compatibility
  public getCameraState(): any {
    return this.cameraManager.getState();
  }
  
  public setCameraOrbit(value: number): void {
    this.cameraManager.setOrbit(value);
  }
  
  public setCameraElevation(value: number): void {
    this.cameraManager.setElevation(value);
  }
  
  public setCameraDistance(value: number): void {
    this.cameraManager.setDistance(value);
  }
  
  public setCameraHeight(value: number): void {
    this.cameraManager.setHeight(value);
  }
  
  public resetCamera(): void {
    this.cameraManager.reset();
  }

  private onWindowResize(): void {
    this.cameraManager.setAspectRatio(window.innerWidth / window.innerHeight);
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  public update(): void {
    const delta = this.clock.getDelta();
    this.skateboard.update(delta);
    this.ui.update();
    
    // Update camera target to follow skateboard
    this.cameraManager.setTarget(this.skateboard.mesh.position);
  }

  public render(): void {
    this.renderer.render(this.scene, this.cameraManager.camera);
  }

  public animate(): void {
    requestAnimationFrame(this.animate.bind(this));
    this.update();
    this.render();
  }
} 