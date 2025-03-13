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
		this.trickDisplay.className = "fixed bottom-28 left-1/2 transform -translate-x-1/2 bg-black/80 text-white py-3 px-8 rounded-lg text-center font-bold text-xl backdrop-blur-sm border border-gray-700 shadow-lg";
		document.body.appendChild(this.trickDisplay);

		// Create notification display
		this.notificationDisplay = document.createElement("div");
		this.notificationDisplay.className = "fixed top-20 left-1/2 transform -translate-x-1/2 bg-black/80 text-white py-3 px-8 rounded-lg shadow-lg backdrop-blur-sm border border-gray-700 z-50 hidden";
		document.body.appendChild(this.notificationDisplay);

		// Create connection status display
		this.connectionStatusDisplay = document.createElement("div");
		this.connectionStatusDisplay.className = "fixed top-5 right-5 py-2 px-4 rounded-lg flex items-center gap-2 text-white text-sm font-medium hidden shadow-lg border border-gray-700";
		this.connectionStatusDisplay.innerHTML = `
			<span class="h-2 w-2 rounded-full bg-red-500"></span>
			Disconnected
		`;
		document.body.appendChild(this.connectionStatusDisplay);
	}

	private createPlayerInfo(): void {
		// Create player info container
		this.playerInfoElement = document.createElement("div");
		this.playerInfoElement.className = "fixed top-5 left-5 bg-black/80 text-white py-3 px-6 rounded-lg shadow-lg backdrop-blur-sm border border-gray-700";
		this.updatePlayerInfo();
		document.body.appendChild(this.playerInfoElement);
	}

	private updatePlayerInfo(): void {
		this.playerInfoElement.innerHTML = `
			<div class="font-bold text-lg mb-1">${this.playerNickname}</div>
			<div class="text-gray-300 text-sm flex items-center gap-2">
				<span class="w-2 h-2 rounded-full bg-green-400"></span>
				Server: Local
			</div>
		`;
	}

	public setPlayerNickname(nickname: string): void {
		this.playerNickname = nickname;
		this.updatePlayerInfo();
	}

	private createControlsInfo(): void {
		// Create controls info container
		this.controlsElement = document.createElement("div");
		this.controlsElement.className = "fixed bottom-5 left-5 bg-black/80 text-white py-4 px-6 rounded-lg shadow-lg backdrop-blur-sm border border-gray-700";

		// Add controls information
		this.controlsElement.innerHTML = `
			<div class="mb-3 font-bold text-red-400 text-lg">Controls</div>
			<div class="grid grid-cols-2 gap-x-6 gap-y-2 text-gray-200">
				<div class="flex items-center">
					<span class="bg-gray-700 rounded px-2 py-0.5 mr-2 text-xs font-mono">W/S</span>
					<span>Accelerate/Brake</span>
				</div>
				<div class="flex items-center">
					<span class="bg-gray-700 rounded px-2 py-0.5 mr-2 text-xs font-mono">A/D</span>
					<span>Turn Left/Right</span>
				</div>
				<div class="flex items-center">
					<span class="bg-gray-700 rounded px-2 py-0.5 mr-2 text-xs font-mono">Space</span>
					<span>Jump</span>
				</div>
				<div class="flex items-center">
					<span class="bg-gray-700 rounded px-2 py-0.5 mr-2 text-xs font-mono">J</span>
					<span>360 Flip (in air)</span>
				</div>
				<div class="flex items-center">
					<span class="bg-gray-700 rounded px-2 py-0.5 mr-2 text-xs font-mono">K</span>
					<span>Grind (near rails)</span>
				</div>
			</div>
		`;

		document.body.appendChild(this.controlsElement);
	}

	private createTrickText(): void {
		// Create trick text element
		this.trickTextElement = document.createElement("div");
		this.trickTextElement.className = "fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-white text-5xl font-bold";
		this.trickTextElement.style.opacity = "0";
		this.trickTextElement.style.transition = "all 0.5s ease-out";
		this.trickTextElement.style.textShadow = "0 0 10px rgba(0, 0, 0, 0.8), 0 0 20px rgba(0, 0, 0, 0.6)";
		this.trickTextElement.style.pointerEvents = "none"; // Don't interfere with clicks
		document.body.appendChild(this.trickTextElement);
	}

	public showTrickText(text: string): void {
		// Display the trick text
		this.trickTextElement.textContent = text;
		this.trickTextElement.style.opacity = "1";
		this.trickTextElement.style.transform = "translate(-50%, -50%) scale(1.2)";

		// Hide after a delay
		setTimeout(() => {
			this.trickTextElement.style.opacity = "0";
			this.trickTextElement.style.transform = "translate(-50%, -50%) scale(1)";
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
		// Clear any existing notification timeout
		if (this.notificationTimeout !== null) {
			clearTimeout(this.notificationTimeout);
		}

		// Update and show notification
		this.notificationDisplay.textContent = message;
		this.notificationDisplay.classList.remove("hidden");
		this.notificationDisplay.classList.add("animate-fadeIn");

		// Hide after duration
		this.notificationTimeout = window.setTimeout(() => {
			this.notificationDisplay.classList.add("animate-fadeOut");
			setTimeout(() => {
				this.notificationDisplay.classList.add("hidden");
				this.notificationDisplay.classList.remove("animate-fadeIn", "animate-fadeOut");
			}, 500);
			this.notificationTimeout = null;
		}, duration);
	}

	// Add method to show connection status
	public showConnectionStatus(
		status: "connected" | "disconnected" | "connecting",
	): void {
		// Update status display
		if (status === "connected") {
			this.connectionStatusDisplay.className = "fixed top-5 right-5 py-2 px-4 rounded-lg flex items-center gap-2 text-white text-sm font-medium bg-black/80 border border-gray-700 shadow-lg backdrop-blur-sm";
			this.connectionStatusDisplay.innerHTML = `
				<span class="h-2 w-2 rounded-full bg-green-500"></span>
				Connected
			`;
		} else if (status === "disconnected") {
			this.connectionStatusDisplay.className = "fixed top-5 right-5 py-2 px-4 rounded-lg flex items-center gap-2 text-white text-sm font-medium bg-black/80 border border-gray-700 shadow-lg backdrop-blur-sm";
			this.connectionStatusDisplay.innerHTML = `
				<span class="h-2 w-2 rounded-full bg-red-500"></span>
				Disconnected
			`;
		} else {
			this.connectionStatusDisplay.className = "fixed top-5 right-5 py-2 px-4 rounded-lg flex items-center gap-2 text-white text-sm font-medium bg-black/80 border border-gray-700 shadow-lg backdrop-blur-sm";
			this.connectionStatusDisplay.innerHTML = `
				<span class="h-2 w-2 rounded-full bg-yellow-500 animate-pulse"></span>
				Connecting...
			`;
		}

		// Show the status display
		this.connectionStatusDisplay.classList.remove("hidden");
	}

	// Add method to show connected players
	public updateConnectedPlayers(
		playerCount: number,
		playerIds: string[],
	): void {
		if (!this.connectedPlayersElement) return;
		
		if (playerCount > 1) {
			// Show connected players info when in multiplayer
			this.connectedPlayersElement.classList.remove("hidden");
			
			// Create the connected players content
			this.connectedPlayersElement.innerHTML = `
				<div class="text-gray-300 font-bold mb-3">Connected Players (${playerCount})</div>
				<div class="flex flex-wrap justify-center gap-3">
					${playerIds.map(id => `
						<div class="py-2 px-4 bg-gray-900/70 rounded-full text-sm border border-gray-700">
							<span class="inline-block h-2 w-2 rounded-full bg-green-500 mr-2"></span>
							${id.substring(0, 8)}
						</div>
					`).join('')}
				</div>
			`;
		} else {
			// Hide connected players section in single-player
			this.connectedPlayersElement.classList.add("hidden");
		}
	}

	/**
	 * Creates the pause menu that appears when ESC is pressed
	 */
	private createPauseMenu(): void {
		// Create pause menu container
		this.pauseMenuElement = document.createElement("div");
		this.pauseMenuElement.className = "fixed top-0 left-0 w-full h-full bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 hidden";

		// Create pause menu content
		const pauseMenuContent = document.createElement("div");
		pauseMenuContent.className = "bg-gray-800/90 rounded-xl shadow-2xl p-10 w-[520px] max-w-[90%] text-center text-white border border-gray-700";
		this.pauseMenuElement.appendChild(pauseMenuContent);

		// Create pause menu title
		const title = document.createElement("h2");
		title.className = "text-4xl font-bold text-red-400 uppercase tracking-wider mb-8 pb-3 border-b border-gray-700";
		title.textContent = "Game Paused";
		pauseMenuContent.appendChild(title);

		// Create server ID display element (initially hidden)
		this.serverIdElement = document.createElement("div");
		this.serverIdElement.className = "mb-8 p-5 bg-gray-900/70 rounded-lg border border-gray-700 hidden";
		pauseMenuContent.appendChild(this.serverIdElement);

		// Create connected players section (for multiplayer)
		this.connectedPlayersElement = document.createElement("div");
		this.connectedPlayersElement.className = "mb-8 hidden";
		pauseMenuContent.appendChild(this.connectedPlayersElement);

		// Create button container
		const buttonContainer = document.createElement("div");
		buttonContainer.className = "flex flex-col gap-4 w-full";

		// Create resume button
		const resumeButton = document.createElement("button");
		resumeButton.className = "bg-green-600 hover:bg-green-700 text-white py-4 px-6 rounded-lg font-bold text-lg transition-colors shadow-lg";
		resumeButton.textContent = "Resume Game";
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
		mainMenuButton.className = "bg-red-600 hover:bg-red-700 text-white py-4 px-6 rounded-lg font-bold text-lg transition-colors shadow-lg mt-2";
		mainMenuButton.textContent = "Back to Main Menu";
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

		pauseMenuContent.appendChild(buttonContainer);
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
			this.pauseMenuElement.className = "fixed top-0 left-0 w-full h-full bg-black/80 backdrop-blur-sm flex items-center justify-center z-50";
			// Hide the exit button when pause menu is visible
			if (this.exitButtonElement) {
				this.exitButtonElement.style.display = "none";
			}
		} else {
			this.pauseMenuElement.className = "fixed top-0 left-0 w-full h-full bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 hidden";
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
			const serverIdString = serverId.substring(0, 6);
			
			this.serverIdElement.innerHTML = `
				<div class="text-sm font-medium text-gray-400 mb-3">
					${isTakeover ? "You took over server" : "Your server ID"}
				</div>
				<div class="flex items-center justify-center gap-3 mt-3">
					<span class="text-2xl font-mono bg-black/40 py-2 px-4 rounded border border-gray-700">${serverIdString}</span>
					<button id="copy-server-id" class="bg-indigo-600/70 hover:bg-indigo-700/70 p-3 rounded">
						<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
						</svg>
					</button>
				</div>
				<div class="mt-4 text-sm text-gray-400">Share this ID with friends for them to join</div>
			`;
			
			// Show the server ID element
			this.serverIdElement.classList.remove("hidden");
			
			// Add click event for the copy button
			const copyButton = document.getElementById("copy-server-id");
			if (copyButton) {
				copyButton.addEventListener("click", () => {
					navigator.clipboard.writeText(serverId)
						.then(() => {
							this.showNotification("Server ID copied to clipboard");
						})
						.catch((err) => {
							console.error("Could not copy text: ", err);
						});
				});
			}
		} else {
			// Hide the server ID element if no ID is provided
			this.serverIdElement.classList.add("hidden");
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
