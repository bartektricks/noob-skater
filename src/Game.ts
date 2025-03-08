import * as THREE from 'three';
import { Skateboard } from './Skateboard';
import { UI } from './UI';
import { Camera } from './Camera';
import { Rail } from './Rail';
import { GameMenu, GameStartOptions } from './GameMenu';
import { NetworkManager, NetworkManagerEvents } from './NetworkManager';

// Interface for serialized game state to be sent over network
interface SerializedGameState {
  skateboard: {
    position: { x: number, y: number, z: number };
    rotation: { x: number, y: number, z: number };
    velocity: { x: number, y: number, z: number };
    // Add any other skateboard state properties needed
  };
  timestamp: number;
}

// Interface for player input to be sent over network
interface PlayerInput {
  keys: { [key: string]: boolean };
  timestamp: number;
}

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
  
  // Multiplayer properties
  private networkManager: NetworkManager | null = null;
  private isMultiplayer: boolean = false;
  private isHost: boolean = false;
  private remoteSkateboard: Skateboard | null = null;
  private lastSentTime: number = 0;
  private networkUpdateRate: number = 100; // milliseconds between updates
  private playerInput: { [key: string]: boolean } = {};

  // Add a property to store connection code
  private hostConnectionCode: string = '';

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
    
    // Set up clock
    this.clock = new THREE.Clock();
    
    // Create game menu
    this.gameMenu = new GameMenu(this.startGame.bind(this));
    
    // Add event listeners
    window.addEventListener('resize', this.onWindowResize.bind(this));
    window.addEventListener('keydown', this.handleKeyDown.bind(this));
    window.addEventListener('keyup', this.handleKeyUp.bind(this));
  }
  
  // Handle keyboard events
  private handleKeyDown(event: KeyboardEvent): void {
    const key = event.key.toLowerCase();
    
    // Handle menu toggle
    if (key === 'escape') {
      this.toggleMenu();
      return;
    }
    
    // No special handling for multiplayer
    // Local inputs always control local skateboard
    // Network synchronization happens separately via position updates
  }
  
  // Add a key up handler to track when keys are released
  private handleKeyUp(event: KeyboardEvent): void {
    // No special handling needed - skateboard class already handles key up events
  }
  
  // Toggle game menu
  private toggleMenu(): void {
    if (this.isGameRunning) {
      // Pausing the game - show menu
      this.isGameRunning = false;
      
      // If we're hosting, update the connection code in the menu
      if (this.isMultiplayer && this.isHost && this.hostConnectionCode) {
        this.gameMenu.setPeerCode(this.hostConnectionCode);
      }
      
      this.gameMenu.show();
    } else {
      // Resuming the game - hide menu
      this.isGameRunning = true;
      this.gameMenu.hide();
    }
  }
  
  // Start the game
  public startGame(options: GameStartOptions): void {
    // Check if we're resuming - if we already have multiplayer initialized and the hostConnectionCode is set
    const isResuming = this.isMultiplayer && 
                      ((this.isHost && this.hostConnectionCode) || 
                       (!this.isHost && this.networkManager && this.networkManager.isConnected()));
    
    if (!isResuming) {
      // New game start
      this.playerNickname = options.nickname;
      this.isGameRunning = true;
      
      // Initialize multiplayer
      this.setupMultiplayer(options);
      
      // Update UI with player nickname
      this.ui.setPlayerNickname(this.playerNickname);
      
      // Start the clock
      this.clock.start();
    } else {
      // Just resuming - simply set the running flag
      this.isGameRunning = true;
    }
  }

  private setupMultiplayer(options: GameStartOptions): void {
    this.isMultiplayer = true;
    this.isHost = options.peerRole === 'host';
    
    console.log("Setting up multiplayer as:", this.isHost ? "HOST" : "CLIENT");
    
    // Update UI to show connecting status
    this.ui.showConnectionStatus('connecting');
    
    // Create network events handler with SYMMETRIC approach
    const networkEvents: NetworkManagerEvents = {
      onConnected: (peerId: string) => {
        console.log(`Connected to peer: ${peerId}`);
        this.ui.showNotification(`Connected to ${this.isHost ? 'client' : 'host'}!`);
        this.ui.showConnectionStatus('connected');
        
        // Create remote skateboard with same logic for both host and client
        if (!this.remoteSkateboard) {
          console.log(`Creating remote skateboard as ${this.isHost ? 'HOST' : 'CLIENT'}`);
          this.remoteSkateboard = new Skateboard();
          
          // Make remote skateboard visually distinct but preserve its structure
          this.remoteSkateboard.mesh.traverse(child => {
            if (child instanceof THREE.Mesh) {
              // Clone the original material to preserve properties
              const originalMaterial = child.material;
              if (Array.isArray(originalMaterial)) {
                // Handle multi-material objects
                child.material = originalMaterial.map(mat => {
                  if (mat instanceof THREE.MeshStandardMaterial) {
                    const newMat = mat.clone();
                    // Modify material to be reddish
                    newMat.color.setHex(0xff3333);
                    if (newMat.emissive) {
                      newMat.emissive.setHex(0x440000);
                      newMat.emissiveIntensity = 0.3;
                    }
                    return newMat;
                  }
                  return mat;
                });
              } else if (originalMaterial instanceof THREE.MeshStandardMaterial) {
                // Handle single material
                const newMat = originalMaterial.clone();
                // Modify material to be reddish
                newMat.color.setHex(0xff3333);
                if (newMat.emissive) {
                  newMat.emissive.setHex(0x440000);
                  newMat.emissiveIntensity = 0.3;
                }
                child.material = newMat;
              }
            }
          });
          
          // Add player label above the remote skateboard
          const labelGeometry = new THREE.BoxGeometry(1, 0.5, 0.1);
          const labelMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });
          const label = new THREE.Mesh(labelGeometry, labelMaterial);
          label.position.set(0, 2, 0); 
          this.remoteSkateboard.mesh.add(label);
          
          // Create a text label for the player
          const playerType = this.isHost ? "CLIENT" : "HOST";
          
          // Add a small light to make the remote player more visible
          const pointLight = new THREE.PointLight(0xff0000, 0.5, 5);
          pointLight.position.set(0, 2, 0);
          this.remoteSkateboard.mesh.add(pointLight);
          
          // Initial position offset - same logic for both
          this.remoteSkateboard.mesh.position.set(3, 1, 3);
          this.scene.add(this.remoteSkateboard.mesh);
          console.log("Remote skateboard added to scene");
        }
      },
      
      onDisconnected: () => {
        console.log('Disconnected from peer');
        this.ui.showNotification('Peer disconnected');
        this.ui.showConnectionStatus('disconnected');
        
        if (this.remoteSkateboard) {
          this.scene.remove(this.remoteSkateboard.mesh);
          this.remoteSkateboard = null;
        }
        
        this.isMultiplayer = false;
      },
      
      onError: (error: string) => {
        console.error('Network error:', error);
        this.ui.showNotification(`Network error: ${error}`);
        this.ui.showConnectionStatus('disconnected');
      },
      
      // Symmetric message handling for both host and client
      onGameStateReceived: (gameState: any) => {
        console.log(`${this.isHost ? 'Host' : 'Client'} received gameState`);
        
        // If we're the client, this is the host's skateboard state
        if (!this.isHost && this.remoteSkateboard && gameState.skateboard) {
          this.updateRemoteSkateboard(gameState.skateboard);
        }
        
        // If we're the host and gameState contains skateboardState (from client), handle it
        if (this.isHost && this.remoteSkateboard && gameState.skateboardState) {
          this.updateRemoteSkateboard(gameState.skateboardState);
        }
      },
      
      onPlayerInputReceived: (input: any) => {
        console.log(`${this.isHost ? 'Host' : 'Client'} received playerInput`);
        
        // If we're the host and it's a normal input, ignore (we're using direct position updates)
        // If it's a skateboard state from client, update the remote skateboard
        if (this.isHost && this.remoteSkateboard && input.skateboardState) {
          this.updateRemoteSkateboard(input.skateboardState);
        }
        
        // If we're the client and input contains skateboardState (from host), handle it
        if (!this.isHost && this.remoteSkateboard && input.skateboardState) {
          this.updateRemoteSkateboard(input.skateboardState);
        }
      }
    };
    
    // Initialize network manager
    this.networkManager = new NetworkManager(networkEvents);
    
    if (this.isHost) {
      // Initialize as host
      console.log("Initializing as host...");
      this.networkManager.initAsHost()
        .then(id => {
          // Store the connection code for displaying in the pause menu
          this.hostConnectionCode = id;
          console.log('Initialized as host with ID:', id);
          this.ui.showNotification('Host initialized! Press ESC to see your connection code.');
        })
        .catch(err => {
          console.error('Failed to initialize as host:', err);
          this.ui.showNotification('Failed to start hosting');
          this.ui.showConnectionStatus('disconnected');
        });
    } else if (options.peerCode) {
      // Connect to host
      console.log("Connecting to host with code:", options.peerCode);
      this.networkManager.connectToHost(options.peerCode)
        .then(() => {
          console.log('Connected to host');
          this.ui.showNotification('Connected to game host!');
        })
        .catch(err => {
          console.error('Failed to connect to host:', err);
          this.ui.showNotification('Failed to connect to host');
          this.ui.showConnectionStatus('disconnected');
        });
    } else {
      console.error("Client mode selected but no peer code provided");
      this.ui.showNotification('No peer code provided');
      this.ui.showConnectionStatus('disconnected');
    }
  }
  
  private updateRemoteSkateboard(state: any): void {
    if (!this.remoteSkateboard) {
      console.warn("Cannot update remote skateboard: it doesn't exist");
      return;
    }
    
    console.log("Updating remote skateboard position:", state.position);
    
    // Update position
    this.remoteSkateboard.mesh.position.set(
      state.position.x,
      state.position.y,
      state.position.z
    );
    
    // Update rotation
    this.remoteSkateboard.mesh.rotation.set(
      state.rotation.x,
      state.rotation.y,
      state.rotation.z
    );
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
    
    // Add an additional curved rail
    const rail3 = new Rail(10, 0, 20, -15);
    this.scene.add(rail3.mesh);
    this.rails.push(rail3);
    
    // Add a shorter rail nearby
    const rail4 = new Rail(-10, -10, -5, -15);
    this.scene.add(rail4.mesh);
    this.rails.push(rail4);
    
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
    
    // Update our local skateboard with physics
    this.skateboard.update(delta);
    
    // Send network updates at regular intervals
    if (this.isMultiplayer) {
      this.sendNetworkUpdate();
    }
    
    // Update UI and camera
    this.ui.update();
    this.cameraManager.update();
  }

  public render(): void {
    this.renderer.render(this.scene, this.cameraManager.getCamera());
  }

  public animate(): void {
    requestAnimationFrame(this.animate.bind(this));
    this.update();
    this.render();
  }

  // Add this method to handle all network sending functions
  private sendNetworkUpdate(): void {
    if (!this.networkManager || !this.isMultiplayer) return;
    
    const now = Date.now();
    
    // Only send updates at the specified rate
    if (now - this.lastSentTime > this.networkUpdateRate) {
      this.lastSentTime = now;
      
      // Both host and client send their skateboard state
      const state = {
        position: {
          x: this.skateboard.mesh.position.x,
          y: this.skateboard.mesh.position.y,
          z: this.skateboard.mesh.position.z
        },
        rotation: {
          x: this.skateboard.mesh.rotation.x,
          y: this.skateboard.mesh.rotation.y,
          z: this.skateboard.mesh.rotation.z
        },
        timestamp: now
      };
      
      // Host sends using sendGameState, client using sendPlayerInput
      // but the structure is the same
      if (this.isHost) {
        console.log("Host sending state update");
        this.networkManager.sendGameState({
          skateboard: state,
          timestamp: now
        });
      } else {
        console.log("Client sending state update");
        this.networkManager.sendPlayerInput({
          skateboardState: state,
          timestamp: now
        });
      }
    }
  }
} 