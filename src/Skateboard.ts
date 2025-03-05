import * as THREE from 'three';
import { UI } from './UI';

export class Skateboard {
  public mesh: THREE.Group;
  private _speed: number = 0;
  private maxSpeed: number = 0.5;
  private acceleration: number = 0.01;
  private deceleration: number = 0.005;
  private turnSpeed: number = 0.03;
  private rotation: number = 0;
  private wheels: THREE.Mesh[] = [];
  private keys: { [key: string]: boolean } = {};
  
  // Jumping physics variables
  private verticalVelocity: number = 0;
  private gravity: number = 0.015;
  private jumpForce: number = 0.3;
  private _isGrounded: boolean = true; // Tracks if skateboard is on the ground
  private groundLevel: number = 0; // Default ground level
  private canJump: boolean = true; // Prevents jump spamming
  private jumpCooldown: number = 300; // ms before able to jump again
  private jumpBoost: number = 1.0; // Multiplier for jump force based on speed
  
  // UI reference
  private ui: UI | null = null;

  // Getter for speed to make it accessible to UI
  public get speed(): number {
    return this._speed;
  }
  
  // Getter for ground state to make it accessible to UI
  public get isGrounded(): boolean {
    return this._isGrounded;
  }
  
  // Method to set UI reference
  public setUI(ui: UI): void {
    this.ui = ui;
  }

