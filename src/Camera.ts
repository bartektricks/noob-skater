import * as THREE from 'three';
import { Skateboard } from './Skateboard';

type State = {
  // Distance behind the skateboard
  distance: number;
  // Height offset from skateboard
  height: number;
  // Vertical framing offset - positive moves target lower in frame
  verticalFraming: number;
  // Angle offset from skateboard's rotation (in radians)
  angleOffset: number;
}

const INITIAL_STATE: State = {
  distance: 5.5,
  height: 2,
  verticalFraming: -0.3,
  angleOffset: 0
};

export class Camera {
  public camera: THREE.PerspectiveCamera;
  private target: THREE.Vector3;
  private debugContainer: HTMLDivElement | null = null;
  private skateboard: Skateboard | null = null;
  private state = INITIAL_STATE;
  private sliderElements: {[key: string]: {slider: HTMLInputElement, valueDisplay: HTMLSpanElement}} = {};

  constructor(aspectRatio: number) {
    // Create camera
    this.camera = new THREE.PerspectiveCamera(
      75,
      aspectRatio,
      0.1,
      1000
    );
    
    // Default target
    this.target = new THREE.Vector3(0, 2, 0);
    
    // Set initial camera position
    this.updateCamera();
    
    // Create debug UI
    this.setupDebugUI();
  }
  
  public setSkateboardReference(skateboard: Skateboard): void {
    this.skateboard = skateboard;
    // Ensure camera is updated with correct settings after skateboard is set
    this.reset(); // This will apply INITIAL_STATE and update the camera
  }
  
  private updateCamera(): void {
    if (!this.skateboard) {
      // Fall back to old behavior if skateboard reference is not set
      this.updateCameraStatic();
      return;
    }
    
    // Get skateboard position and rotation
    const skateboardPosition = this.skateboard.mesh.position.clone();
    const skateboardRotation = this.skateboard.mesh.rotation.y;
    
    // Calculate angle for camera position (behind the skateboard)
    const cameraAngle = skateboardRotation + Math.PI + this.state.angleOffset;
    
    // Calculate camera position behind the skateboard
    const offsetX = Math.sin(cameraAngle) * this.state.distance;
    const offsetZ = Math.cos(cameraAngle) * this.state.distance;
    
    // Set camera position
    this.camera.position.x = skateboardPosition.x + offsetX;
    this.camera.position.z = skateboardPosition.z + offsetZ;
    this.camera.position.y = skateboardPosition.y + this.state.height;
    
    // Calculate look target with vertical framing adjustment
    const lookTarget = skateboardPosition.clone();
    lookTarget.y -= this.state.verticalFraming * this.state.distance;
    
    // Look at the skateboard
    this.camera.lookAt(lookTarget);
    
    // Update internal target reference to match skateboard position
    this.target.copy(skateboardPosition);
  }
  
  // Original static camera method preserved for backward compatibility
  private updateCameraStatic(): void {
    // Calculate horizontal position using orbit
    const horizontalDistance = this.state.distance;
    const x = this.target.x;
    const z = this.target.z - horizontalDistance;
    
    // Calculate vertical position
    const y = this.target.y + this.state.height;
    
    // Update camera position
    this.camera.position.set(x, y, z);
    
    // Create an adjusted target for vertical framing
    const adjustedTarget = this.target.clone();
    adjustedTarget.y -= this.state.verticalFraming * this.state.distance;
    
    // Look at the adjusted target
    this.camera.lookAt(adjustedTarget);
  }
  
  public setTarget(target: THREE.Vector3): void {
    this.target.copy(target);
    this.updateCamera();
  }
  
  public setAspectRatio(aspectRatio: number): void {
    this.camera.aspect = aspectRatio;
    this.camera.updateProjectionMatrix();
  }
  
  /**
   * Update method to be called every frame in the game loop
   * Ensures the camera continuously follows the skateboard
   */
  public update(): void {
    // Make sure we update the camera position every frame
    if (this.skateboard) {
      this.updateCamera();
    }
  }
  
  // Camera state getters and setters
  public getState(): typeof this.state {
    return this.state;
  }
  
  public setDistance(value: number): void {
    this.state.distance = Math.max(2, Math.min(30, value));
    this.updateCamera();
    this.updateDebugUI();
  }
  
  public setHeight(value: number): void {
    this.state.height = Math.max(0, value);
    this.updateCamera();
    this.updateDebugUI();
  }
  
  public setVerticalFraming(value: number): void {
    // Limit the range to reasonable values
    this.state.verticalFraming = Math.max(-0.3, Math.min(0.5, value));
    this.updateCamera();
    this.updateDebugUI();
  }
  
  public setAngleOffset(value: number): void {
    // Angle offset in radians
    this.state.angleOffset = value;
    this.updateCamera();
    this.updateDebugUI();
  }
  
