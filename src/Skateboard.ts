import * as THREE from "three";
import type { Rail } from "./Rail";
import type { UI } from "./UI";

type TrickState = {
	isDoingFlip: boolean;
	flipProgress: number;
	isGrinding: boolean;
	grindProgress: number;
	isReorienting: boolean;
	reorientStartTime: number;
	movementFlipped: boolean;
	flipStartTime: number;
};

export class Skateboard {
	public mesh: THREE.Group;
	private _speed = 0;
	private maxSpeed = 0.3;
	private acceleration = 0.01;
	private deceleration = 0.005;
	private turnSpeed = 0.03;
	private rotation = 0;
	private airMoveDirection = 0;
	private wheels: THREE.Mesh[] = [];
	private keys: { [key: string]: boolean } = {};

	// Combo system properties
	private currentCombo: string[] = [];
	private comboMultiplier = 1;
	private lastTrickTime = 0;
	private comboTimeout = 2000; // 2 seconds to continue combo after landing
	private isInCombo = false;
	private grindStartTime = 0;
	private baseGrindScore = 25;

	// Jumping physics variables
	private verticalVelocity = 0;
	private gravity = 0.015;
	private jumpForce = 0.3;
	private _isGrounded = true; // Tracks if skateboard is on the ground
	private groundLevel = 0; // Default ground level
	private canJump = true; // Prevents jump spamming
	private jumpCooldown = 300; // ms before able to jump again
	private jumpBoost = 1.0; // Multiplier for jump force based on speed

	// 360 Flip variables
	private isDoingFlip = false;
	private flipStartTime = 0;
	private flipDuration = 500; // milliseconds
	private flipProgress = 0;

	// Rail grinding variables
	private isGrinding = false;
	private currentRail: Rail | null = null; // Will be set to a Rail instance when grinding
	private grindSpeed = 0.2;
	private grindProgress = 0;
	private rails: Rail[] = []; // Store rails directly in the class
	private wantsToGrind = false; // Track if player has pressed the grind key
	private railMagnetismActive = false; // Track if rail magnetism is active
	private magnetismStrength = 1.0; // Multiplier for attraction force
	private nearestRail: Rail | null = null; // Track the nearest rail for magnetism

	// Grind transition animation
	private isTransitioningToGrind = false;
	private grindTransitionProgress = 0;
	private grindTransitionDuration = 0.15; // seconds
	private grindStartPosition: THREE.Vector3 = new THREE.Vector3();
	private grindTargetPosition: THREE.Vector3 = new THREE.Vector3();
	private grindStartRotation = 0;
	private grindTargetRotation = 0;

	// UI reference
	private ui: UI | null = null;

	// Add reorientation properties
	private isReorienting = false;
	private reorientStartTime = 0;
	private reorientDuration = 250; // milliseconds
	private reorientStartAngle = 0;
	private reorientTargetAngle = 0;
	private movementFlipped = false; // Whether controls are currently flipped

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

	// Method to set rails reference
	public setRails(rails: Rail[]): void {
		this.rails = rails;
		console.log("Skateboard received", rails.length, "rails");
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
			bevelSegments: 3,
		};

		const deckGeometry = new THREE.ExtrudeGeometry(deckShape, extrudeSettings);
		deckGeometry.scale(0.25, 0.1, 0.35);

		// Yellow deck material
		const deckMaterial = new THREE.MeshStandardMaterial({
			color: 0xf7ca18, // Bright yellow
			roughness: 0.8,
			metalness: 0.2,
		});

		const deck = new THREE.Mesh(deckGeometry, deckMaterial);

		// Position skateboard at starting position
		this.mesh.position.set(-10, this.groundLevel, 15); // Positioned near the parallel rails

		deck.rotation.y = Math.PI / 2;
		deck.position.set(-0.345, 0.3, 0);
		deck.castShadow = true;
		this.mesh.add(deck);

		// Create trucks (metal parts that hold the wheels)
		const truckGeometry = new THREE.BoxGeometry(0.3, 0.1, 0.6);
		const truckMaterial = new THREE.MeshStandardMaterial({
			color: 0x888888,
			metalness: 0.8,
			roughness: 0.2,
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
			metalness: 0.7,
		});

		const wheelPositions = [
			{ x: -0.3, y: 0.15, z: 0.7, isFront: true },
			{ x: 0.3, y: 0.15, z: 0.7, isFront: true },
			{ x: -0.3, y: 0.15, z: -0.7, isFront: false },
			{ x: 0.3, y: 0.15, z: -0.7, isFront: false },
		];

