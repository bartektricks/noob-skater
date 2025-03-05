import * as THREE from 'three';

export class Camera {
  public camera: THREE.PerspectiveCamera;
  private target: THREE.Vector3;
  private debugContainer: HTMLDivElement | null = null;
  
  // Camera state
  private state = {
    // Horizontal orbit angle in radians (around Y axis)
    orbit: 0,
    // Vertical angle in radians (0 = horizontal, π/2 = looking down)
    elevation: Math.PI / 6,
    // Distance from target
    distance: 10,
    // Height offset from target
    height: 2
  };

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
    
    // Create debug UI if in development mode
    this.setupDebugUI();
  }
  
  private updateCamera(): void {
    // Calculate camera position based on orbit and elevation angles
    const { orbit, elevation, distance, height } = this.state;
    
    // Calculate horizontal position (orbit around y-axis)
    const horizontalDistance = distance * Math.cos(elevation);
    const x = this.target.x + horizontalDistance * Math.sin(orbit);
    const z = this.target.z + horizontalDistance * Math.cos(orbit);
    
    // Calculate vertical position (based on elevation angle and height)
    const y = this.target.y + height + distance * Math.sin(elevation);
    
    // Update camera position and look at target
    this.camera.position.set(x, y, z);
    this.camera.lookAt(this.target);
  }
  
  public setTarget(target: THREE.Vector3): void {
    this.target.copy(target);
    this.updateCamera();
  }
  
  public setAspectRatio(aspectRatio: number): void {
    this.camera.aspect = aspectRatio;
    this.camera.updateProjectionMatrix();
  }
  
  // Camera state getters and setters
  public getState(): typeof this.state {
    return this.state;
  }
  
  public setOrbit(value: number): void {
    this.state.orbit = value;
    this.updateCamera();
    this.updateDebugUI();
  }
  
  public setElevation(value: number): void {
    // Clamp elevation to avoid gimbal lock
    this.state.elevation = Math.max(0.1, Math.min(Math.PI / 2 - 0.1, value));
    this.updateCamera();
    this.updateDebugUI();
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
  
  public reset(): void {
    this.state = {
      orbit: 0,
      elevation: Math.PI / 6,
      distance: 10,
      height: 2
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
    
    // Title
    const title = document.createElement('h3');
    title.textContent = 'Camera Controls';
    title.style.margin = '0 0 10px 0';
    this.debugContainer.appendChild(title);
    
    // Add sliders for each camera parameter
    this.createSlider('Orbit', 0, Math.PI * 2, 0.01, this.state.orbit, (value) => this.setOrbit(value));
    this.createSlider('Elevation', 0.1, Math.PI / 2 - 0.1, 0.01, this.state.elevation, (value) => this.setElevation(value));
    this.createSlider('Distance', 2, 30, 0.5, this.state.distance, (value) => this.setDistance(value));
    this.createSlider('Height', 0, 10, 0.1, this.state.height, (value) => this.setHeight(value));
    
    // Add reset button
    const resetButton = document.createElement('button');
    resetButton.textContent = 'Reset Camera';
    resetButton.style.marginTop = '10px';
    resetButton.style.padding = '5px 10px';
    resetButton.addEventListener('click', () => this.reset());
    this.debugContainer.appendChild(resetButton);
    
    // Add toggle button
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
  }
  
  private updateDebugUI(): void {
    // This method would update slider positions when camera state changes programmatically
    // Implementation would depend on how we track the slider elements
    // For a complete implementation, we would need to store references to the slider elements
  }
} 