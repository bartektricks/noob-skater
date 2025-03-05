import * as THREE from 'three';
import { Skateboard } from './Skateboard';
import { UI } from './UI';

export class Game {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private skateboard: Skateboard;
  private ui: UI;
  private clock: THREE.Clock;

  // New camera system
  private cameraTarget: THREE.Vector3 = new THREE.Vector3(0, 2, 0);
  private cameraState = {
    // Horizontal orbit angle in radians (around Y axis)
    orbit: 0,
    // Vertical angle in radians (0 = horizontal, π/2 = looking down)
    elevation: Math.PI / 6,
    // Distance from target
    distance: 10,
    // Height offset from target
    height: 2
  };
  
  constructor() {
    // Create scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x87ceeb); // Sky blue background

    // Create camera
    this.camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    
    // Initial camera position will be set in updateCamera()
    this.updateCamera();

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

  private updateCamera(): void {
    // Calculate camera position based on orbit and elevation angles
    const { orbit, elevation, distance, height } = this.cameraState;
    
    // Calculate horizontal position (orbit around y-axis)
    const horizontalDistance = distance * Math.cos(elevation);
    const x = this.cameraTarget.x + horizontalDistance * Math.sin(orbit);
    const z = this.cameraTarget.z + horizontalDistance * Math.cos(orbit);
    
    // Calculate vertical position (based on elevation angle and height)
    const y = this.cameraTarget.y + height + distance * Math.sin(elevation);
    
    // Update camera position and look at target
    this.camera.position.set(x, y, z);
    this.camera.lookAt(this.cameraTarget);
  }
  
  // Camera getter and setter methods
  public getCameraState(): typeof this.cameraState {
    return this.cameraState;
  }
  
  public setCameraOrbit(value: number): void {
    this.cameraState.orbit = value;
    this.updateCamera();
  }
  
  public setCameraElevation(value: number): void {
    this.cameraState.elevation = Math.max(0.1, Math.min(Math.PI / 2 - 0.1, value));
    this.updateCamera();
  }
  
  public setCameraDistance(value: number): void {
    this.cameraState.distance = Math.max(2, Math.min(30, value));
    this.updateCamera();
  }
  
  public setCameraHeight(value: number): void {
    this.cameraState.height = Math.max(0, value);
    this.updateCamera();
  }
  
  public resetCamera(): void {
    this.cameraState = {
      orbit: 0,
      elevation: Math.PI / 6,
      distance: 10,
      height: 2
    };
    this.updateCamera();
  }


  private onWindowResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  public update(): void {
    const delta = this.clock.getDelta();
    this.skateboard.update(delta);
    this.ui.update();
    
    // Update camera target to follow skateboard
    this.cameraTarget.copy(this.skateboard.mesh.position);
    this.updateCamera();
  }

  public render(): void {
    this.renderer.render(this.scene, this.camera);
  }

  public animate(): void {
    requestAnimationFrame(this.animate.bind(this));
    this.update();
    this.render();
  }
} 