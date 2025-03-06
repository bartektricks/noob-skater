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
  private airMoveDirection: number = 0;
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

  // Add reorientation properties 
  private isReorienting: boolean = false;
  private reorientStartTime: number = 0;
  private reorientDuration: number = 250; // milliseconds
  private reorientStartAngle: number = 0;
  private reorientTargetAngle: number = 0;
  private movementFlipped: boolean = false; // Whether controls are currently flipped
  
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
    
    // Yellow deck material
    const deckMaterial = new THREE.MeshStandardMaterial({ 
      color: 0xF7CA18, // Bright yellow
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
    // Store current rotation as the air movement direction when jumping
    this.airMoveDirection = this.rotation;

    // Apply upward force with boost based on current speed
    const speedFactor = 1.0 + Math.abs(this._speed) * this.jumpBoost;
    this.verticalVelocity = this.jumpForce * speedFactor;
    this._isGrounded = false;
    this.canJump = false;
    
    // Show appropriate trick text based on stance
    if (this.ui) {
      if (this.movementFlipped) {
        this.ui.showTrickText("Fakie Ollie");
      } else {
        this.ui.showTrickText("Ollie");
      }
    }
    
    // Speed boost on jump
    if (Math.abs(this._speed) > 0.05) {
      this._speed *= 1.1; // 10% speed boost on jump
    }
    
    // Allow jumping again after cooldown (prevents jump spamming)
    setTimeout(() => {
      this.canJump = true;
    }, this.jumpCooldown);
  }

  public update(delta: number): void {
    // Handle acceleration and deceleration with flipped controls if needed
    if ((this.keys['w'] && !this.movementFlipped) || (this.keys['s'] && this.movementFlipped)) {
      this._speed = Math.min(this._speed + this.acceleration, this.maxSpeed);
    } else if ((this.keys['s'] && !this.movementFlipped) || (this.keys['w'] && this.movementFlipped)) {
      this._speed = Math.max(this._speed - this.acceleration, -this.maxSpeed / 2);
    } else {
      // Apply deceleration when no keys are pressed
      if (this._speed > 0) {
        this._speed = Math.max(0, this._speed - this.deceleration);
      } else if (this._speed < 0) {
        this._speed = Math.min(0, this._speed + this.deceleration);
      }
    }

    // Handle steering - only allow turning if the skateboard is on the ground and moving
    if (this._isGrounded && Math.abs(this._speed) > 0.01) { // Small threshold to prevent turning when almost stopped
      // Adjust steering based on whether controls are flipped
      const steeringFactor = this.movementFlipped ? -1 : 1;
      
      if (this.keys['a']) {
        this.rotation += this.turnSpeed * (this._speed > 0 ? 1 : -1) * steeringFactor;
      }
      if (this.keys['d']) {
        this.rotation -= this.turnSpeed * (this._speed > 0 ? 1 : -1) * steeringFactor;
      }
    }

    // Allow rotation in air with A and D keys, but don't affect movement direction
    if (!this._isGrounded) {
      if (this.keys['a']) {
        // Rotate board around Y axis (faster rotation in air for trick effect)
        this.rotation += this.turnSpeed * 1.5;
      }
      if (this.keys['d']) {
        // Rotate board around Y axis (faster rotation in air for trick effect)
        this.rotation -= this.turnSpeed * 1.5;
      }
    }
    
    // Update reorientation if active
    if (this.isReorienting) {
      this.updateReorientation();
    } else {
      // Apply rotation to the mesh (only if not reorienting)
      this.mesh.rotation.y = this.rotation;
    }

    // Calculate movement with improved physics
    let moveX, moveZ;
    
    if (this._isGrounded) {
      // On ground: move in the direction the board is facing
      moveX = Math.sin(this.rotation) * this._speed * delta * 60;
      moveZ = Math.cos(this.rotation) * this._speed * delta * 60;
    } else {
      // In air: move in the stored direction regardless of board rotation
      // When in fakie, we maintain the same movement direction but the board is rotated 180°
      moveX = Math.sin(this.airMoveDirection) * this._speed * delta * 60;
      moveZ = Math.cos(this.airMoveDirection) * this._speed * delta * 60;
    }

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
        
        // Start reorientation when landing
        this.startReorientation();
      }
      
      this.verticalVelocity = 0;
      this._isGrounded = true;
      
      // Reset air movement direction to current rotation when landing
      // (We keep this but will adjust during reorientation)
      this.airMoveDirection = this.rotation;
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

  /**
   * Start the reorientation process to align the board with movement direction
   */
  private startReorientation(): void {
    // Only start reorientation if we have significant difference
    const rotationDiff = this.normalizeAngle(this.rotation - this.airMoveDirection);
    const absDiff = Math.abs(rotationDiff);
    
    // If already aligned, do nothing
    if (absDiff < 0.1) return;
    
    this.isReorienting = true;
    this.reorientStartTime = Date.now();
    this.reorientStartAngle = this.rotation;
    
    // Check if we've done approximately a 180-degree turn (between 135 and 225 degrees)
    const isApprox180 = absDiff > (Math.PI * 0.75) && absDiff < (Math.PI * 1.25);
    
    if (isApprox180) {
      // We've done a 180-degree turn, so flip the controls
      const oppositeDirection = this.normalizeAngle(this.airMoveDirection + Math.PI);
      this.reorientTargetAngle = oppositeDirection;
      this.movementFlipped = !this.movementFlipped; // Toggle flip state
      
      // If UI exists, show a trick message
      if (this.ui) {
        this.ui.showTrickText(this.movementFlipped ? "Fakie" : "Regular");
      }
    } else {
      // For non-180 rotations, maintain the current stance (fakie or regular)
      // but align the board with the movement direction
      if (this.movementFlipped) {
        // In fakie: align with opposite of movement direction
        this.reorientTargetAngle = this.normalizeAngle(this.airMoveDirection + Math.PI);
      } else {
        // In regular: align with movement direction
        this.reorientTargetAngle = this.airMoveDirection;
      }
      // Don't change movementFlipped state for small rotations
    }
  }
  
  /**
   * Calculate and apply reorientation progress
   */
  private updateReorientation(): void {
    if (!this.isReorienting) return;
    
    const elapsed = Date.now() - this.reorientStartTime;
    const progress = Math.min(elapsed / this.reorientDuration, 1.0);
    
    // Use a quick ease-out for smooth finish
    const easedProgress = 1 - Math.pow(1 - progress, 2);
    
    // Interpolate rotation
    this.rotation = this.interpolateAngle(
      this.reorientStartAngle,
      this.reorientTargetAngle,
      easedProgress
    );
    
    // Apply rotation to mesh
    this.mesh.rotation.y = this.rotation;
    
    // End reorientation when complete
    if (progress >= 1.0) {
      this.isReorienting = false;
      // Update movement direction to match new rotation
      this.airMoveDirection = this.rotation;
    }
  }
  
  /**
   * Normalize an angle to be between -PI and PI
   */
  private normalizeAngle(angle: number): number {
    while (angle > Math.PI) angle -= Math.PI * 2;
    while (angle < -Math.PI) angle += Math.PI * 2;
    return angle;
  }
  
  /**
   * Interpolate between angles with proper handling of angle wrapping
   */
  private interpolateAngle(startAngle: number, endAngle: number, progress: number): number {
    // Normalize angles
    startAngle = this.normalizeAngle(startAngle);
    endAngle = this.normalizeAngle(endAngle);
    
    // Find shortest path
    let delta = endAngle - startAngle;
    delta = this.normalizeAngle(delta);
    
    // Interpolate
    return startAngle + delta * progress;
  }

  // Add a method to get the movement direction (useful for camera)
  public getMovementDirection(): number {
    return this._isGrounded ? this.rotation : this.airMoveDirection;
  }
  
  // Get the current stance (regular or fakie)
  public getStance(): string {
    return this.movementFlipped ? "fakie" : "regular";
  }
} 