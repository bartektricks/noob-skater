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
  private networkUpdateRate: number = 30; // 33 updates per second
  private playerInput: { [key: string]: boolean } = {};

  // Add a property to store connection code
  private hostConnectionCode: string = '';

  // Add these properties to the Game class for smooth remote animations
  private remoteTargetPosition: THREE.Vector3 = new THREE.Vector3();
  private remoteTargetRotation: THREE.Euler = new THREE.Euler();
  private remotePositionLerpFactor: number = 0.1; // Smoother position transitions
  private remoteRotationLerpFactor: number = 0.35; // Much faster rotation response

  // Enhance remoteTargetPosition and remoteTargetRotation with velocity and acceleration
  private remoteVelocity: THREE.Vector3 = new THREE.Vector3();
  private remoteAngularVelocity: THREE.Vector3 = new THREE.Vector3();
  private lastRemotePosition: THREE.Vector3 = new THREE.Vector3();
  private lastRemoteRotation: THREE.Euler = new THREE.Euler();
  private remotePositionBuffer: {position: THREE.Vector3, timestamp: number}[] = [];
  private positionBufferSize: number = 3; // How many position updates to buffer

  // Add easing functions for smoother animations
  private easeOutCubic(x: number): number {
    return 1 - Math.pow(1 - x, 3);
  }

  private easeInOutQuad(x: number): number {
    return x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2;
  }

  // Add the missing lastSendPosition property
  private lastSendPosition: {x: number, y: number, z: number} | null = null;

  // Add a direct sync threshold to skip interpolation for very large rotational changes
  private rotationDirectSyncThreshold: number = Math.PI / 2; // 90 degrees

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
          
          // Connect the skateboard to the rails and UI for trick animations
          this.remoteSkateboard.setRails(this.rails);
          this.remoteSkateboard.setUI(this.ui);
          
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
          
          // Add subtle animation effects
          const trailMaterial = new THREE.MeshBasicMaterial({ 
            color: 0xff3333, 
            transparent: true, 
            opacity: 0.4,
            side: THREE.DoubleSide
          });
          
          // Visual trail effect
          const trailGeometry = new THREE.PlaneGeometry(0.5, 2);
          const trail = new THREE.Mesh(trailGeometry, trailMaterial);
          trail.position.set(0, 0.1, -1);
          trail.rotation.x = Math.PI / 2;
          this.remoteSkateboard.mesh.add(trail);
          
          // Add player label above the remote skateboard
          const labelGeometry = new THREE.BoxGeometry(1, 0.5, 0.1);
          const labelMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });
          const label = new THREE.Mesh(labelGeometry, labelMaterial);
          label.position.set(0, 2, 0); 
          this.remoteSkateboard.mesh.add(label);
          
          // Add a small light to make the remote player more visible
          const pointLight = new THREE.PointLight(0xff0000, 0.5, 5);
          pointLight.position.set(0, 2, 0);
          this.remoteSkateboard.mesh.add(pointLight);
          
          // Initial position offset - same logic for both
          this.remoteSkateboard.mesh.position.set(3, 1, 3);
          
          // Initialize animation properties
          this.remoteTargetPosition.copy(this.remoteSkateboard.mesh.position);
          this.lastRemotePosition.copy(this.remoteSkateboard.mesh.position);
          this.remoteTargetRotation.copy(this.remoteSkateboard.mesh.rotation);
          this.lastRemoteRotation.copy(this.remoteSkateboard.mesh.rotation);
          
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
  
  // Update the remote skateboard update method with position buffering and prediction
  private updateRemoteSkateboard(state: any): void {
    if (!this.remoteSkateboard) {
      console.warn("Cannot update remote skateboard: it doesn't exist");
      return;
    }
    
    // Create position vector from incoming state
    const newPosition = new THREE.Vector3(
      state.position.x,
      state.position.y,
      state.position.z
    );
    
    // Create rotation from incoming state
    const newRotation = new THREE.Euler(
      state.rotation.x,
      state.rotation.y,
      state.rotation.z
    );
    
    // Store previous position and rotation before updating
    this.lastRemotePosition.copy(this.remoteTargetPosition);
    this.lastRemoteRotation.copy(this.remoteTargetRotation);
    
    // Update target position and rotation
    this.remoteTargetPosition.copy(newPosition);
    this.remoteTargetRotation.copy(newRotation);
    
    // Calculate velocity based on position change (with smoother velocity)
    if (this.lastSentTime > 0) {
      // Calculate time delta between updates
      const timeDelta = (Date.now() - this.lastSentTime) / 1000; // in seconds
      if (timeDelta > 0) {
        // Calculate raw velocity vector
        const rawVelocity = new THREE.Vector3().subVectors(newPosition, this.lastRemotePosition);
        
        // Scale by time delta to get units/second
        rawVelocity.divideScalar(timeDelta);
        
        // Smooth velocity changes by blending with previous velocity
        this.remoteVelocity.lerp(rawVelocity, 0.3); // 30% new, 70% old for smoother changes
      }
    }
    
    // Apply trick state if it exists
    if (state.tricks && this.remoteSkateboard) {
      // Make sure the flips update immediately
      // This bypasses the normal flip animation system and directly applies the rotation
      if (state.tricks.isDoingFlip) {
        // Force the flip animation to update correctly
        this.remoteSkateboard.setTrickState(state.tricks);
      } else {
        // Normal trick state update
        this.remoteSkateboard.setTrickState(state.tricks);
      }
    }
    
    // Update our lastSentTime
    this.lastSentTime = Date.now();
  }

  // Enhanced remote skateboard animation with faster rotation
  private animateRemoteSkateboard(delta: number): void {
    if (!this.remoteSkateboard || !this.isMultiplayer) return;
    
    // Adjust lerp factors based on delta to ensure consistent animation speed
    const positionLerpAdjusted = Math.min(1, this.remotePositionLerpFactor * (60 * delta));
    const rotationLerpAdjusted = Math.min(1, this.remoteRotationLerpFactor * (60 * delta));
    
    // Apply easing only to position, not to rotation (for faster response)
    const easedPositionLerp = this.easeOutCubic(positionLerpAdjusted);
    // No easing for rotation - direct value for faster response
    
    // Simple position interpolation without complex prediction
    this.remoteSkateboard.mesh.position.lerp(this.remoteTargetPosition, easedPositionLerp);
    
    // Get the current angle difference to determine if we need a fast sync
    const angleDiff = Math.abs(
      this.angleDifference(this.remoteSkateboard.mesh.rotation.y, this.remoteTargetRotation.y)
    );
    
    // For Y rotation (turning), use faster synchronization
    // Fast direct sync for large turns
    if (angleDiff > Math.PI / 2) {
      // If turn is greater than 90 degrees, just jump to the target angle
      this.remoteSkateboard.mesh.rotation.y = this.remoteTargetRotation.y;
    } else {
      // Otherwise use fast lerp with no easing
      this.remoteSkateboard.mesh.rotation.y = this.lerpAngle(
        this.remoteSkateboard.mesh.rotation.y,
        this.remoteTargetRotation.y,
        rotationLerpAdjusted * 2 // Double the speed
      );
    }
    
    // For X and Z rotation, use simpler interpolation
    this.remoteSkateboard.mesh.rotation.x = THREE.MathUtils.lerp(
      this.remoteSkateboard.mesh.rotation.x,
      this.remoteTargetRotation.x,
      rotationLerpAdjusted * 1.5 // 50% faster
    );
    
    this.remoteSkateboard.mesh.rotation.z = THREE.MathUtils.lerp(
      this.remoteSkateboard.mesh.rotation.z,
      this.remoteTargetRotation.z,
      rotationLerpAdjusted * 1.5 // 50% faster
    );
    
    // Add subtle motion to wheels for more liveliness
    const wheels = this.remoteSkateboard.getWheels();
    if (wheels && wheels.length > 0) {
      // Calculate simple speed based on position changes
      const speed = this.remoteSkateboard.mesh.position.distanceTo(this.remoteTargetPosition) * 10;
      
      // Rotate wheels based on speed
      for (const wheel of wheels) {
        wheel.rotation.x += speed * delta;
      }
    }
  }

  // Helper function to calculate smallest angle difference between two angles (in radians)
  private angleDifference(angle1: number, angle2: number): number {
    const PI2 = Math.PI * 2;
    
    // Normalize angles to 0-2π range
    angle1 = ((angle1 % PI2) + PI2) % PI2;
    angle2 = ((angle2 % PI2) + PI2) % PI2;
    
    // Find the shortest distance between the angles
    let diff = angle2 - angle1;
    
    // Ensure we're taking the shortest path
    if (diff > Math.PI) {
      diff -= PI2;
    } else if (diff < -Math.PI) {
      diff += PI2;
    }
    
    return diff;
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
    
    // Animate remote skateboard with smooth interpolation
    this.animateRemoteSkateboard(delta);
    
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

  // Simplify the send network update method to not use dynamic rates
  private sendNetworkUpdate(): void {
    if (!this.networkManager || !this.isMultiplayer) return;
    
    const now = Date.now();
    
    // Only send updates at the fixed rate
    if (now - this.lastSentTime > this.networkUpdateRate) {
      this.lastSentTime = now;
      
      // Get current trick state from skateboard
      const trickState = this.skateboard.getTrickState();
      
      // Simple state update without dynamic update rates
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
        // Include estimated velocity for remote prediction
        velocity: {
          x: (this.skateboard.mesh.position.x - (this.lastSendPosition?.x || 0)) / (this.networkUpdateRate/1000),
          y: (this.skateboard.mesh.position.y - (this.lastSendPosition?.y || 0)) / (this.networkUpdateRate/1000),
          z: (this.skateboard.mesh.position.z - (this.lastSendPosition?.z || 0)) / (this.networkUpdateRate/1000)
        },
        // Include trick state for animations
        tricks: trickState,
        timestamp: now
      };
      
      // Store current position for velocity calculation on next update
      this.lastSendPosition = {
        x: this.skateboard.mesh.position.x,
        y: this.skateboard.mesh.position.y,
        z: this.skateboard.mesh.position.z
      };
      
      // Host sends using sendGameState, client using sendPlayerInput
      if (this.isHost) {
        this.networkManager.sendGameState({
          skateboard: state,
          timestamp: now
        });
      } else {
        this.networkManager.sendPlayerInput({
          skateboardState: state,
          timestamp: now
        });
      }
    }
  }

  // Simplify lerpAngle function to avoid potential issues
  private lerpAngle(current: number, target: number, t: number): number {
    const PI2 = Math.PI * 2;
    
    // Normalize angles to 0-2π range
    current = ((current % PI2) + PI2) % PI2;
    target = ((target % PI2) + PI2) % PI2;
    
    // Find shortest path
    let delta = target - current;
    if (Math.abs(delta) > Math.PI) {
      if (delta > 0) {
        delta = delta - PI2;
      } else {
        delta = delta + PI2;
      }
    }
    
    return current + delta * t;
  }
} 