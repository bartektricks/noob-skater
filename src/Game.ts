import * as THREE from 'three';
import { Skateboard } from './Skateboard';
import { UI } from './UI';
import { Camera } from './Camera';
import { Rail } from './Rail';
import { GameMenu, GameStartOptions } from './GameMenu';

export class Game {
  private scene: THREE.Scene;
  private cameraManager: Camera;
  private renderer: THREE.WebGLRenderer;
  private skateboard: Skateboard;
  private ui: UI;
  private clock: THREE.Clock;
  private rails: Rail[] = [];
  private gameMenu: GameMenu;
  private isGameRunning: boolean = false;
  private playerNickname: string = '';
  private serverType: string = 'local';

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
    
    // Connect skateboard to camera
    this.cameraManager.setSkateboardReference(this.skateboard);

    // Create UI
    this.ui = new UI(this.skateboard);
    
    // Connect UI to skateboard for trick display
    this.skateboard.setUI(this.ui);

    // Create and add rails
    this.createRails();
    
    // Provide rails to the skateboard via dependency injection
    this.skateboard.setRails(this.rails);

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
    
    // Add escape key listener for menu toggle
    window.addEventListener('keydown', this.handleKeyDown.bind(this));
    
    // Create game menu
    this.gameMenu = new GameMenu((options) => this.startGame(options));
  }
  
  // Handle keyboard events
  private handleKeyDown(event: KeyboardEvent): void {
    // Toggle menu with Escape key
    if (event.key === 'Escape') {
      this.toggleMenu();
    }
  }
  
  // Toggle game menu
  private toggleMenu(): void {
    if (this.isGameRunning) {
      // Pause the game
      this.isGameRunning = false;
      // Reset the clock to prevent large delta time on resume
      this.clock.getDelta();
      this.gameMenu.show();
    } else {
      // Resume the game if it was already started with a nickname
      if (this.playerNickname) {
        this.isGameRunning = true;
        // Reset the clock to prevent large delta time on resume
        this.clock.getDelta();
        this.gameMenu.hide();
      }
    }
  }
  
  // Start the game
  public startGame(options: GameStartOptions): void {
    this.playerNickname = options.nickname;
    this.serverType = options.server;
    
    console.log(`Starting game for player: ${this.playerNickname} on server: ${this.serverType}`);
    
    // Update UI with player nickname
    if (this.ui) {
      this.ui.setPlayerNickname(this.playerNickname);
    }
    
    this.isGameRunning = true;
    this.clock.start();
  }

  // Create rails and add them to the scene
  private createRails(): void {
    // Create a long rail straight ahead
    const rail1 = new Rail(-10, 10, 10, 10);
    this.scene.add(rail1.mesh);
    this.rails.push(rail1);
    
    // Create a second long rail at an angle 
    const rail2 = new Rail(-20, -5, 20, 5);
    this.scene.add(rail2.mesh);
    this.rails.push(rail2);
    
    console.log("Rails created:", this.rails.length);
  }

  // Camera getter and setter methods - these methods can be kept for backwards compatibility
  public getCameraState() {
    return this.cameraManager.getState();
  }
  
  public setCameraOrbit(value: number): void {
    // This method no longer supported in the new camera system
    console.warn('setCameraOrbit is no longer supported. Use angle offset instead.');
  }
  
  public setCameraElevation(value: number): void {
    // This method no longer supported in the new camera system
    console.warn('setCameraElevation is no longer supported.');
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
    if (!this.isGameRunning) return;
    
    const delta = this.clock.getDelta();
    this.skateboard.update(delta);
    this.ui.update();
    
    // Update the camera to follow the skateboard
    this.cameraManager.update();
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