import * as THREE from 'three';

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

  // Getter for speed to make it accessible to UI
  public get speed(): number {
    return this._speed;
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

    // Setup controls
    this.setupControls();
  }

  private setupControls(): void {
    document.addEventListener('keydown', (event) => {
      this.keys[event.key.toLowerCase()] = true;
    });

    document.addEventListener('keyup', (event) => {
      this.keys[event.key.toLowerCase()] = false;
    });
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

    // Update position with smoother movement
    this.mesh.position.x += moveX;
    this.mesh.position.z += moveZ;
  }
} 