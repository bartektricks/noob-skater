import * as THREE from 'three';

export class Rail {
  public mesh: THREE.Group;
  private railLength: number = 10;
  private railHeight: number = 0.8; // Increased height for better visibility
  private railWidth: number = 0.15; // Increased width for better visibility
  private startPosition: THREE.Vector3;
  private endPosition: THREE.Vector3;
  private direction: THREE.Vector3;
  
  constructor(startX: number, startZ: number, endX: number, endZ: number) {
    this.mesh = new THREE.Group();
    
    // Store start and end positions
    this.startPosition = new THREE.Vector3(startX, this.railHeight, startZ);
    this.endPosition = new THREE.Vector3(endX, this.railHeight, endZ);
    
    // Calculate direction vector (normalized)
    this.direction = new THREE.Vector3()
      .subVectors(this.endPosition, this.startPosition)
      .normalize();
    
    // Calculate actual length from start to end
    this.railLength = this.startPosition.distanceTo(this.endPosition);
    
    this.createRailMesh();
    this.createRailSupports();
  }
  
  private createRailMesh(): void {
    // Create the rail's geometry
    const railGeometry = new THREE.BoxGeometry(this.railWidth, this.railWidth, this.railLength);
    const railMaterial = new THREE.MeshStandardMaterial({ 
      color: 0xFF4500, // Bright orange color for better visibility
      metalness: 0.7,
      roughness: 0.2,
      emissive: 0x331100, // Slight glow
    });
    const rail = new THREE.Mesh(railGeometry, railMaterial);
    
    // Position rail with center at origin
    rail.position.y = this.railHeight;
    
    // Rotate rail to align with direction
    const angle = Math.atan2(this.direction.x, this.direction.z);
    rail.rotation.y = angle;
    
    // Position rail between start and end positions
    const midpoint = new THREE.Vector3().addVectors(
      this.startPosition, 
      this.endPosition
    ).multiplyScalar(0.5);
    
    rail.position.set(midpoint.x, midpoint.y, midpoint.z);
    
    this.mesh.add(rail);
  }
  
  private createRailSupports(): void {
    // Create supports at start, middle, and end
    const supportPositions = [0, 0.5, 1];
    const supportMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x555555,
      metalness: 0.5,
      roughness: 0.3
    });
    
    supportPositions.forEach(pos => {
      // Calculate position along the rail
      const supportPosition = new THREE.Vector3()
        .lerpVectors(this.startPosition, this.endPosition, pos);
      
      // Create leg geometry
      const legGeometry = new THREE.BoxGeometry(0.1, this.railHeight * 2, 0.1);
      const leg = new THREE.Mesh(legGeometry, supportMaterial);
      leg.position.set(supportPosition.x, this.railHeight / 2, supportPosition.z);
      
      this.mesh.add(leg);
    });
  }
  
  // Get the closest point on the rail to the given position
  public getClosestPointOnRail(position: THREE.Vector3): THREE.Vector3 {
    // Create a line from start to end
    const line = new THREE.Line3(this.startPosition, this.endPosition);
    
    // Get closest point on the line
    const closestPoint = new THREE.Vector3();
    line.closestPointToPoint(position, true, closestPoint);
    
    return closestPoint;
  }
  
  // Check if a position is close enough to the rail for grinding
  public isNearRail(position: THREE.Vector3, threshold: number = 3.0): boolean {
    const closestPoint = this.getClosestPointOnRail(position);
    const distance = position.distanceTo(closestPoint);
    console.log("Distance to rail:", distance, "threshold:", threshold);
    return distance < threshold;
  }
  
  // Get progress along the rail (0 at start, 1 at end)
  public getProgressAlongRail(position: THREE.Vector3): number {
    const closestPoint = this.getClosestPointOnRail(position);
    const distanceFromStart = this.startPosition.distanceTo(closestPoint);
    return Math.min(Math.max(distanceFromStart / this.railLength, 0), 1);
  }
  
  // Get the rail's direction vector (normalized)
  public getDirection(): THREE.Vector3 {
    return this.direction.clone();
  }
} 