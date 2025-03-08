import * as THREE from 'three';
import { Skateboard } from './Skateboard';
import { UI } from './UI';
import { Camera } from './Camera';
import { Rail } from './Rail';
import { GameMenu } from './GameMenu';
import { NetworkManager, NetworkManagerEvents } from './NetworkManager';
import type { GameStartOptions } from './GameMenu';

// Remote player interface
export interface RemotePlayer {
  peerId: string;
  skateboard: Skateboard;
  lastUpdateTime: number;
  targetPosition: THREE.Vector3;
  targetRotation: THREE.Euler;
  lastPosition: THREE.Vector3;
  lastRotation: THREE.Euler;
  movementState: {
    isMoving: boolean;
    stoppedTime: number;
    lastMovementDirection: THREE.Vector3;
    verticalMovement: boolean;
    isJumping: boolean;
    jumpStartTime: number;
    jumpHeight: number;
    isLanding: boolean;
    landingStartTime: number;
  };
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
  
  // Multiplayer properties
  private networkManager: NetworkManager | null = null;
  private isMultiplayer: boolean = false;
  private isHost: boolean = false;
  private remotePlayers: Map<string, RemotePlayer> = new Map();
  private lastSentTime: number = 0;
  private networkUpdateRate: number = 30; // 33 updates per second
  private peer: { id: string } | null = null; // Store our own peer ID

  // Add a property to store connection code
  private hostConnectionCode: string = '';

  // Add these properties to the Game class for smooth remote animations
  private remotePositionLerpFactor: number = 0.1; // Smoother position transitions
  private remoteRotationLerpFactor: number = 0.35; // Much faster rotation response

  // Enhance remoteTargetPosition and remoteTargetRotation with velocity and acceleration
  private lastRemoteRotation: THREE.Euler = new THREE.Euler();

  // Add the missing lastSendPosition property
  private lastSendPosition: {x: number, y: number, z: number} | null = null;

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
    