  public reset(): void {
    // Create a fresh copy of INITIAL_STATE to avoid reference issues
    this.state = {
      distance: INITIAL_STATE.distance,
      height: INITIAL_STATE.height,
      verticalFraming: INITIAL_STATE.verticalFraming,
      angleOffset: INITIAL_STATE.angleOffset
    };
    this.updateCamera();
    this.updateDebugUI();
  }

  // Debug UI methods
  private setupDebugUI(): void {
    // Create container for debug UI
    this.debugContainer = document.createElement('div');
    this.debugContainer.style.position = 'fixed';
    this.debugContainer.style.left = '20px';
    this.debugContainer.style.top = '60px';
    this.debugContainer.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
    this.debugContainer.style.color = 'white';
    this.debugContainer.style.padding = '15px';
    this.debugContainer.style.borderRadius = '5px';
    this.debugContainer.style.fontFamily = 'Arial, sans-serif';
    this.debugContainer.style.minWidth = '250px';
    this.debugContainer.style.display = 'none';
    
    const title = document.createElement('h3');
    title.textContent = 'Camera Controls';
    title.style.margin = '0 0 10px 0';
    this.debugContainer.appendChild(title);
    
    this.createSlider('Distance', 2, 30, 0.5, this.state.distance, (value) => this.setDistance(value));
    this.createSlider('Height', 0, 10, 0.1, this.state.height, (value) => this.setHeight(value));
    this.createSlider('Vertical Framing', -0.3, 0.5, 0.01, this.state.verticalFraming, (value) => this.setVerticalFraming(value));
    this.createSlider('Angle Offset', -Math.PI/2, Math.PI/2, 0.01, this.state.angleOffset, (value) => this.setAngleOffset(value));
    
    const resetButton = document.createElement('button');
    resetButton.textContent = 'Reset Camera';
    resetButton.style.marginTop = '10px';
    resetButton.style.padding = '5px 10px';
    resetButton.addEventListener('click', () => this.reset());
    this.debugContainer.appendChild(resetButton);
    
    const toggleContainer = document.createElement('div');
    toggleContainer.style.position = 'fixed';
    toggleContainer.style.left = '20px';
    toggleContainer.style.top = '20px';
    toggleContainer.style.zIndex = '1000';
    
    const toggleButton = document.createElement('button');
    toggleButton.textContent = 'Toggle Camera Controls';
    toggleButton.style.padding = '5px 10px';
    toggleButton.addEventListener('click', () => {
      if (this.debugContainer) {
        this.debugContainer.style.display = 
          this.debugContainer.style.display === 'none' ? 'block' : 'none';
      }
    });
    
    toggleContainer.appendChild(toggleButton);
    document.body.appendChild(toggleContainer);
    document.body.appendChild(this.debugContainer);
  }
  
  private createSlider(
    label: string, 
    min: number, 
    max: number, 
    step: number, 
    value: number, 
    onChange: (value: number) => void
  ): void {
    if (!this.debugContainer) return;
    
    const container = document.createElement('div');
    container.style.marginBottom = '10px';
    
    const labelElement = document.createElement('label');
    labelElement.textContent = `${label}: `;
    container.appendChild(labelElement);
    
    const valueDisplay = document.createElement('span');
    valueDisplay.textContent = value.toFixed(2);
    valueDisplay.style.marginLeft = '5px';
    container.appendChild(valueDisplay);
    
    const slider = document.createElement('input');
    slider.type = 'range';
    slider.min = min.toString();
    slider.max = max.toString();
    slider.step = step.toString();
    slider.value = value.toString();
    slider.style.width = '100%';
    slider.style.marginTop = '5px';
    
    slider.addEventListener('input', (e) => {
      const newValue = parseFloat((e.target as HTMLInputElement).value);
      valueDisplay.textContent = newValue.toFixed(2);
      onChange(newValue);
    });
    
    container.appendChild(slider);
    this.debugContainer.appendChild(container);
    
    // Store reference to the slider elements for later updates
    const key = label.toLowerCase().replace(/\s+/g, '');
    this.sliderElements[key] = { slider, valueDisplay };
  }
  
  private updateDebugUI(): void {
    // Update the slider positions and values to match the current state
    if (this.sliderElements['distance']) {
      const { slider, valueDisplay } = this.sliderElements['distance'];
      slider.value = this.state.distance.toString();
      valueDisplay.textContent = this.state.distance.toFixed(2);
    }
    
    if (this.sliderElements['height']) {
      const { slider, valueDisplay } = this.sliderElements['height'];
      slider.value = this.state.height.toString();
      valueDisplay.textContent = this.state.height.toFixed(2);
    }
    
    if (this.sliderElements['verticalframing']) {
      const { slider, valueDisplay } = this.sliderElements['verticalframing'];
      slider.value = this.state.verticalFraming.toString();
      valueDisplay.textContent = this.state.verticalFraming.toFixed(2);
    }
    
    if (this.sliderElements['angleoffset']) {
      const { slider, valueDisplay } = this.sliderElements['angleoffset'];
      slider.value = this.state.angleOffset.toString();
      valueDisplay.textContent = this.state.angleOffset.toFixed(2);
    }
  }
} 