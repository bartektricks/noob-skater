import * as THREE from "three";
import type { Skateboard } from "./Skateboard";

type State = {
	// Distance behind the skateboard
	distance: number;
	// Height offset from skateboard
	height: number;
	// Vertical framing offset - positive moves target lower in frame
	verticalFraming: number;
	// Angle offset from skateboard's rotation (in radians)
	angleOffset: number;
};

const INITIAL_STATE: State = {
	distance: 5.5,
	height: 2,
	verticalFraming: -0.3,
	angleOffset: 0,
};

export class Camera {
	public camera: THREE.PerspectiveCamera;
	private target: THREE.Vector3;
	private debugContainer: HTMLDivElement | null = null;
	private skateboard: Skateboard | null = null;
	private state = INITIAL_STATE;
	private sliderElements: {
		[key: string]: { slider: HTMLInputElement; valueDisplay: HTMLSpanElement };
	} = {};

	// Tony Hawk style camera properties
	private targetCameraAngle = 0; // Angle we're moving toward
	private currentCameraAngle = 0; // Current actual camera angle
	private cameraLerpFactor = 0.03; // How quickly camera rotates to new position (lower = slower)
	private lastUpdateTime = 0; // For frame-rate independent updates

	constructor(aspectRatio: number) {
		// Create camera
		this.camera = new THREE.PerspectiveCamera(75, aspectRatio, 0.1, 1000);

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

		// Get current time for smooth transitions
		const currentTime = Date.now();
		const deltaTime = Math.min((currentTime - this.lastUpdateTime) / 1000, 0.1); // Cap at 100ms to avoid jumps
		this.lastUpdateTime = currentTime;

		// Get skateboard position, rotation and movement info
		const skateboardPosition = this.skateboard.mesh.position.clone();
		const skateboardRotation = this.skateboard.mesh.rotation.y;
		const isGrounded = this.skateboard.isGrounded;
		const movementDirection = this.skateboard.getMovementDirection();
		const speed = this.skateboard.speed;
		const stance = this.skateboard.getStance();

		// Adjust camera behavior based on speed and state
		if (Math.abs(speed) > 0.05) {
			// Moving with significant speed - target movement direction
			// When in fakie, adjust the target angle by 180 degrees to keep camera behind player
			if (stance === "fakie") {
				this.targetCameraAngle = this.normalizeAngle(
					movementDirection + Math.PI,
				);
			} else {
				this.targetCameraAngle = movementDirection;
			}
		} else if (isGrounded) {
			// Standing still on ground - slowly align with board orientation
			// When in fakie, adjust the target angle by 180 degrees
			if (stance === "fakie") {
				this.targetCameraAngle = this.normalizeAngle(
					skateboardRotation + Math.PI,
				);
			} else {
				this.targetCameraAngle = skateboardRotation;
			}
		}
		// When in air with low speed, keep the current target angle (for stability during tricks)

		// Smoothly interpolate current camera angle toward target angle (Tony Hawk style)
		// Calculate shortest path to target angle
		const angleDiff = this.normalizeAngle(
			this.targetCameraAngle - this.currentCameraAngle,
		);

		// Adjust lerp factor based on grounded state and speed
		let actualLerpFactor = this.cameraLerpFactor;
		if (!isGrounded) {
			// Slower camera rotation in air
			actualLerpFactor *= 0.5;
		} else if (Math.abs(speed) > 0.3) {
			// Faster camera rotation at high speeds
			actualLerpFactor *= 1.5;
		}

		// Apply smooth lerping with deltaTime for frame-rate independence
		this.currentCameraAngle += angleDiff * actualLerpFactor * (deltaTime * 60);

		// Calculate angle for camera position (behind the skateboard)
		const cameraAngle =
			this.currentCameraAngle + Math.PI + this.state.angleOffset;

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

	// Changed to private since it's only used internally by the debug UI
	private setVerticalFraming(value: number): void {
		// Limit the range to reasonable values
		this.state.verticalFraming = Math.max(-0.3, Math.min(0.5, value));
		this.updateCamera();
		this.updateDebugUI();
	}

	// Changed to private since it's only used internally by the debug UI
	private setAngleOffset(value: number): void {
		// Angle offset in radians
		this.state.angleOffset = value;
		this.updateCamera();
		this.updateDebugUI();
	}

	/**
	 * Reset camera settings and states
	 */
	public reset(): void {
		// Create a fresh copy of INITIAL_STATE to avoid reference issues
		this.state = {
			distance: INITIAL_STATE.distance,
			height: INITIAL_STATE.height,
			verticalFraming: INITIAL_STATE.verticalFraming,
			angleOffset: INITIAL_STATE.angleOffset,
		};

		// Reset THPS camera properties
		if (this.skateboard) {
			// Initialize camera angles to current board direction
			this.currentCameraAngle = this.skateboard.mesh.rotation.y;
			this.targetCameraAngle = this.skateboard.mesh.rotation.y;
		} else {
			this.currentCameraAngle = 0;
			this.targetCameraAngle = 0;
		}

		this.lastUpdateTime = Date.now();

		this.updateCamera();
		this.updateDebugUI();
	}

	// Debug UI methods
	private setupDebugUI(): void {
		// Create container for debug UI
		this.debugContainer = document.createElement("div");
		this.debugContainer.style.position = "fixed";
		this.debugContainer.style.left = "20px";
		this.debugContainer.style.top = "60px";
		this.debugContainer.style.backgroundColor = "rgba(0, 0, 0, 0.7)";
		this.debugContainer.style.color = "white";
		this.debugContainer.style.padding = "15px";
		this.debugContainer.style.borderRadius = "5px";
		this.debugContainer.style.fontFamily = "Arial, sans-serif";
		this.debugContainer.style.minWidth = "250px";
		this.debugContainer.style.display = "none";

		const title = document.createElement("h3");
		title.textContent = "Camera Controls";
		title.style.margin = "0 0 10px 0";
		this.debugContainer.appendChild(title);

		this.createSlider("Distance", 2, 30, 0.5, this.state.distance, (value) =>
			this.setDistance(value),
		);
		this.createSlider("Height", 0, 10, 0.1, this.state.height, (value) =>
			this.setHeight(value),
		);
		this.createSlider(
			"Vertical Framing",
			-0.3,
			0.5,
			0.01,
			this.state.verticalFraming,
			(value) => this.setVerticalFraming(value),
		);
		this.createSlider(
			"Angle Offset",
			-Math.PI / 2,
			Math.PI / 2,
			0.01,
			this.state.angleOffset,
			(value) => this.setAngleOffset(value),
		);
		this.createSlider(
			"Camera Smoothing",
			0.005,
			0.2,
			0.005,
			this.cameraLerpFactor,
			(value) => this.setCameraSmoothing(value),
		);

		const resetButton = document.createElement("button");
		resetButton.textContent = "Reset Camera";
		resetButton.style.marginTop = "10px";
		resetButton.style.padding = "5px 10px";
		resetButton.addEventListener("click", () => this.reset());
		this.debugContainer.appendChild(resetButton);

		const toggleContainer = document.createElement("div");
		toggleContainer.style.position = "fixed";
		toggleContainer.style.left = "20px";
		toggleContainer.style.top = "20px";
		toggleContainer.style.zIndex = "1000";

		document.body.appendChild(toggleContainer);
		document.body.appendChild(this.debugContainer);
	}

	private createSlider(
		label: string,
		min: number,
		max: number,
		step: number,
		value: number,
		onChange: (value: number) => void,
	): void {
		if (!this.debugContainer) return;

		const container = document.createElement("div");
		container.style.marginBottom = "10px";

		const labelElement = document.createElement("label");
		labelElement.textContent = `${label}: `;
		container.appendChild(labelElement);

		const valueDisplay = document.createElement("span");
		valueDisplay.textContent = value.toFixed(2);
		valueDisplay.style.marginLeft = "5px";
		container.appendChild(valueDisplay);

		const slider = document.createElement("input");
		slider.type = "range";
		slider.min = min.toString();
		slider.max = max.toString();
		slider.step = step.toString();
		slider.value = value.toString();
		slider.style.width = "100%";
		slider.style.marginTop = "5px";

		slider.addEventListener("input", (e) => {
			const newValue = Number.parseFloat((e.target as HTMLInputElement).value);
			valueDisplay.textContent = newValue.toFixed(2);
			onChange(newValue);
		});

		container.appendChild(slider);
		this.debugContainer.appendChild(container);

		// Store reference to the slider elements for later updates
		const key = label.toLowerCase().replace(/\s+/g, "");
		this.sliderElements[key] = { slider, valueDisplay };
	}

	private updateDebugUI(): void {
		// Update the slider positions and values to match the current state
		if (this.sliderElements.distance) {
			const { slider, valueDisplay } = this.sliderElements.distance;
			slider.value = this.state.distance.toString();
			valueDisplay.textContent = this.state.distance.toFixed(2);
		}

		if (this.sliderElements.height) {
			const { slider, valueDisplay } = this.sliderElements.height;
			slider.value = this.state.height.toString();
			valueDisplay.textContent = this.state.height.toFixed(2);
		}

		if (this.sliderElements.verticalframing) {
			const { slider, valueDisplay } = this.sliderElements.verticalframing;
			slider.value = this.state.verticalFraming.toString();
			valueDisplay.textContent = this.state.verticalFraming.toFixed(2);
		}

		if (this.sliderElements.angleoffset) {
			const { slider, valueDisplay } = this.sliderElements.angleoffset;
			slider.value = this.state.angleOffset.toString();
			valueDisplay.textContent = this.state.angleOffset.toFixed(2);
		}
	}

	/**
	 * Normalize an angle to be between -PI and PI
	 */
	private normalizeAngle(angle: number): number {
		let normalizedAngle = angle;

		while (normalizedAngle > Math.PI) normalizedAngle -= Math.PI * 2;
		while (normalizedAngle < -Math.PI) normalizedAngle += Math.PI * 2;

		return normalizedAngle;
	}

	/**
	 * Set the camera smoothing factor (how quickly it follows the target)
	 * Changed to private since it's only used internally by the debug UI
	 */
	private setCameraSmoothing(value: number): void {
		this.cameraLerpFactor = Math.max(0.005, Math.min(0.2, value));
		this.updateDebugUI();
	}

	public getCamera(): THREE.Camera {
		return this.camera;
	}
}