    // Connect the exit button to the returnToMainMenu method
    this.ui.setExitToMenuCallback(() => this.returnToMainMenu());

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
  }
  
  // Handle keyboard events
  private handleKeyDown(event: KeyboardEvent): void {
    const key = event.key.toLowerCase();
    
    // Handle pause menu toggle
    if (key === 'escape') {
      if (this.isGameRunning) {
        // Show pause menu when ESC is pressed during gameplay
        this.ui.togglePauseMenu(true);
        
        // If hosting, show the server ID in the pause menu
        if (this.isMultiplayer && this.isHost && this.hostConnectionCode) {
          this.ui.setServerIdInPauseMenu(this.hostConnectionCode);
        } else {
          this.ui.setServerIdInPauseMenu(null);
        }
        
        // Pause the game
        this.isGameRunning = false;
      } else {
        // If game is already paused but pause menu is visible, hide it and resume
        if (this.ui.getIsPauseMenuVisible()) {
          this.ui.togglePauseMenu(false);
          this.isGameRunning = true;
        } else {
          // Otherwise toggle the main menu (GameMenu)
          this.toggleMenu();
        }
      }
      return;
    }
    
    // No special handling for multiplayer
    // Local inputs always control local skateboard
    // Network synchronization happens separately via position updates
  }
  
  // Toggle game menu or return to main menu from game
  private toggleMenu(): void {
    // Always ensure the pause menu is hidden when toggling the main menu
    this.ui.togglePauseMenu(false);
    
    if (this.isGameRunning) {
      // Pausing the game - show menu
      this.isGameRunning = false;
      
      // If we're hosting, update the connection code in the menu
      if (this.isMultiplayer && this.isHost && this.hostConnectionCode) {
        this.gameMenu.setPeerCode(this.hostConnectionCode);
      }
      
      this.gameMenu.show();
      
      // Hide the skateboard when in menu
      if (this.skateboard && this.skateboard.mesh) {
        this.skateboard.mesh.visible = false;
      }
      if (this.remotePlayers.size > 0) {
        this.remotePlayers.forEach((player) => {
          if (player.skateboard && player.skateboard.mesh) {
            player.skateboard.mesh.visible = false;
          }
        });
      }
    } else {
      // Resuming the game - hide menu
      this.isGameRunning = true;
      this.gameMenu.hide();
      
      // Show the skateboard when game is resumed
      if (this.skateboard && this.skateboard.mesh) {
        this.skateboard.mesh.visible = true;
      }
      if (this.remotePlayers.size > 0) {
        this.remotePlayers.forEach((player) => {
          if (player.skateboard && player.skateboard.mesh) {
            player.skateboard.mesh.visible = true;
          }
        });
      }
    }
  }
  
  /**
   * Return to the main menu, resetting the game state
   */
  private returnToMainMenu(): void {
    // Hide pause menu if it's open
    this.ui.togglePauseMenu(false);
    
    // Stop the game
    this.isGameRunning = false;
    
    // Reset skateboard position and rotation
    this.skateboard.mesh.position.set(0, 0, 5);
    this.skateboard.mesh.rotation.set(0, 0, 0);
    
    // Hide skateboards
    if (this.skateboard && this.skateboard.mesh) {
      this.skateboard.mesh.visible = false;
    }
    if (this.remotePlayers.size > 0) {
      this.remotePlayers.forEach((player) => {
        if (player.skateboard && player.skateboard.mesh) {
          this.scene.remove(player.skateboard.mesh);
        }
      });
      this.remotePlayers.clear();
    }
    
    // Clean up multiplayer if needed
    if (this.isMultiplayer && this.networkManager) {
      // Disconnect from peer
      this.networkManager.disconnect();
      this.isMultiplayer = false;
      this.isHost = false;
      this.hostConnectionCode = '';
    }
    
    // Reset camera
    this.cameraManager.reset();
    
    // Reset the game menu to its initial state and show it
    this.gameMenu.resetToInitialState();
    this.gameMenu.show();
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
    
    // Set up the network manager event handlers
    const networkEvents: NetworkManagerEvents = {
      onConnected: (peerId) => {
        console.log(`Connected with peer: ${peerId}`);
        this.ui.showConnectionStatus('connected');
        
        // Store our own peer ID when we connect
        if (!this.isHost) {
          this.peer = { id: 'client' }; // Default ID
          if (this.networkManager && this.networkManager.getConnectedPeers().length > 0) {
            // Our peer ID when connected to host
            this.peer = { id: this.networkManager.getMyPeerId() || 'client' };
          }
        }
        
        // Update the player list
        if (this.networkManager) {
          const peers = this.networkManager.getConnectedPeers();
          this.ui.updateConnectedPlayers(peers.length, peers);
        }
      },
      
      onDisconnected: (peerId) => {
        if (peerId) {
          console.log(`Disconnected from peer: ${peerId}`);
          
          // Remove the remote player if it exists
          if (this.remotePlayers.has(peerId)) {
            const remotePlayer = this.remotePlayers.get(peerId)!;
            this.scene.remove(remotePlayer.skateboard.mesh);
            this.remotePlayers.delete(peerId);
            
            // Notify the UI about the player leaving
            this.ui.showNotification(`Player disconnected (${peerId})`);
          }
        } else {
          console.log('Disconnected from all peers');
          
          // Clear all remote players from the scene
          this.remotePlayers.forEach(player => {
            this.scene.remove(player.skateboard.mesh);
          });
          this.remotePlayers.clear();
        }
        
        // Update the player list
        if (this.networkManager) {
          const peers = this.networkManager.getConnectedPeers();
          this.ui.updateConnectedPlayers(peers.length, peers);
        } else {
          this.ui.updateConnectedPlayers(0, []);
        }
        
        if (!this.networkManager?.isConnected()) {
          this.ui.showConnectionStatus('disconnected');
        }
      },
      
      onError: (error) => {
        console.error('Network error:', error);
        this.ui.showNotification(`Network error: ${error}`);
      },
      
      onGameStateReceived: (gameState) => {
        if (!this.isHost) {
          // Client receives game state from host
          if (gameState.hostPeerId) {
            // Store the host's peer ID for proper identification
            const hostPeerId = gameState.hostPeerId;
            
            // Update host skateboard state (the host is not a remote player,
            // but we still need to show their skateboard)
            if (gameState.skateboardState) {
              // Create a special update for the host's skateboard
              this.updateOrCreateRemotePlayer(hostPeerId, gameState.skateboardState);
            }
            
            // Update all other remote players' states
            if (gameState.otherPlayers) {
              for (const playerState of gameState.otherPlayers) {
                // Make sure we don't add ourselves as a remote player
                if (playerState.peerId !== this.peer?.id && playerState.peerId !== hostPeerId) {
                  this.updateOrCreateRemotePlayer(playerState.peerId, playerState.skateboardState);
                }
              }
            }
            
            // Log connected players for debugging
            console.log("Current remote players:", Array.from(this.remotePlayers.keys()));
          }
        }
      },
      
      onPlayerInputReceived: (input, peerId) => {
        if (this.isHost) {
          console.log("Host received input from client:", peerId);
          
          // Use the input to update the appropriate remote skateboard
          if (input.skateboardState) {
            this.updateOrCreateRemotePlayer(peerId, input.skateboardState);
          }
        }
      },
      
      onPlayerJoined: (peerId) => {
        console.log(`Player joined: ${peerId}`);
        this.ui.showNotification(`New player joined (${peerId})`);
        
        // Update the player list
        if (this.networkManager) {
          const peers = this.networkManager.getConnectedPeers();
          this.ui.updateConnectedPlayers(peers.length, peers);
        }
      },
      
      onPlayerLeft: (peerId) => {
        console.log(`Player left: ${peerId}`);
        
        // Remove the remote player if we still have it
        if (this.remotePlayers.has(peerId)) {
          const remotePlayer = this.remotePlayers.get(peerId)!;
          this.scene.remove(remotePlayer.skateboard.mesh);
          this.remotePlayers.delete(peerId);
        }
        
        // Update the player list
        if (this.networkManager) {
          const peers = this.networkManager.getConnectedPeers();
          this.ui.updateConnectedPlayers(peers.length, peers);
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
          
          // Set our peer ID
          this.peer = { id };
          
          // Initialize player list with empty array
          this.ui.updateConnectedPlayers(0, []);
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
    
    // Start a periodic update of the player list
    setInterval(() => {
      if (this.networkManager && this.isMultiplayer) {
        const peers = this.networkManager.getConnectedPeers();
        this.ui.updateConnectedPlayers(peers.length, peers);
      }
    }, 5000); // Update every 5 seconds
  }
  

  // Update method for remote player data received from network
  private updateOrCreateRemotePlayer(peerId: string, skateboardState: any): void {
    // Skip if this is our own peer ID - don't render ourselves as a remote player
    if (this.peer && this.peer.id === peerId) {
      console.log("Skipping remote player update for self:", peerId);
      return;
    }
    
    const now = performance.now();
    let remotePlayer: RemotePlayer;
    
    // Define ground level
    const groundLevel = 0; // Assuming 0 is the ground level in your game
    
    if (!this.remotePlayers.has(peerId)) {
      console.log("Creating new remote player for peer:", peerId);
      
      // Create a new skateboard for the remote player
      const remoteSkateboard = new Skateboard();
      
      // Position it initially at the state position
      const initialPosition = new THREE.Vector3(
        skateboardState.position.x,
        Math.max(skateboardState.position.y, groundLevel), // Ensure not below ground
        skateboardState.position.z
      );
      
      const initialRotation = new THREE.Euler(
        skateboardState.rotation.x,
        skateboardState.rotation.y,
        skateboardState.rotation.z,
        'XYZ'
      );
      
      // Set the position and rotation directly on the mesh
      remoteSkateboard.mesh.position.copy(initialPosition);
      remoteSkateboard.mesh.rotation.copy(initialRotation);
      
      // Make remote skateboard visually distinct
      remoteSkateboard.mesh.traverse(child => {
        if (child instanceof THREE.Mesh) {
          if (Array.isArray(child.material)) {
            child.material = child.material.map(mat => {
              if (mat instanceof THREE.MeshStandardMaterial) {
                const newMat = mat.clone();
                // Generate a unique color based on peerId to distinguish players
                const peerColor = this.getPeerColor(peerId);
                newMat.color.setHex(peerColor);
                return newMat;
              }
              return mat;
            });
          } else if (child.material instanceof THREE.MeshStandardMaterial) {
            const newMat = child.material.clone();
            const peerColor = this.getPeerColor(peerId);
            newMat.color.setHex(peerColor);
            child.material = newMat;
          }
        }
      });
      
      // Add a player label with their ID
      const labelGeometry = new THREE.BoxGeometry(1, 0.3, 0.1);
      const labelMaterial = new THREE.MeshBasicMaterial({ 
        color: this.getPeerColor(peerId),
        transparent: true,
        opacity: 0.8
      });
      const label = new THREE.Mesh(labelGeometry, labelMaterial);
      label.position.set(0, 2, 0);
      remoteSkateboard.mesh.add(label);
      
      // Use HTML to create a floating label
      const getShortPeerId = (id: string) => {
        // Extract a short identifier (last 4 characters)
        return id.slice(-4);
      };

      const playerLabel = document.createElement('div');
      playerLabel.className = 'player-label';
      playerLabel.textContent = `Player ${getShortPeerId(peerId)}`;
      playerLabel.style.position = 'absolute';
      playerLabel.style.backgroundColor = '#' + this.getPeerColor(peerId).toString(16);
      playerLabel.style.color = 'white';
      playerLabel.style.padding = '2px 5px';
      playerLabel.style.borderRadius = '3px';
      playerLabel.style.fontSize = '12px';
      playerLabel.style.fontWeight = 'bold';
      playerLabel.style.pointerEvents = 'none'; // Don't block mouse events
      playerLabel.dataset.peerId = peerId; // Store peer ID for updates
      document.body.appendChild(playerLabel);
      
      // Add to the scene
      this.scene.add(remoteSkateboard.mesh);
      
      // Create the remote player object with extended movement state tracking
      remotePlayer = {
        peerId,
        skateboard: remoteSkateboard,
        lastUpdateTime: now,
        targetPosition: initialPosition.clone(),
        targetRotation: initialRotation.clone(),
        lastPosition: initialPosition.clone(),
        lastRotation: initialRotation.clone(),
        movementState: {
          isMoving: false,
          stoppedTime: now,
          lastMovementDirection: new THREE.Vector3(0, 0, 0),
          verticalMovement: false,
          isJumping: false,
          jumpStartTime: 0,
          jumpHeight: 0,
          isLanding: false,
          landingStartTime: 0
        }
      };
      
      // Store it in our map
      this.remotePlayers.set(peerId, remotePlayer);
    } else {
      // Update existing remote player
      remotePlayer = this.remotePlayers.get(peerId)!;
      
      const oldPosition = remotePlayer.targetPosition.clone();
      
      // Ensure the target position is not below ground
      const newTargetY = Math.max(skateboardState.position.y, groundLevel);
      
      // Update target positions
      remotePlayer.targetPosition.set(
        skateboardState.position.x,
        newTargetY,
        skateboardState.position.z
      );
      
      remotePlayer.targetRotation.set(
        skateboardState.rotation.x,
        skateboardState.rotation.y,
        skateboardState.rotation.z,
        'XYZ'
      );
      
      // Calculate movement to detect if player is actually moving
      const totalMovement = remotePlayer.targetPosition.distanceTo(oldPosition);
      
      const verticalDelta = remotePlayer.targetPosition.y - oldPosition.y;
      const verticalMovement = Math.abs(verticalDelta);
      const isMovingUp = verticalDelta > 0.05;
      const isMovingDown = verticalDelta < -0.05;
      
      // Track if there was significant movement
      const wasMoving = remotePlayer.movementState.isMoving;
      const isMovingNow = totalMovement > 0.03; // Slightly higher threshold for movement detection
      
      // Update jump state
      if (isMovingUp && verticalMovement > 0.1 && !remotePlayer.movementState.isJumping) {
        // Jump started
        remotePlayer.movementState.isJumping = true;
        remotePlayer.movementState.jumpStartTime = now;
        remotePlayer.movementState.jumpHeight = 0;
        remotePlayer.movementState.isLanding = false;
      } else if (isMovingDown && remotePlayer.movementState.isJumping) {
        // Coming down from jump
        remotePlayer.movementState.jumpHeight = Math.max(
          remotePlayer.movementState.jumpHeight,
          remotePlayer.targetPosition.y - groundLevel
        );
      } else if (newTargetY <= groundLevel + 0.1 && remotePlayer.movementState.isJumping) {
        // Landing (close to ground)
        remotePlayer.movementState.isJumping = false;
        remotePlayer.movementState.isLanding = true;
        remotePlayer.movementState.landingStartTime = now;
      } else if (remotePlayer.movementState.isLanding && now - remotePlayer.movementState.landingStartTime > 300) {
        // Finish landing after a short transition period
        remotePlayer.movementState.isLanding = false;
      }
      
      // Update movement state
      remotePlayer.movementState.isMoving = isMovingNow;
      remotePlayer.movementState.verticalMovement = verticalMovement > 0.02;
      
      // If the player just stopped moving, record the time
      if (wasMoving && !isMovingNow) {
        remotePlayer.movementState.stoppedTime = now;
        
        // When stopping, also record the direction they were moving in
        if (totalMovement > 0) {
          remotePlayer.movementState.lastMovementDirection.subVectors(
            remotePlayer.targetPosition,
            oldPosition
          ).normalize();
        }
      }
      
      // Store last position and rotation
      remotePlayer.lastPosition.copy(remotePlayer.skateboard.mesh.position);
      remotePlayer.lastRotation.copy(remotePlayer.skateboard.mesh.rotation);
      remotePlayer.lastUpdateTime = now;
    }
  }
  
  // Generate a unique color based on peer ID
  private getPeerColor(peerId: string): number {
    // Simple hash function to get a number from the peerId string
    let hash = 0;
    for (let i = 0; i < peerId.length; i++) {
      hash = peerId.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    // Convert to a color - avoid dark colors by adding brightness
    const r = ((hash & 0xFF0000) >> 16) | 0x80;
    const g = ((hash & 0x00FF00) >> 8) | 0x80;
    const b = (hash & 0x0000FF) | 0x80;
    
    return (r << 16) | (g << 8) | b;
  }
  
  // Animate all remote skateboards with improved stability for stopped players
  private animateRemotePlayers(delta: number): void {
    const now = performance.now();
    const groundLevel = 0; // Assuming 0 is the ground level in your game
    
    this.remotePlayers.forEach((remotePlayer) => {
      const skateboard = remotePlayer.skateboard;
      
      // Get current position and rotation
      const currentPosition = skateboard.mesh.position;
      const currentRotation = skateboard.mesh.rotation;
      
      // Calculate time since last update and time since stopped moving
      const timeSinceUpdate = (now - remotePlayer.lastUpdateTime) / 1000; // in seconds
      const timeSinceStopped = (now - remotePlayer.movementState.stoppedTime) / 1000; // in seconds
      
      // Calculate stability factor - increases the longer a player has been stopped
      // This helps prevent oscillations after stopping by gradually increasing stability
      const postMovementStabilityFactor = Math.min(3.0, timeSinceStopped * 5.0);
      
      // Calculate the base predicted position
      const predictedPosition = remotePlayer.targetPosition.clone();
      
      // Only apply movement prediction if the player is actually moving
      if (remotePlayer.movementState.isMoving) {
        // Player is moving - calculate direction and apply prediction
        const direction = new THREE.Vector3().subVectors(
          remotePlayer.targetPosition,
          remotePlayer.lastPosition
        ).normalize();
        
        // Add a small amount of prediction to smooth movement
        const predictionAmount = Math.min(0.5, timeSinceUpdate * 2.0); 
        direction.multiplyScalar(predictionAmount);
        predictedPosition.add(direction);
      }

      // Special handling for jump and landing
      if (remotePlayer.movementState.isJumping || remotePlayer.movementState.isLanding) {
        // Ensure smoother vertical movement during jumps and landings
        const timeSinceJumpStart = remotePlayer.movementState.isJumping 
          ? (now - remotePlayer.movementState.jumpStartTime) / 1000
          : 0;
        
        const timeSinceLandingStart = remotePlayer.movementState.isLanding
          ? (now - remotePlayer.movementState.landingStartTime) / 1000
          : 0;
            
        // For landing, ensure we don't go below ground
        if (remotePlayer.movementState.isLanding) {
          // Ensure we're at or above ground level during landing
          predictedPosition.y = Math.max(predictedPosition.y, groundLevel);
          
          // Apply a fast snap to ground when landing
          if (timeSinceLandingStart > 0.1) {
            predictedPosition.y = groundLevel;
          }
        }
        
        // Apply a more aggressive lerp for vertical position during jumps
        // This allows for faster reaction to height changes
        if (remotePlayer.movementState.isJumping && timeSinceJumpStart > 0.05) {
          const jumpLerpFactor = Math.min(1.0, this.remotePositionLerpFactor * 2.5);
          currentPosition.y = THREE.MathUtils.lerp(currentPosition.y, predictedPosition.y, jumpLerpFactor);
        }
      }
      
      // Always ensure we're not below ground, regardless of network updates
      if (predictedPosition.y < groundLevel) {
        predictedPosition.y = groundLevel;
      }
      
      // Calculate distance to target for each axis separately
      const horizontalDistance = Math.sqrt(
        Math.pow(currentPosition.x - predictedPosition.x, 2) +
        Math.pow(currentPosition.z - predictedPosition.z, 2)
      );
      
      const verticalDistance = Math.abs(currentPosition.y - predictedPosition.y);
      const totalDistance = currentPosition.distanceTo(predictedPosition);
      
      // Apply different thresholds based on movement state and axis
      const isHorizontalMovementSignificant = horizontalDistance > (remotePlayer.movementState.isMoving ? 0.01 : 0.05 + postMovementStabilityFactor * 0.05);
      const isVerticalMovementSignificant = verticalDistance > 0.01 || remotePlayer.movementState.isJumping || remotePlayer.movementState.isLanding;
      
      // Apply separate horizontal and vertical updates for better stability
      if (isHorizontalMovementSignificant) {
        // Update X and Z with adaptive lerp factor
        const adaptiveHorizontalLerp = Math.min(1.0, this.remotePositionLerpFactor * (1.0 + horizontalDistance * 3));
        currentPosition.x = THREE.MathUtils.lerp(currentPosition.x, predictedPosition.x, adaptiveHorizontalLerp);
        currentPosition.z = THREE.MathUtils.lerp(currentPosition.z, predictedPosition.z, adaptiveHorizontalLerp);
      } else if (!remotePlayer.movementState.isMoving && horizontalDistance > 0.001) {
        // If not moving but still has a small difference and enough time has passed since stopping,
        // snap directly to target position to prevent oscillation
        if (timeSinceStopped > 0.2) {
          currentPosition.x = predictedPosition.x;
          currentPosition.z = predictedPosition.z;
        }
      }
      
      // Handle vertical movement separately (Y-axis) with jump/landing awareness
      if (!remotePlayer.movementState.isJumping && !remotePlayer.movementState.isLanding) {
        // Normal vertical movement handling when not jumping/landing
        if (isVerticalMovementSignificant) {
          // Update Y with a more controlled lerp for smoother vertical movement
          const adaptiveVerticalLerp = Math.min(1.0, this.remotePositionLerpFactor * (1.0 + verticalDistance * 2));
          currentPosition.y = THREE.MathUtils.lerp(currentPosition.y, predictedPosition.y, adaptiveVerticalLerp);
        } else if (!remotePlayer.movementState.verticalMovement && verticalDistance > 0.001) {
          // If not moving vertically but still has a small difference, snap to avoid up/down oscillation
          if (timeSinceStopped > 0.2) {
            currentPosition.y = predictedPosition.y;
          }
        }
      }
      
      // Final safety check - never allow below ground
      if (currentPosition.y < groundLevel) {
        currentPosition.y = groundLevel;
      }
      
      // Handle rotation with stability approach
      const rotationDifference = Math.abs(this.angleDifference(currentRotation.y, remotePlayer.targetRotation.y));
      
      if (rotationDifference > (remotePlayer.movementState.isMoving ? 0.01 : 0.05 + postMovementStabilityFactor * 0.05)) {
        // Apply smooth rotation for significant changes
        currentRotation.x = this.lerpAngle(currentRotation.x, remotePlayer.targetRotation.x, this.remoteRotationLerpFactor);
        currentRotation.y = this.lerpAngle(currentRotation.y, remotePlayer.targetRotation.y, this.remoteRotationLerpFactor);
        currentRotation.z = this.lerpAngle(currentRotation.z, remotePlayer.targetRotation.z, this.remoteRotationLerpFactor);
      } else if (rotationDifference > 0.001 && timeSinceStopped > 0.2) {
        // For small differences after stopping, snap to prevent oscillation
        currentRotation.copy(remotePlayer.targetRotation);
      }
      
      // Only animate wheels if actually moving horizontally
      if (remotePlayer.movementState.isMoving && horizontalDistance > 0.01) {
        const movementSpeed = horizontalDistance / delta;
        this.animateRemoteWheels(skateboard, movementSpeed * 5);
      }
      
      // Debug info for large corrections
      if (totalDistance > 1.0) {
        console.log(`Large position correction for ${remotePlayer.peerId}: ${totalDistance.toFixed(2)} units`);
      }
    });
  }
  
  // Animate the wheels on a remote skateboard
  private animateRemoteWheels(skateboard: Skateboard, speed: number): void {
    // Find and rotate the wheels
    skateboard.mesh.traverse(child => {
      if (child instanceof THREE.Mesh && child.name.includes('wheel')) {
        child.rotation.x += speed * 0.1; // Rotate around x-axis
      }
    });
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

  private onWindowResize(): void {
    this.cameraManager.setAspectRatio(window.innerWidth / window.innerHeight);
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  private update(): void {
    if (!this.isGameRunning) return;
    
    const delta = this.clock.getDelta();
    
    this.skateboard.update(delta);
    
    this.animateRemotePlayers(delta);
    
    if (this.isMultiplayer) {
      this.sendNetworkUpdate();
    }
    
    this.cameraManager.update();
  }

  private render(): void {
    // Render the scene
    this.renderer.render(this.scene, this.cameraManager.getCamera());
    
    // Update player label positions to follow their models
    this.updatePlayerLabels();
  }

  // Update HTML player labels to follow their 3D models
  private updatePlayerLabels(): void {
    // Get all player labels
    const labels = document.querySelectorAll('.player-label');
    
    // Update each label's position based on the 3D position of its model
    labels.forEach((element) => {
      // Cast to HTMLElement to access style properties
      const label = element as HTMLElement;
      const peerId = label.dataset.peerId;
      if (!peerId) return;
      
      const remotePlayer = this.remotePlayers.get(peerId);
      if (!remotePlayer) {
        // Player no longer exists, remove the label
        label.remove();
        return;
      }
      
      // Get the 3D position
      const position = remotePlayer.skateboard.mesh.position.clone();
      
      // Project the 3D position to screen coordinates
      position.y += 2; // Add height offset to position label above the model
      
      // Convert 3D position to screen coordinates
      const canvas = this.renderer.domElement;
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;
      
      // Project the position to 2D screen space
      position.project(this.cameraManager.getCamera());
      
      // Convert to CSS coordinates
      const x = (position.x * 0.5 + 0.5) * width;
      const y = (-position.y * 0.5 + 0.5) * height;
      
      // Check if the position is visible in the viewport
      if (position.z < 1 && x >= 0 && x <= width && y >= 0 && y <= height) {
        // Position is in front of the camera and within screen bounds
        label.style.display = 'block';
        label.style.transform = `translate(-50%, -50%) translate(${x}px, ${y}px)`;
      } else {
        // Position is behind the camera or outside screen bounds
        label.style.display = 'none';
      }
    });
  }

  public animate(): void {
    requestAnimationFrame(this.animate.bind(this));
    this.update();
    this.render();
  }

  // Send network updates to connected peers
  private sendNetworkUpdate(): void {
    if (!this.networkManager || !this.isMultiplayer) return;
    
    const now = performance.now();
    
    // Get current position and rotation
    const position = this.skateboard.mesh.position;
    const rotation = this.skateboard.mesh.rotation;
    
    // Calculate if the position has changed significantly
    const positionChanged = !this.lastSendPosition || 
        Math.abs(position.x - this.lastSendPosition.x) >= 0.01 ||
        Math.abs(position.y - this.lastSendPosition.y) >= 0.01 ||
        Math.abs(position.z - this.lastSendPosition.z) >= 0.01;
    
    // Calculate if rotation has changed significantly
    const lastRotation = this.lastRemoteRotation;
    const rotationChanged = 
        Math.abs(this.angleDifference(rotation.x, lastRotation.x)) > 0.02 ||
        Math.abs(this.angleDifference(rotation.y, lastRotation.y)) > 0.02 ||
        Math.abs(this.angleDifference(rotation.z, lastRotation.z)) > 0.02;
    
    // For moving players, update at normal rate
    const normalUpdateRate = 1000 / this.networkUpdateRate;
    // For idle players, update at a reduced rate to maintain sync but avoid jitter
    const idleUpdateRate = 500; // ms (2 updates per second when idle)
    
    const isMoving = positionChanged || rotationChanged;
    const updateInterval = isMoving ? normalUpdateRate : idleUpdateRate;
    
    // Determine if we should send an update based on time and movement
    const shouldUpdate = 
        // First update or forced periodic update
        this.lastSentTime === 0 || 
        (now - this.lastSentTime) > updateInterval ||
        // Always send updates when there are significant changes, regardless of time
        (isMoving && (now - this.lastSentTime) > normalUpdateRate);
    
    if (!shouldUpdate) {
      return; // Skip sending if not time yet
    }
    
    // Update last send position
    this.lastSendPosition = { 
      x: position.x, 
      y: position.y, 
      z: position.z 
    };
    
    // Update last rotation for change detection
    this.lastRemoteRotation.copy(rotation);
    
    // Record the send time
    this.lastSentTime = now;
    
    // Calculate velocity
    // Since we don't have direct access to the internal speed property,
    // we can estimate it from position changes
    const velocity = { x: 0, y: 0, z: 0 };
    
    // If we have a previous position, we can calculate an approximate velocity
    if (this.lastSendPosition) {
      const prevPos = new THREE.Vector3(
        this.lastSendPosition.x,
        this.lastSendPosition.y,
        this.lastSendPosition.z
      );
      
      // Calculate velocity as distance moved per time unit
      const timeDelta = (now - this.lastSentTime) / 1000; // in seconds
      if (timeDelta > 0) {
        const dist = position.distanceTo(prevPos);
        const speed = dist / timeDelta;
        
        // Apply direction using rotation
        velocity.x = Math.sin(rotation.y) * speed;
        velocity.z = Math.cos(rotation.y) * speed;
        velocity.y = (position.y - prevPos.y) / timeDelta; // Vertical velocity
      }
    }
    
    // Prepare skateboard state with extended data
    const skateboardState = {
      position: { 
        x: position.x, 
        y: position.y, 
        z: position.z 
      },
      rotation: { 
        x: rotation.x, 
        y: rotation.y, 
        z: rotation.z 
      },
      velocity,
      timestamp: now
    };
    
    if (this.isHost) {
      // Ensure we have a peer ID set
      const hostPeerId = this.peer?.id || 'host';
      
      // Collect all remote player states - excluding the host itself
      const otherPlayers = Array.from(this.remotePlayers.entries())
        .filter(([peerId]) => peerId !== hostPeerId) // Make sure we don't include the host
        .map(([peerId, player]) => {
          const position = player.skateboard.mesh.position;
          const rotation = player.skateboard.mesh.rotation;
          
          return {
            peerId,
            skateboardState: {
              position: { x: position.x, y: position.y, z: position.z },
              rotation: { x: rotation.x, y: rotation.y, z: rotation.z },
              timestamp: now
            }
          };
        });
      
      // Send comprehensive game state to all clients
      this.networkManager.sendGameState({
        hostPeerId,
        skateboardState,
        otherPlayers,
        timestamp: now
      });
    } else {
      // Client sends only its own input to the host
      this.networkManager.sendPlayerInput({
        skateboardState,
        clientId: this.peer?.id, // Send our ID to ensure proper tracking
        timestamp: now
      });
    }
  }

  private lerpAngle(current: number, target: number, t: number): number {
    const PI2 = Math.PI * 2;
    
    current = ((current % PI2) + PI2) % PI2;
    target = ((target % PI2) + PI2) % PI2;
    
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