		for (const pos of wheelPositions) {
			const wheel = new THREE.Mesh(wheelGeometry, wheelMaterial);
			wheel.position.set(pos.x, pos.y, pos.z);
			wheel.rotation.z = Math.PI / 2;
			wheel.castShadow = true;
			this.mesh.add(wheel);
			this.wheels.push(wheel);
		}

		// Set up keyboard controls
		this.setupControls();
	}

	private setupControls(): void {
		document.addEventListener("keydown", (event) => {
			this.keys[event.key.toLowerCase()] = true;

			// Handle jump with spacebar
			if (event.key === " " && this._isGrounded && this.canJump) {
				this.jump();
			}

			// Handle 360 flip with J key while in air
			if (
				event.key.toLowerCase() === "j" &&
				!this._isGrounded &&
				!this.isDoingFlip
			) {
				this.start360Flip();
			}

			// Handle rail grinding with K key - just set the wantsToGrind flag
			if (
				event.key.toLowerCase() === "k" &&
				!this._isGrounded &&
				!this.isGrinding
			) {
				this.wantsToGrind = true;
				console.log("Grind key pressed - looking for rails until landing");
			}

			// Jump off rail with spacebar
			if (event.key === " " && this.isGrinding) {
				this.exitRail(true); // true = jump off
			}
		});

		document.addEventListener("keyup", (event) => {
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

		// Add to combo without showing individual trick
		const trickName = this.movementFlipped ? "Fakie Ollie" : "Ollie";
		this.addToCombo(trickName);

		// Speed boost on jump
		if (Math.abs(this._speed) > 0.05) {
			this._speed *= 1.1; // 10% speed boost on jump
		}

		// Allow jumping again after cooldown (prevents jump spamming)
		setTimeout(() => {
			this.canJump = true;
		}, this.jumpCooldown);
	}

	private start360Flip(): void {
		// Only start flip if not already doing one
		if (this.isDoingFlip) return;

		this.isDoingFlip = true;
		this.flipStartTime = Date.now();
		this.flipProgress = 0;

		// Add to combo without showing individual trick
		const trickName = this.movementFlipped ? "Fakie 360 Flip" : "360 Flip";
		this.addToCombo(trickName);
	}

	private addToCombo(trickName: string): void {
		const now = Date.now();

		// If we're on the ground and haven't done a trick for 2 seconds, reset combo
		if (this._isGrounded && now - this.lastTrickTime > this.comboTimeout) {
			this.currentCombo = [];
			this.comboMultiplier = 1;
			this.isInCombo = false;
		}

		// Add trick to combo
		this.currentCombo.push(trickName);
		this.lastTrickTime = now;
		this.isInCombo = true;

		// Update combo multiplier based on number of tricks
		this.comboMultiplier = 1 + (this.currentCombo.length - 1) * 0.5;

		// Calculate total score
		const baseScore = 100; // Base score per trick
		const totalScore = Math.floor(
			baseScore * this.currentCombo.length * this.comboMultiplier,
		);

		// Show combo text with score
		if (this.ui) {
			const comboText = this.currentCombo.join(" + ");
			this.ui.showTrickText(
				`${comboText} (${this.comboMultiplier.toFixed(1)}x)`,
				totalScore,
				false,
			);
		}
	}

	private update360Flip(): void {
		if (!this.isDoingFlip) return;

		const currentTime = Date.now();
		const elapsedTime = currentTime - this.flipStartTime;

		// Calculate progress (0 to 1)
		this.flipProgress = Math.min(elapsedTime / this.flipDuration, 1);

		// Apply 360-degree rotation around z-axis
		this.mesh.rotation.z = Math.PI * 2 * this.flipProgress;

		// Check if flip is complete
		if (this.flipProgress >= 1) {
			this.isDoingFlip = false;
			this.mesh.rotation.z = 0; // Reset z rotation
		}
	}

	public update(delta: number): void {
		// If grinding, update grinding movement and skip normal movement
		if (this.isGrinding) {
			this.updateGrinding(delta);
			return;
		}

		// Apply rail magnetism if active
		if (
			this.railMagnetismActive &&
			this.nearestRail &&
			this.wantsToGrind &&
			!this._isGrounded
		) {
			const attractionForce = this.nearestRail.calculateAttractionForce(
				this.mesh.position,
			);

			// Apply the force, scaled by delta time and magnetism strength
			this.mesh.position.x +=
				attractionForce.x * delta * 60 * this.magnetismStrength;
			this.mesh.position.y +=
				attractionForce.y * delta * 60 * this.magnetismStrength;
			this.mesh.position.z +=
				attractionForce.z * delta * 60 * this.magnetismStrength;

			// Also slightly adjust vertical velocity for a more controllable approach
			this.verticalVelocity += attractionForce.y * 0.8;
		}

		// Handle acceleration and deceleration with flipped controls if needed
		if (
			(this.keys.w && !this.movementFlipped) ||
			(this.keys.s && this.movementFlipped)
		) {
			this._speed = Math.min(this._speed + this.acceleration, this.maxSpeed);
		} else if (
			(this.keys.s && !this.movementFlipped) ||
			(this.keys.w && this.movementFlipped)
		) {
			this._speed = Math.max(this._speed - this.acceleration, -this.maxSpeed);
		} else {
			// Apply deceleration when no keys are pressed
			if (this._speed > 0) {
				this._speed = Math.max(0, this._speed - this.deceleration);
			} else if (this._speed < 0) {
				this._speed = Math.min(0, this._speed + this.deceleration);
			}
		}

		// Handle steering - only allow turning if the skateboard is on the ground and moving
		if (this._isGrounded && Math.abs(this._speed) > 0.01) {
			// Small threshold to prevent turning when almost stopped
			// Adjust steering based on whether controls are flipped
			const steeringFactor = this.movementFlipped ? -1 : 1;

			if (this.keys.a) {
				this.rotation +=
					this.turnSpeed * (this._speed > 0 ? 1 : -1) * steeringFactor;
			}
			if (this.keys.d) {
				this.rotation -=
					this.turnSpeed * (this._speed > 0 ? 1 : -1) * steeringFactor;
			}
		}

		// Allow rotation in air with A and D keys, but don't affect movement direction
		if (!this._isGrounded) {
			if (this.keys.a) {
				// Rotate board around Y axis (faster rotation in air for trick effect)
				this.rotation += this.turnSpeed * 1.5;
			}
			if (this.keys.d) {
				// Rotate board around Y axis (faster rotation in air for trick effect)
				this.rotation -= this.turnSpeed * 1.5;
			}
		}

		// Update 360 flip if in progress
		if (this.isDoingFlip) {
			this.update360Flip();
		}

		// Update reorientation if active
		if (this.isReorienting) {
			this.updateReorientation();
		} else {
			// Apply rotation to the mesh (only if not reorienting)
			this.mesh.rotation.y = this.rotation;
		}

		// Calculate movement with improved physics
		let moveX: number;
		let moveZ: number;

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

		// If player wants to grind and is in the air, check for rails
		if (this.wantsToGrind && !this._isGrounded && !this.isGrinding) {
			this.checkForRailsToGrind();
		}

		// Check for ground collision
		if (this.mesh.position.y <= this.groundLevel) {
			this.mesh.position.y = this.groundLevel;

			// Reset the wantsToGrind flag when landing
			if (this.wantsToGrind) {
				console.log("Landing without grinding - resetting grind state");
				this.wantsToGrind = false;
			}

			// Check if landing during an incomplete 360 flip - fail the trick
			if (this.isDoingFlip && this.flipProgress < 0.9) {
				// Show bail message
				if (this.ui) {
					this.ui.showTrickText("Bail!", 0, true);
				}

				// Reset combo and update high score
				const baseScore = 100; // Base score per trick
				const totalScore = Math.floor(
					baseScore * this.currentCombo.length * this.comboMultiplier,
				);
				if (this.ui) {
					this.ui.updateHighScore(totalScore);
				}
				this.currentCombo = [];
				this.comboMultiplier = 1;
				this.isInCombo = false;

				// Reduce speed significantly due to bail
				this._speed *= 0.3;
			}
			// Check if landing during a nearly complete 360 flip - count it as landed
			else if (this.isDoingFlip && this.flipProgress >= 0.9) {
				// Show landed message
				if (this.ui) {
					const trickName = this.movementFlipped
						? "Fakie 360 Flip Landed!"
						: "360 Flip Landed!";
					this.ui.showTrickText(trickName);
					this.addToCombo(trickName);
				}
			}

			// Reset flip state when landing
			if (this.isDoingFlip) {
				this.isDoingFlip = false;
				this.mesh.rotation.z = 0; // Reset z rotation
			}

			// Add landing effect - reduce speed slightly on landing from height
			if (!this._isGrounded && this.verticalVelocity < -0.1) {
				// Harder landings have more impact on speed
				const landingImpact = Math.min(
					Math.abs(this.verticalVelocity) * 0.5,
					0.4,
				);
				this._speed *= 1 - landingImpact;

				// Start reorientation when landing
				this.startReorientation();
			}

			this.verticalVelocity = 0;
			this._isGrounded = true;

			// Reset air movement direction ONLY if we're not going through reorientation
			// This prevents the brief forwards/backwards flicker when landing after turning
			if (!this.isReorienting) {
				this.airMoveDirection = this.rotation;
			}
		}

		// Check if combo should end (2 seconds on ground without tricks)
		if (this._isGrounded && this.isInCombo) {
			const now = Date.now();
			if (now - this.lastTrickTime > this.comboTimeout) {
				// End combo
				const baseScore = 100; // Base score per trick
				const totalScore = Math.floor(
					baseScore * this.currentCombo.length * this.comboMultiplier,
				);
				if (this.ui) {
					this.ui.updateHighScore(totalScore);
				}
				this.currentCombo = [];
				this.comboMultiplier = 1;
				this.isInCombo = false;
				if (this.ui) {
					this.ui.showTrickText("Combo Ended!", totalScore, true);
				}
			}
		}

		// Apply skateboard tilt based on vertical movement and direction
		if (!this._isGrounded) {
			// Tilt the skateboard based on vertical velocity
			const tiltAmount = Math.min(
				Math.max(this.verticalVelocity * 0.5, -0.3),
				0.3,
			);

			// Apply forward tilt when jumping and backward tilt when falling
			this.mesh.rotation.x = -tiltAmount;

			// Add a slight roll effect during jumps for style, but only if not doing a 360 flip
			if (!this.isDoingFlip) {
				const rollFactor = Math.sin(Date.now() * 0.003) * 0.05;
				this.mesh.rotation.z = rollFactor;
			}
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
		const rotationDiff = this.normalizeAngle(
			this.rotation - this.airMoveDirection,
		);
		const absDiff = Math.abs(rotationDiff);

		// If already aligned, do nothing
		if (absDiff < 0.1) return;

		this.isReorienting = true;
		this.reorientStartTime = Date.now();
		this.reorientStartAngle = this.rotation;

		// Check if we've done approximately a 180-degree turn (between 135 and 225 degrees)
		// Slightly increased threshold to catch more near-180 cases
		const isApprox180 = absDiff > Math.PI * 0.7 && absDiff < Math.PI * 1.3;

		// Store old movement speed direction to prevent flicker during transition
		const oldSpeedSign = Math.sign(this._speed);

		if (isApprox180) {
			// We've done a 180-degree turn, so flip the controls
			const oppositeDirection = this.normalizeAngle(
				this.airMoveDirection + Math.PI,
			);
			this.reorientTargetAngle = oppositeDirection;
			this.movementFlipped = !this.movementFlipped; // Toggle flip state

			// Ensure speed direction is consistent with the stance change
			// This prevents the momentary backwards movement when landing
			if (Math.abs(this._speed) > 0.01) {
				this._speed = -oldSpeedSign * Math.abs(this._speed);
			}
		} else {
			// For non-180 rotations, we need to maintain current stance but adjust orientation
			// based on the current difference relative to our skating stance
			if (this.movementFlipped) {
				// In fakie stance: we need to maintain the fakie orientation
				// We should measure the rotation deviation from the fakie direction (airMoveDirection + Math.PI)
				const fakieDirection = this.normalizeAngle(
					this.airMoveDirection + Math.PI,
				);

				// Calculate how far we rotated away from our fakie direction
				const fakieRotationDiff = this.normalizeAngle(
					this.rotation - fakieDirection,
				);

				// Add this small deviation to the fakie direction to maintain relative orientation
				this.reorientTargetAngle = this.normalizeAngle(
					fakieDirection + fakieRotationDiff,
				);
			} else {
				// In regular stance: align with movement direction
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
		const easedProgress = 1 - (1 - progress) ** 2;

		// Interpolate rotation
		this.rotation = this.interpolateAngle(
			this.reorientStartAngle,
			this.reorientTargetAngle,
			easedProgress,
		);

		// Apply rotation to mesh
		this.mesh.rotation.y = this.rotation;

		// End reorientation when complete
		if (progress >= 1.0) {
			this.isReorienting = false;
			// Update movement direction to match new rotation
			this.airMoveDirection = this.rotation;

			// If on the ground, ensure the movement direction is fully synchronized
			if (this._isGrounded) {
				// For consistency, align both directions to ensure smooth control transitions
				this.airMoveDirection = this.rotation;
			}
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
	 * Interpolate between angles with proper handling of angle wrapping
	 */
	private interpolateAngle(
		startAngle: number,
		endAngle: number,
		progress: number,
	): number {
		// Normalize angles to be between -PI and PI
		const normalizedStartAngle = this.normalizeAngle(startAngle);
		const normalizedEndAngle = this.normalizeAngle(endAngle);

		// Calculate delta, considering the shortest path around the circle
		let delta = normalizedEndAngle - normalizedStartAngle;

		// Make sure we take the shortest path around the circle
		if (delta > Math.PI) {
			delta -= Math.PI * 2;
		} else if (delta < -Math.PI) {
			delta += Math.PI * 2;
		}

		// Interpolate using the shortest path
		return normalizedStartAngle + delta * progress;
	}

	// Add a method to get the movement direction (useful for camera)
	public getMovementDirection(): number {
		return this._isGrounded ? this.rotation : this.airMoveDirection;
	}

	// Get the current stance (regular or fakie)
	public getStance(): string {
		return this.movementFlipped ? "fakie" : "regular";
	}

	// New method to check for rails while in the air
	private checkForRailsToGrind(): void {
		// Skip if already grinding
		if (this.isGrinding) return;

		// Look for a rail near the skateboard
		console.log(
			"Checking for rails while in air... Position:",
			this.mesh.position,
		);

		// Find the closest rail and its distance
		let closestRail: Rail | null = null;
		let closestHorizontalDistance = Number.POSITIVE_INFINITY;
		let closestVerticalDistance = Number.POSITIVE_INFINITY;

		for (const rail of this.rails) {
			const closestPoint = rail.getClosestPointOnRail(this.mesh.position);

			// Calculate horizontal distance (X and Z only)
			const horizontalDistance = Math.sqrt(
				(this.mesh.position.x - closestPoint.x) ** 2 +
					(this.mesh.position.z - closestPoint.z) ** 2,
			);

			// Calculate vertical distance (Y only)
			const verticalDistance = Math.abs(this.mesh.position.y - closestPoint.y);

			// Check if this is the closest rail so far
			if (
				horizontalDistance < closestHorizontalDistance &&
				verticalDistance < 5.0
			) {
				closestRail = rail;
				closestHorizontalDistance = horizontalDistance;
				closestVerticalDistance = verticalDistance;
			}
		}

		// Store the nearest rail for magnetism
		this.nearestRail = closestRail;

		// Check if we're close enough to start grinding
		const horizontalThreshold = 1.5;
		const verticalThreshold = 3.5;

		if (
			closestRail &&
			closestHorizontalDistance < horizontalThreshold &&
			closestVerticalDistance < verticalThreshold
		) {
			console.log("Rail found nearby! Starting grind...");
			this.startGrinding(closestRail);
			// Reset the wants to grind flag since we've started grinding
			this.wantsToGrind = false;
			this.railMagnetismActive = false;
			return;
		}

		// If not close enough to grind but within attraction field, enable magnetism
		const magnetismRange = 4.0;
		if (closestRail && closestHorizontalDistance < magnetismRange) {
			this.railMagnetismActive = true;

			// Adjust magnetism strength based on speed - faster approach = stronger pull
			const speedFactor = Math.min(Math.abs(this._speed) * 2, 1.5);
			this.magnetismStrength = 1.0 * speedFactor;
		} else {
			this.railMagnetismActive = false;
		}
	}

	// Start grinding on a specific rail
	private startGrinding(rail: Rail): void {
		// Store initial position and target position for smooth transition
		this.grindStartPosition = this.mesh.position.clone();

		// Get closest point on the rail
		const railPoint = rail.getClosestPointOnRail(this.mesh.position);
		this.grindTargetPosition = railPoint.clone();
		this.grindTargetPosition.y += 0.1; // Slightly above rail for visual effect

		// Calculate the actual progress along the rail where we made contact
		const initialProgress = rail.getProgressAlongRail(this.mesh.position);

		// Get the rail direction
		const railDirection = rail.getDirection();

		// Calculate target rotation to align with rail
		const targetRotation = Math.atan2(railDirection.x, railDirection.z);

		// Store initial and target rotations for smooth transition
		this.grindStartRotation = this.mesh.rotation.y;

		// Determine grinding direction based on player's approach
		// Create a direction vector representing player's current movement
		const playerDirection = new THREE.Vector3(
			Math.sin(this.airMoveDirection),
			0,
			Math.cos(this.airMoveDirection),
		);

		// Check if player is moving in same direction as rail or opposite
		let dotProduct = playerDirection.dot(railDirection);

		// Adjust dot product when in fakie position - the expected direction is reversed
		if (this.movementFlipped) {
			// When in fakie, reverse the expected direction
			dotProduct *= -1;
		}

		// If dot product is negative, player is approaching opposite to rail direction
		// So we need to reverse the grind direction
		const grindDirectionMultiplier = dotProduct < 0 ? -1 : 1;

		// Set target rotation based on grind direction and fakie state
		if (this.movementFlipped) {
			// In fakie, we want to maintain the fakie orientation
			// If grinding forward relative to fakie direction
			if (grindDirectionMultiplier > 0) {
				this.grindTargetRotation = targetRotation + Math.PI; // Keep board rotated 180°
			} else {
				this.grindTargetRotation = targetRotation; // Standard alignment
			}
		} else {
			// Regular stance
			if (grindDirectionMultiplier < 0) {
				this.grindTargetRotation = targetRotation + Math.PI; // Reverse direction
			} else {
				this.grindTargetRotation = targetRotation; // Forward direction
			}
		}

		// Match grinding speed with the skateboard's speed before jumping
		// Use the absolute value of the current speed to determine the grinding speed magnitude
		const speedMagnitude = Math.abs(this._speed);
		// Apply a minimum and maximum cap to the grinding speed for better control
		const minGrindSpeed = 0.1;
		const maxGrindSpeed = 0.4;
		const baseGrindSpeed = Math.max(
			minGrindSpeed,
			Math.min(maxGrindSpeed, speedMagnitude),
		);

		// Apply grind speed with the correct direction based on approach angle
		this.grindSpeed = baseGrindSpeed * grindDirectionMultiplier;

		console.log(
			`Setting grind speed to ${this.grindSpeed} based on previous speed ${this._speed}`,
		);

		// Set initial grind progress based on where we actually hit the rail
		this.grindProgress = initialProgress;

		// Start transition animation
		this.isTransitioningToGrind = true;
		this.grindTransitionProgress = 0;

		// Set grinding state
		this.isGrinding = true;
		this.currentRail = rail;

		// Reset vertical velocity during transition
		this.verticalVelocity = 0;

		// Start grind timer
		this.grindStartTime = Date.now();

		// Add to combo without showing individual trick
		const grindName = this.movementFlipped
			? "Fakie 50-50 Grind!"
			: "50-50 Grind!";
		this.addToCombo(grindName);
	}

	// Update grinding position along the rail
	private updateGrinding(delta: number): void {
		if (!this.currentRail) return;

		// Update grind score based on time
		const grindDuration = (Date.now() - this.grindStartTime) / 1000; // in seconds
		const grindScore = Math.floor(
			this.baseGrindScore * grindDuration * this.comboMultiplier,
		);

		// Calculate total score including grind
		const baseScore = 100; // Base score per trick
		const totalScore = Math.floor(
			(baseScore * this.currentCombo.length + grindScore) *
				this.comboMultiplier,
		);

		// Show combo text with updated score
		if (this.ui) {
			const comboText = this.currentCombo.join(" + ");
			this.ui.showTrickText(
				`${comboText} (${this.comboMultiplier.toFixed(1)}x)`,
				totalScore,
				false,
			);
		}

		// Handle grind transition animation
		if (this.isTransitioningToGrind) {
			// Update transition progress
			this.grindTransitionProgress += delta / this.grindTransitionDuration;

			if (this.grindTransitionProgress >= 1.0) {
				// Transition complete
				this.isTransitioningToGrind = false;
				this.grindTransitionProgress = 1.0;

				// Finalize position and rotation
				this.mesh.position.copy(this.grindTargetPosition);
				this.mesh.rotation.y = this.grindTargetRotation;
				this.rotation = this.grindTargetRotation;
			} else {
				// Smooth transition using easing function
				const t = this.smoothEaseInOut(this.grindTransitionProgress);

				// Interpolate position
				this.mesh.position.lerpVectors(
					this.grindStartPosition,
					this.grindTargetPosition,
					t,
				);

				// When in fakie, we want to minimize rotation changes to prevent visual spinning
				if (this.movementFlipped) {
					// For fakie grinds, use a special interpolation that minimizes rotation
					// Only adjust rotation if absolutely necessary and do it quickly
					const rotationDiff = this.normalizeAngle(
						this.grindTargetRotation - this.grindStartRotation,
					);

					// If the rotation difference is small, just interpolate normally
					if (Math.abs(rotationDiff) < Math.PI / 4) {
						// Small angle adjustment
						this.mesh.rotation.y = this.interpolateAngle(
							this.grindStartRotation,
							this.grindTargetRotation,
							t,
						);
					} else {
						// Use a fast threshold transition - stay at original rotation until 80% through the transition
						// then quickly snap to final rotation
						if (t > 0.8) {
							const adjustedT = (t - 0.8) * 5; // Rescale t from 0.8-1.0 to 0.0-1.0
							this.mesh.rotation.y = this.interpolateAngle(
								this.grindStartRotation,
								this.grindTargetRotation,
								this.smoothEaseInOut(adjustedT),
							);
						} else {
							// Keep original rotation for most of the transition
							this.mesh.rotation.y = this.grindStartRotation;
						}
					}
				} else {
					// Regular grinds use the standard rotation interpolation
					this.mesh.rotation.y = this.interpolateAngle(
						this.grindStartRotation,
						this.grindTargetRotation,
						t,
					);
				}

				this.rotation = this.mesh.rotation.y;

				// Add a slight pop/bounce effect during transition
				const bounceHeight = 0.1 * Math.sin(t * Math.PI);
				this.mesh.position.y += bounceHeight;

				// Reset other rotations during transition
				this.mesh.rotation.x = 0;
				this.mesh.rotation.z = 0;

				// Return early - don't update grind progress during transition
				return;
			}
		}

		// Regular grinding update (after transition is complete)
		// Update grind progress - the direction is already encoded in grindSpeed's sign
		this.grindProgress += this.grindSpeed * delta;

		// Check if we've reached the end of the rail
		if (this.grindProgress <= 0 || this.grindProgress >= 1) {
			this.exitRail(false);
			return;
		}

		// Calculate position along the rail based on rail start/end positions
		const newPos = new THREE.Vector3();
		newPos.lerpVectors(
			this.currentRail.startPosition,
			this.currentRail.endPosition,
			this.grindProgress,
		);

		// Add subtle oscillation for a more dynamic grinding effect
		const oscillationAmount = 0.02;
		const oscillationFrequency = 8.0;
		const oscillationY =
			Math.sin((Date.now() / 1000) * oscillationFrequency) * oscillationAmount;

		// Update skateboard position
		this.mesh.position.set(newPos.x, newPos.y + oscillationY, newPos.z);

		// Add subtle skateboard roll while grinding for style
		const rollAmount = 0.1;
		const rollFrequency = 5.0;
		this.mesh.rotation.z =
			Math.sin((Date.now() / 1000) * rollFrequency) * rollAmount;
	}

	// Exit the rail (either by reaching the end or jumping off)
	private exitRail(isJumping: boolean): void {
		// Apply velocity in the direction we were grinding
		// Match exit velocity with the current grinding speed for consistency
		const exitVelocity = Math.abs(this.grindSpeed);

		// Calculate exit speed based on our grind direction
		const exitSpeed = Math.sign(this.grindSpeed) * exitVelocity;

		// Set speed in the direction of rail exit
		this._speed = exitSpeed;

		// Calculate jump direction based on turning input
		let jumpDirection = this.rotation;

		// Apply angled jumping based on turning input (A/D keys)
		const turnAngle = Math.PI / 4; // 45 degrees in radians

		if (isJumping) {
			// Check if turning keys are pressed to modify jump angle
			if (this.keys.a) {
				// Turn 45 degrees to the left
				jumpDirection += turnAngle;
				console.log("Jumping left at 45 degrees");
			} else if (this.keys.d) {
				// Turn 45 degrees to the right
				jumpDirection -= turnAngle;
				console.log("Jumping right at 45 degrees");
			}
		}

		// Get the direction for the jump based on turning
		const facingDirection = new THREE.Vector3(
			Math.sin(jumpDirection),
			0,
			Math.cos(jumpDirection),
		);

		// Apply upward velocity if jumping off
		if (isJumping) {
			// Stronger vertical velocity when jumping off manually
			// Now 2x higher than the original value (0.8 * 2 = 1.6)
			this.verticalVelocity = this.jumpForce * 1.2; // 2x higher for dramatic air

			// Apply an immediate forward impulse to create momentum in the jump
			// This creates a forward arc that carries the board's grinding momentum
			const jumpImpulse = Math.abs(this.grindSpeed) * 2; // Scale impulse with grinding speed

			// Add an immediate position change in the direction of movement
			// This creates the effect of jumping forward off the rail
			this.mesh.position.x += facingDirection.x * jumpImpulse;
			this.mesh.position.z += facingDirection.z * jumpImpulse;

			// When turning during jump, also rotate the board slightly in that direction
			if (this.keys.a) {
				this.rotation += turnAngle * 0.5; // Partial rotation to match jump direction
			} else if (this.keys.d) {
				this.rotation -= turnAngle * 0.5; // Partial rotation to match jump direction
			}

			console.log(
				`Applied jump impulse: ${jumpImpulse} at angle: ${jumpDirection}`,
			);
		} else {
			// Small hop when coming off the rail edge
			// Also 2x higher than original (0.3 * 2 = 0.6)
			this.verticalVelocity = this.jumpForce * 0.6; // 2x higher auto hop

			// Still apply a small forward impulse when reaching rail end
			const endImpulse = Math.abs(this.grindSpeed) * 0.8;
			this.mesh.position.x += facingDirection.x * endImpulse;
			this.mesh.position.z += facingDirection.z * endImpulse;
		}

		// Reset grinding state
		this.isGrinding = false;
		this.currentRail = null;

		// Show trick text if jumping off rail
		if (isJumping && this.ui) {
			const baseScore = 100; // Base score per trick
			const totalScore = Math.floor(
				baseScore * this.currentCombo.length * this.comboMultiplier,
			);
			this.ui.showTrickText("Rail Jump!", totalScore, false);
			this.addToCombo("Rail Jump");
		}

		// Set air movement direction to our current rotation
		this.airMoveDirection = this.rotation;

		// We're now in the air
		this._isGrounded = false;
	}

	// Smooth ease-in-out function for transitions
	private smoothEaseInOut(t: number): number {
		// Cubic ease-in-out function: smoother than linear interpolation
		return t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
	}

	// Add this method to the Skateboard class
	public applyForce(
		direction: "forward" | "backward" | "left" | "right",
	): void {
		const force = 0.1; // Adjust force as needed

		switch (direction) {
			case "forward":
				// Apply forward force in the direction the skateboard is facing
				this.mesh.position.x += Math.sin(this.rotation) * force;
				this.mesh.position.z += Math.cos(this.rotation) * force;
				break;
			case "backward":
				// Apply backward force
				this.mesh.position.x -= Math.sin(this.rotation) * force;
				this.mesh.position.z -= Math.cos(this.rotation) * force;
				break;
			case "left":
				// Turn left
				this.rotation += 0.1;
				this.mesh.rotation.y = this.rotation;
				break;
			case "right":
				// Turn right
				this.rotation -= 0.1;
				this.mesh.rotation.y = this.rotation;
				break;
		}
	}

	// Add a public getter for wheels
	public getWheels(): THREE.Mesh[] {
		return this.wheels;
	}

	// Add method to get current trick state for network transmission
	public getTrickState(): TrickState {
		return {
			isDoingFlip: this.isDoingFlip,
			flipStartTime: this.isDoingFlip ? this.flipStartTime : 0,
			flipProgress: this.isDoingFlip ? this.flipProgress : 0,

			isGrinding: this.isGrinding,
			grindProgress: this.isGrinding ? this.grindProgress : 0,

			isReorienting: this.isReorienting,
			reorientStartTime: this.isReorienting ? this.reorientStartTime : 0,
			movementFlipped: this.movementFlipped,
		};
	}

	// Add method to set trick state from network data
	public setTrickState(state: TrickState): void {
		// Handle flip state with direct control to ensure visual sync
		const wasFlipping = this.isDoingFlip;
		this.isDoingFlip = state.isDoingFlip || false;

		if (this.isDoingFlip) {
			if (!wasFlipping) {
				// Starting a new flip
				this.flipStartTime = Date.now();
				this.flipProgress = 0;

				// Trigger display of trick text
				if (this.ui) {
					if (this.movementFlipped) {
						this.ui.showTrickText("Fakie 360 Flip");
					} else {
						this.ui.showTrickText("360 Flip");
					}
				}
			} else if (state.flipProgress !== undefined) {
				// Continuing a flip - update progress directly for better visual sync
				this.flipProgress = state.flipProgress;
				this.mesh.rotation.z = Math.PI * 2 * this.flipProgress;
			}
		} else if (wasFlipping) {
			// Just finished a flip
			this.flipProgress = 1.0;
			this.isDoingFlip = false;
			this.mesh.rotation.z = 0; // Reset z rotation
		}

		// Handle grinding state with proper rail exit
		const wasGrinding = this.isGrinding;
		this.isGrinding = state.isGrinding || false;

		if (this.isGrinding) {
			// Starting or continuing to grind
			if (!wasGrinding) {
				// Find nearest rail if we need one
				if (!this.currentRail && this.rails.length > 0) {
					let nearestRail = this.rails[0];
					let nearestDistance = Number.POSITIVE_INFINITY;

					for (const rail of this.rails) {
						const distance = this.mesh.position.distanceTo(rail.mesh.position);
						if (distance < nearestDistance) {
							nearestDistance = distance;
							nearestRail = rail;
						}
					}

					this.currentRail = nearestRail;
				}
			}

			// Update grind progress
			if (typeof state.grindProgress === "number") {
				this.grindProgress = state.grindProgress;
			}
		} else if (wasGrinding) {
			// Just stopped grinding - simulate rail exit
			this.exitRail(true); // Exit with a jump
		}

		// Handle reorientation
		this.isReorienting = state.isReorienting || false;
		if (this.isReorienting && !this.reorientStartTime) {
			this.reorientStartTime = Date.now();
		} else if (!this.isReorienting) {
			this.reorientStartTime = 0;
		}

		// Sync movement direction
		this.movementFlipped = state.movementFlipped || false;
	}
}