  constructor() {
    this.mesh = new THREE.Group();

    // Create skateboard deck with concave shape
    const deckShape = new THREE.Shape();
    deckShape.moveTo(-4, -0.4);
    deckShape.quadraticCurveTo(-4, 0, -3.8, 0.1);
    deckShape.lineTo(3.8, 0.1);
    deckShape.quadraticCurveTo(4, 0, 4, -0.4);
    deckShape.lineTo(-4, -0.4);

    const extrudeSettings = {
      steps: 1,
      depth: 2,
      bevelEnabled: true,
      bevelThickness: 0.1,
      bevelSize: 0.1,
      bevelSegments: 3
    };

    const deckGeometry = new THREE.ExtrudeGeometry(deckShape, extrudeSettings);
    deckGeometry.scale(0.25, 0.1, 0.35);
    
    const deckMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x333333, // Dark gray for the deck
      roughness: 0.8,
      metalness: 0.2
    });
    
    const deck = new THREE.Mesh(deckGeometry, deckMaterial);
    deck.rotation.y = Math.PI / 2;
    deck.position.set(-0.345, 0.3, 0);
    deck.castShadow = true;
    this.mesh.add(deck);

    // Create trucks (metal parts that hold the wheels)
    const truckGeometry = new THREE.BoxGeometry(0.3, 0.1, 0.6);
    const truckMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x888888,
      metalness: 0.8,
      roughness: 0.2
    });

    // Front truck
    const frontTruck = new THREE.Mesh(truckGeometry, truckMaterial);
    frontTruck.position.set(0, 0.15, 0.6);
    this.mesh.add(frontTruck);

    // Back truck
    const backTruck = new THREE.Mesh(truckGeometry, truckMaterial);
    backTruck.position.set(0, 0.15, -0.6);
    this.mesh.add(backTruck);

    // Create wheels
    const wheelGeometry = new THREE.CylinderGeometry(0.15, 0.15, 0.2, 32);
    const wheelMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x222222,
      roughness: 0.3,
      metalness: 0.7
    });
    
    const wheelPositions = [
      { x: -0.3, y: 0.15, z: 0.7, isFront: true },
      { x: 0.3, y: 0.15, z: 0.7, isFront: true },
      { x: -0.3, y: 0.15, z: -0.7, isFront: false },
      { x: 0.3, y: 0.15, z: -0.7, isFront: false }
    ];

    wheelPositions.forEach(pos => {
      const wheel = new THREE.Mesh(wheelGeometry, wheelMaterial);
      wheel.position.set(pos.x, pos.y, pos.z);
      wheel.rotation.z = Math.PI / 2;
      wheel.castShadow = true;
      this.mesh.add(wheel);
      this.wheels.push(wheel);
    });

    // Set up keyboard controls
    this.setupControls();
  }
  
  private setupControls(): void {
    document.addEventListener('keydown', (event) => {
      this.keys[event.key.toLowerCase()] = true;
      
      // Handle jump with spacebar
      if (event.key === ' ' && this._isGrounded && this.canJump) {
        this.jump();
      }
    });

    document.addEventListener('keyup', (event) => {
      this.keys[event.key.toLowerCase()] = false;
    });
  }
  
  private jump(): void {
    // Apply upward force with boost based on current speed
    const speedFactor = 1.0 + Math.abs(this._speed) * this.jumpBoost;
    this.verticalVelocity = this.jumpForce * speedFactor;
    this._isGrounded = false;
    this.canJump = false;
    
    // Show "Ollie" text using UI
    if (this.ui) {
      this.ui.showTrickText("Ollie");
    }
    
    // Allow jumping again after cooldown (prevents jump spamming)
    setTimeout(() => {
      this.canJump = true;
    }, this.jumpCooldown);
    
    // Add a little forward boost when jumping at speed
    if (Math.abs(this._speed) > 0.05) {
      this._speed *= 1.1; // 10% speed boost on jump
    }
  }

  public update(delta: number): void {
    // Handle acceleration and deceleration
    if (this.keys['w']) {
      this._speed = Math.min(this._speed + this.acceleration, this.maxSpeed);
    } else if (this.keys['s']) {
      this._speed = Math.max(this._speed - this.acceleration, -this.maxSpeed / 2);
    } else {
      // Apply deceleration when no keys are pressed
      if (this._speed > 0) {
        this._speed = Math.max(0, this._speed - this.deceleration);
      } else if (this._speed < 0) {
        this._speed = Math.min(0, this._speed + this.deceleration);
      }
    }

    // Handle steering - only turn if the skateboard is moving
    if (Math.abs(this._speed) > 0.01) { // Small threshold to prevent turning when almost stopped
      if (this.keys['a']) {
        this.rotation += this.turnSpeed * (this._speed > 0 ? 1 : -1);
      }
      if (this.keys['d']) {
        this.rotation -= this.turnSpeed * (this._speed > 0 ? 1 : -1);
      }
    }

    // Apply rotation
    this.mesh.rotation.y = this.rotation;

    // Calculate movement with improved physics
    const moveX = Math.sin(this.rotation) * this._speed * delta * 60;
    const moveZ = Math.cos(this.rotation) * this._speed * delta * 60;

    // Update horizontal position with smoother movement
    this.mesh.position.x += moveX;
    this.mesh.position.z += moveZ;
    
    // Apply jumping physics
    this.updateVerticalPosition(delta);
  }
  
  private updateVerticalPosition(delta: number): void {
    // Apply gravity to vertical velocity
    this.verticalVelocity -= this.gravity * delta * 60;
    
    // Update vertical position
    this.mesh.position.y += this.verticalVelocity * delta * 60;
    
    // Check for ground collision
    if (this.mesh.position.y <= this.groundLevel) {
      this.mesh.position.y = this.groundLevel;
      
      // Add landing effect - reduce speed slightly on landing from height
      if (!this._isGrounded && this.verticalVelocity < -0.1) {
        // Harder landings have more impact on speed
        const landingImpact = Math.min(Math.abs(this.verticalVelocity) * 0.5, 0.4);
        this._speed *= (1 - landingImpact);
      }
      
      this.verticalVelocity = 0;
      this._isGrounded = true;
    }
    
    // Apply skateboard tilt based on vertical movement and direction
    if (!this._isGrounded) {
      // Tilt the skateboard based on vertical velocity
      const tiltAmount = Math.min(Math.max(this.verticalVelocity * 0.5, -0.3), 0.3);
      
      // Apply forward tilt when jumping and backward tilt when falling
      this.mesh.rotation.x = -tiltAmount;
      
      // Add a slight roll effect during jumps for style
      const rollFactor = Math.sin(Date.now() * 0.003) * 0.05;
      this.mesh.rotation.z = rollFactor;
    } else {
      // Reset tilt when on ground
      this.mesh.rotation.x = 0;
      this.mesh.rotation.z = 0;
    }
  }
} 