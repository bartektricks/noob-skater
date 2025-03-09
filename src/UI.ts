export class UI {
	private controlsElement!: HTMLDivElement;
	private trickTextElement!: HTMLDivElement;
	private playerInfoElement!: HTMLDivElement;
	private exitButtonElement!: HTMLButtonElement;
	private pauseMenuElement!: HTMLDivElement; // Pause menu container
	private serverIdElement!: HTMLDivElement; // Element to display server ID
	private playerNickname = "Player";
	private trickDisplay: HTMLDivElement;
	private notificationDisplay: HTMLDivElement;
	private notificationTimeout: number | null = null;
	private connectionStatusDisplay: HTMLDivElement;
	private onExitToMenu: (() => void) | null = null; // Callback for exit button
	private onResumeGame: (() => void) | null = null; // Callback for resume button
	private isPauseMenuVisible = false; // Track pause menu visibility
	private connectedPlayersElement: HTMLDivElement | null = null;

	constructor() {
		this.createControlsInfo();
		this.createTrickText();
		this.createPlayerInfo();
		this.createPauseMenu();

		// Create trick display
		this.trickDisplay = document.createElement("div");
		this.trickDisplay.className = "fixed bottom-24 left-1/2 transform -translate-x-1/2 bg-black/70 text-white py-2 px-4 rounded text-center font-sans text-lg";
		document.body.appendChild(this.trickDisplay);

		// Create notification display
		this.notificationDisplay = document.createElement("div");
		this.notificationDisplay.className = "fixed top-5 left-1/2 transform -translate-x-1/2 bg-black/70 text-white py-2 px-5 rounded z-50 hidden";
		document.body.appendChild(this.notificationDisplay);

		// Create connection status display
		this.connectionStatusDisplay = document.createElement("div");
		this.connectionStatusDisplay.className = "connection-status disconnected fixed top-20 right-5 py-1 px-3 rounded text-white text-sm hidden";
		this.connectionStatusDisplay.textContent = "Disconnected";
		document.body.appendChild(this.connectionStatusDisplay);
	}

	private createPlayerInfo(): void {
		// Create player info container
		this.playerInfoElement = document.createElement("div");
		this.playerInfoElement.className = "fixed top-5 left-5 bg-black/70 text-white py-2 px-5 rounded font-sans";
		this.updatePlayerInfo();
		document.body.appendChild(this.playerInfoElement);
	}

	private updatePlayerInfo(): void {
		this.playerInfoElement.innerHTML = `
      <div class="font-bold">${this.playerNickname}</div>
      <div>Server: Local</div>
    `;
	}

	public setPlayerNickname(nickname: string): void {
		this.playerNickname = nickname;
		this.updatePlayerInfo();
	}

	private createControlsInfo(): void {
		// Create controls info container
		this.controlsElement = document.createElement("div");
		this.controlsElement.className = "fixed bottom-5 left-5 bg-black/70 text-white py-2 px-5 rounded font-sans";

		// Add controls information
		this.controlsElement.innerHTML = `
      <div class="mb-1 font-bold">Controls:</div>
      <div>W/S - Accelerate/Brake</div>
      <div>A/D - Turn Left/Right</div>
      <div>Spacebar - Jump</div>
      <div>J - 360 Flip (in air)</div>
      <div>K - Grind (near rails)</div>
    `;

		document.body.appendChild(this.controlsElement);
	}

	private createTrickText(): void {
		// Create trick text element
		this.trickTextElement = document.createElement("div");
		this.trickTextElement.className = "fixed top-90 left-1/2 transform -translate-x-1/2 transform -translate-y-1/2 text-white text-shadow-2xl text-2xl font-bold";
		this.trickTextElement.style.opacity = "0";
		this.trickTextElement.style.transition = "opacity 0.5s ease-out";
		this.trickTextElement.style.pointerEvents = "none"; // Don't interfere with clicks
		document.body.appendChild(this.trickTextElement);
	}

	public showTrickText(text: string): void {
		// Display the trick text
		this.trickTextElement.textContent = text;
		this.trickTextElement.style.opacity = "1";

		// Hide after a delay
		setTimeout(() => {
			this.trickTextElement.style.opacity = "0";
		}, 1000);
	}

	public update(): void {
		// Update the player info
	}

	/**
	 * Shows a notification message on screen
	 * @param message The message to display
	 * @param duration Duration in milliseconds to show the message (default: 3000ms)
	 */
	public showNotification(message: string, duration = 3000): void {
		this.notificationDisplay.textContent = message;
		this.notificationDisplay.className = "fixed top-5 left-1/2 transform -translate-x-1/2 bg-black/70 text-white py-2 px-5 rounded z-50";

		// Clear any existing timeout
		if (this.notificationTimeout !== null) {
			window.clearTimeout(this.notificationTimeout);
		}

		// Set timeout to hide notification
		this.notificationTimeout = window.setTimeout(() => {
			this.notificationDisplay.className = "fixed top-5 left-1/2 transform -translate-x-1/2 bg-black/70 text-white py-2 px-5 rounded z-50 hidden";
			this.notificationTimeout = null;
		}, duration);
	}

	// Add method to show connection status
	public showConnectionStatus(
		status: "connected" | "disconnected" | "connecting",
	): void {
		// Remove all status classes
		this.connectionStatusDisplay.classList.remove(
			"connected",
			"disconnected",
			"connecting",
		);

		// Add the current status class
		this.connectionStatusDisplay.classList.add(status);

		// Update text content
		this.connectionStatusDisplay.textContent =
			status.charAt(0).toUpperCase() + status.slice(1);

		// Show the status display
		this.connectionStatusDisplay.className = "connection-status fixed top-20 right-5 py-1 px-3 rounded text-white text-sm";
	}

	// Add method to show connected players
	public updateConnectedPlayers(
		playerCount: number,
		playerIds: string[],
	): void {
		if (!this.connectedPlayersElement) {
			this.connectedPlayersElement = document.createElement("div");
			this.connectedPlayersElement.className = "fixed top-80 right-5 bg-black/60 text-white py-2 px-5 rounded font-sans";
			this.connectedPlayersElement.style.display = "none";
			document.body.appendChild(this.connectedPlayersElement);
		}

		if (playerCount === 0) {
			this.connectedPlayersElement.style.display = "none";
			return;
		}

		this.connectedPlayersElement.style.display = "block";

		// Format the player list
		let html = `<strong>Connected Players (${playerCount}):</strong><br>`;
		if (playerIds.length > 0) {
			playerIds.forEach((id, index) => {
				// Display a shortened version of the peer ID
				const shortId = id.length > 10 ? `${id.substring(0, 10)}...` : id;
				html += `Player ${index + 1}: ${shortId}<br>`;
			});
		} else {
			html += "No players connected";
		}

		this.connectedPlayersElement.innerHTML = html;
	}

	/**
	 * Creates the pause menu that appears when ESC is pressed
	 */
	private createPauseMenu(): void {
		// Create pause menu container
		this.pauseMenuElement = document.createElement("div");
		this.pauseMenuElement.className = "fixed top-0 left-0 w-full h-full bg-black/70 flex items-center justify-center z-50 hidden";

		// Create pause menu title
		const title = document.createElement("h2");
		title.className = "text-white text-3xl mb-3 font-bold";
		title.textContent = "Game Paused";
		this.pauseMenuElement.appendChild(title);

		// Create server ID display element (initially hidden)
		this.serverIdElement = document.createElement("div");
		this.serverIdElement.className = "text-white text-sm mb-3";
		this.serverIdElement.style.display = "none";
		this.pauseMenuElement.appendChild(this.serverIdElement);

		// Create button container
		const buttonContainer = document.createElement("div");
		buttonContainer.className = "flex flex-col gap-3 w-full";

		// Create resume button
		const resumeButton = document.createElement("button");
		resumeButton.className = "bg-green-500 text-white py-2 px-4 rounded font-bold text-lg";
		resumeButton.textContent = "Resume Game";
		resumeButton.addEventListener("mouseover", () => {
			resumeButton.className = "bg-green-600";
		});
		resumeButton.addEventListener("mouseout", () => {
			resumeButton.className = "bg-green-500";
		});
		resumeButton.addEventListener("click", () => {
			this.togglePauseMenu(false);
			
			// Call the resume game callback if it exists
			if (this.onResumeGame) {
				console.log("Resuming game...");
				this.onResumeGame();
			}
		});
		buttonContainer.appendChild(resumeButton);

		// Create main menu button
		const mainMenuButton = document.createElement("button");
		mainMenuButton.className = "bg-red-500 text-white py-2 px-4 rounded font-bold text-lg";
		mainMenuButton.textContent = "Back to Main Menu";
		mainMenuButton.addEventListener("mouseover", () => {
			mainMenuButton.className = "bg-red-600";
		});
		mainMenuButton.addEventListener("mouseout", () => {
			mainMenuButton.className = "bg-red-500";
		});
		mainMenuButton.addEventListener("click", () => {
			// First toggle the pause menu to hide it
			this.togglePauseMenu(false);
			
			// Then check if we have a callback and call it
			if (this.onExitToMenu) {
				console.log("Exiting to main menu...");
				this.onExitToMenu();
			} else {
				console.error("No exit callback registered");
			}
		});
		buttonContainer.appendChild(mainMenuButton);

		this.pauseMenuElement.appendChild(buttonContainer);
		document.body.appendChild(this.pauseMenuElement);
	}

	/**
	 * Toggle the visibility of the pause menu
	 */
	public togglePauseMenu(show?: boolean): void {
		if (show !== undefined) {
			this.isPauseMenuVisible = show;
		} else {
			this.isPauseMenuVisible = !this.isPauseMenuVisible;
		}

		if (this.isPauseMenuVisible) {
			this.pauseMenuElement.className = "fixed top-0 left-0 w-full h-full bg-black/70 flex items-center justify-center z-50";
			// Hide the exit button when pause menu is visible
			if (this.exitButtonElement) {
				this.exitButtonElement.style.display = "none";
			}
		} else {
			this.pauseMenuElement.className = "fixed top-0 left-0 w-full h-full bg-black/70 flex items-center justify-center z-50 hidden";
			// Show the exit button when pause menu is hidden
			if (this.exitButtonElement) {
				this.exitButtonElement.style.display = "block";
			}
		}
	}

	/**
	 * Set the callback function for when the exit button is clicked
	 */
	public setExitToMenuCallback(callback: () => void): void {
		console.log("Exit to menu callback registered");
		this.onExitToMenu = callback;
	}

	/**
	 * Get whether the pause menu is currently visible
	 */
	public getIsPauseMenuVisible(): boolean {
		return this.isPauseMenuVisible;
	}

	/**
	 * Display the server ID in the pause menu
	 * @param serverId The server ID to display
	 * @param isTakeover Whether this server was taken over from a previous host
	 */
	public setServerIdInPauseMenu(serverId: string | null, isTakeover = false): void {
		if (serverId) {
			// Different message for takeover vs. original host
			const titleText = isTakeover 
				? "Online Server (Taken Over)"
				: "Online Server";
				
			const helpText = isTakeover
				? "You've taken over as host because the original host disconnected. Others can still join your server."
				: "Share this ID or let others find your server in the server list";
				
			this.serverIdElement.textContent = `
				<div class="font-bold mb-1">${titleText}</div>
				<div class="text-sm">ID: ${serverId}</div>
				<div class="text-xs">Players must use this ID to join your game</div>
				<div class="text-xs">${helpText}</div>
			`;
			this.serverIdElement.style.display = "block";
			
			// Add extra styling for better visibility
			if (!document.getElementById('server-info-styles')) {
				const styleElement = document.createElement('style');
				styleElement.id = 'server-info-styles';
				styleElement.textContent = `
					.font-bold {
						font-weight: bold;
						font-size: 16px;
						margin-bottom: 5px;
						color: ${isTakeover ? '#FFA500' : '#4CAF50'};
					}
					.text-sm {
						font-size: 14px;
						margin-bottom: 5px;
						font-weight: bold;
					}
					.text-xs {
						font-size: 12px;
						opacity: 0.8;
					}
				`;
				document.head.appendChild(styleElement);
			}
		} else {
			this.serverIdElement.style.display = "none";
		}
	}

	/**
	 * Set the callback function for resuming the game
	 */
	public setResumeGameCallback(callback: () => void): void {
		console.log("Resume game callback registered");
		this.onResumeGame = callback;
	}
}
