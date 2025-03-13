export class UI {
	private controlsElement!: HTMLDivElement;
	private exitButtonElement!: HTMLButtonElement;
	private pauseMenuElement!: HTMLDivElement; // Pause menu container
	private serverIdElement!: HTMLDivElement; // Element to display server ID
	private trickDisplay!: HTMLDivElement;
	private notificationDisplay: HTMLDivElement;
	private notificationTimeout: number | null = null;
	private connectionStatusDisplay: HTMLDivElement;
	private highScoreDisplay!: HTMLDivElement;
	private currentHighScore = 0;
	private onExitToMenu: (() => void) | null = null; // Callback for exit button
	private onResumeGame: (() => void) | null = null; // Callback for resume button
	private isPauseMenuVisible = false; // Track pause menu visibility
	private connectedPlayersElement: HTMLDivElement | null = null;
	private isControlsVisible = true; // Track controls visibility state
	private isCameraDebugEnabled = false; // Track if camera debug is enabled
	
	// Chat UI elements
	private chatContainer!: HTMLDivElement;
	private chatMessages!: HTMLDivElement;
	private chatInput!: HTMLInputElement;
	private chatButton!: HTMLButtonElement;
	private chatToggleButton!: HTMLButtonElement;
	private isChatVisible = false;
	private onSendMessage: ((message: string) => void) | null = null;
	private lastReceivedMessageTime = 0;
	private chatUnreadBadge!: HTMLDivElement;
	private unreadCount = 0;

	constructor() {
		// Check for debug=camera URL parameter
		this.isCameraDebugEnabled = this.checkCameraDebugParam();

		this.createControlsInfo();
		this.createTrickText();
		this.createPauseMenu();
		this.createHighScoreDisplay();

		// Create notification display
		this.notificationDisplay = document.createElement("div");
		this.notificationDisplay.className =
			"fixed top-20 left-1/2 transform -translate-x-1/2 bg-black/80 text-white py-3 px-8 rounded-lg shadow-lg backdrop-blur-sm border border-gray-700 z-50 hidden";
		document.body.appendChild(this.notificationDisplay);

		// Create connection status display
		this.connectionStatusDisplay = document.createElement("div");
		this.connectionStatusDisplay.className =
			"fixed top-5 right-5 py-2 px-4 rounded-lg flex items-center gap-2 text-white text-sm font-medium hidden shadow-lg border border-gray-700";
		this.connectionStatusDisplay.innerHTML = `
			<span class="h-2 w-2 rounded-full bg-red-500"></span>
			Disconnected
		`;
		document.body.appendChild(this.connectionStatusDisplay);

		// Initialize chat UI
		this.createChatInterface();
	}

	/**
	 * Check if the camera debug parameter is present in the URL
	 * @returns boolean Whether the camera debug mode is enabled
	 */
	private checkCameraDebugParam(): boolean {
		const urlParams = new URLSearchParams(window.location.search);
		return urlParams.get("debug") === "camera";
	}

	private createControlsInfo(): void {
		// Create controls info container
		this.controlsElement = document.createElement("div");
		this.controlsElement.className =
			"fixed bottom-5 left-5 bg-black/80 text-white py-4 px-6 rounded-lg shadow-lg backdrop-blur-sm border border-gray-700";

		// Set controls to be initially visible
		this.isControlsVisible = true;

		// Add controls information
		this.controlsElement.innerHTML = `
			<div class="flex justify-between items-center mb-3">
				<div class="font-bold text-red-400 text-lg">Controls</div>
				<button id="toggle-controls-button" class="bg-gray-700 hover:bg-gray-600 rounded px-2 py-1 text-xs">
					Hide
				</button>
			</div>
			<div class="grid grid-cols-2 gap-x-6 gap-y-2 text-gray-200">
				<div class="flex items-center">
					<span class="bg-gray-700 rounded px-2 py-0.5 mr-2 text-xs font-mono">T</span>
					<span>Toggle chat window</span>
				</div>
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

		// Create a floating toggle button that remains visible even when controls are hidden
		const toggleButton = document.createElement("button");
		toggleButton.className =
			"fixed bottom-5 left-5 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg shadow-lg border border-red-700 z-10 font-medium";
		toggleButton.textContent = "Controls";
		toggleButton.style.display = "none"; // Initially hidden since controls are visible

		document.body.appendChild(toggleButton);

		// Add event listener to the toggle button inside the controls panel
		document
			.getElementById("toggle-controls-button")
			?.addEventListener("click", () => {
				this.isControlsVisible = false;
				this.controlsElement.classList.add("hidden");
				toggleButton.style.display = "block";
			});

		// Add event listener to the floating toggle button
		toggleButton.addEventListener("click", () => {
			this.isControlsVisible = true;
			this.controlsElement.classList.remove("hidden");
			toggleButton.style.display = "none";
		});
	}

	/**
	 * Toggle the visibility of the controls panel
	 * @param show Optional parameter to force show/hide
	 */
	public toggleControlsVisibility(show?: boolean): void {
		// Only operate if camera debug is enabled
		if (!this.isCameraDebugEnabled) {
			this.isControlsVisible = false;
			this.controlsElement.classList.add("hidden");
			return;
		}

		// If show is provided, set the state, otherwise toggle
		if (show !== undefined) {
			this.isControlsVisible = show;
		} else {
			this.isControlsVisible = !this.isControlsVisible;
		}

		// Update visibility
		if (this.isControlsVisible) {
			this.controlsElement.classList.remove("hidden");
		} else {
			this.controlsElement.classList.add("hidden");
		}
	}

	/**
	 * Get the current visibility state of controls
	 */
	public getControlsVisibility(): boolean {
		return this.isControlsVisible;
	}

	/**
	 * Check if camera debug mode is enabled
	 */
	public isCameraDebugMode(): boolean {
		return this.isCameraDebugEnabled;
	}

	private createTrickText(): void {
		// Create trick text element
		// Create trick display
		this.trickDisplay = document.createElement("div");
		this.trickDisplay.className =
			"fixed bottom-1/5 left-1/2 transform -translate-x-1/2 text-yellow-400 text-center font-bold text-2xl pointer-events-none";
		this.trickDisplay.style.opacity = "0";
		this.trickDisplay.style.transition = "all 0.5s ease-out";
		document.body.appendChild(this.trickDisplay);
	}

	public showTrickText(text: string, score = 0, shouldFadeOut = false): void {
		// Display the trick text with score
		this.trickDisplay.innerHTML = `
			<div>${text}</div>
			${score > 0 ? `<div class="text-green-400 text-xl mt-1">Score: ${score}</div>` : ""}
		`;
		this.trickDisplay.style.opacity = "1";

		// Only set timeout to hide if shouldFadeOut is true
		if (shouldFadeOut) {
			// Hide after a delay
			setTimeout(() => {
				this.trickDisplay.style.opacity = "0";
			}, 1000);
		}
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
				this.notificationDisplay.classList.remove(
					"animate-fadeIn",
					"animate-fadeOut",
				);
			}, 500);
			this.notificationTimeout = null;
		}, duration);
	}

	// Add method to show connection status
	public showConnectionStatus(
		status: "connected" | "disconnected" | "connecting" | "local",
	): void {
		// Update status display
		this.connectionStatusDisplay.className =
			"fixed top-5 right-5 py-2 px-4 rounded-lg flex items-center gap-2 text-white text-sm font-medium bg-black/80 border border-gray-700 shadow-lg backdrop-blur-sm";

		if (status === "connected") {
			// For connected status, we'll initially set this but updateConnectedPlayers
			// will replace it with actual player names when it's called
			this.connectionStatusDisplay.innerHTML = `
				<span class="h-2 w-2 rounded-full bg-green-500"></span>
				Connected
			`;
		} else if (status === "disconnected") {
			this.connectionStatusDisplay.innerHTML = `
				<span class="h-2 w-2 rounded-full bg-red-500"></span>
				Disconnected
			`;
		} else if (status === "local") {
			this.connectionStatusDisplay.innerHTML = `
				<span class="h-2 w-2 rounded-full bg-blue-500"></span>
				Local
			`;
		} else {
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
		isOnlineMode = true,
		playerNicknames: Record<string, string> = {},
	): void {
		if (!this.connectedPlayersElement) return;

		if (isOnlineMode) {
			// Online mode behavior
			this.connectedPlayersElement.classList.remove("hidden");

			if (playerCount > 0) {
				// Create the connected players content with usernames
				this.connectedPlayersElement.innerHTML = `
					<div class="text-gray-300 font-bold mb-3">Connected Players (${playerCount})</div>
					<div class="flex flex-wrap justify-center gap-3">
						${playerIds
							.map(
								(id) => `
							<div class="py-2 px-4 bg-gray-900/70 rounded-full text-sm border border-gray-700">
								<span class="inline-block h-2 w-2 rounded-full bg-green-500 mr-2"></span>
								${playerNicknames[id] || id.substring(0, 8)}
							</div>
						`,
							)
							.join("")}
					</div>
				`;
			} else {
				// No players connected in online mode
				this.connectedPlayersElement.innerHTML = `
					<div class="text-gray-300 font-bold mb-3">No players</div>
					<div class="text-gray-400 text-sm">
						Waiting for players to join...
					</div>
				`;
			}

			// Also update connection status display based on player count
			if (playerCount > 0) {
				// When players are connected, show their nicknames in the connection status
				this.connectionStatusDisplay.innerHTML = `
					<span class="h-2 w-2 rounded-full bg-green-500"></span>
					<span>
						${playerIds.map((id) => playerNicknames[id] || id.substring(0, 8)).join(", ")}
					</span>
				`;
			} else {
				// When no players are connected
				this.connectionStatusDisplay.innerHTML = `
					<span class="h-2 w-2 rounded-full bg-green-500"></span>
					<span>No players</span>
				`;
			}
		} else {
			// Hide connected players section in offline mode
			this.connectedPlayersElement.classList.add("hidden");

			// For offline mode, we already set "Local" in showConnectionStatus,
			// so we don't need to update the connection status display here
		}
	}

	/**
	 * Creates the pause menu that appears when ESC is pressed
	 */
	private createPauseMenu(): void {
		// Create pause menu container
		this.pauseMenuElement = document.createElement("div");
		this.pauseMenuElement.className =
			"fixed top-0 left-0 w-full h-full bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 hidden";

		// Create pause menu content
		const pauseMenuContent = document.createElement("div");
		pauseMenuContent.className =
			"bg-gray-800/90 rounded-xl shadow-2xl p-10 w-[520px] max-w-[90%] text-center text-white border border-gray-700";
		this.pauseMenuElement.appendChild(pauseMenuContent);

		// Create pause menu title
		const title = document.createElement("h2");
		title.className =
			"text-4xl font-bold text-red-400 uppercase tracking-wider mb-8 pb-3 border-b border-gray-700";
		title.textContent = "Game Paused";
		pauseMenuContent.appendChild(title);

		// Create server ID display element (initially hidden)
		this.serverIdElement = document.createElement("div");
		this.serverIdElement.className =
			"mb-8 p-5 bg-gray-900/70 rounded-lg border border-gray-700 hidden";
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
		resumeButton.className =
			"bg-green-600 hover:bg-green-700 text-white py-4 px-6 rounded-lg font-bold text-lg transition-colors shadow-lg";
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
		mainMenuButton.className =
			"bg-red-600 hover:bg-red-700 text-white py-4 px-6 rounded-lg font-bold text-lg transition-colors shadow-lg mt-2";
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
			this.pauseMenuElement.className =
				"fixed top-0 left-0 w-full h-full bg-black/80 backdrop-blur-sm flex items-center justify-center z-50";
			// Hide the exit button when pause menu is visible
			if (this.exitButtonElement) {
				this.exitButtonElement.style.display = "none";
			}
		} else {
			this.pauseMenuElement.className =
				"fixed top-0 left-0 w-full h-full bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 hidden";
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
	public setServerIdInPauseMenu(
		serverId: string | null,
		isTakeover = false,
	): void {
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
					navigator.clipboard
						.writeText(serverId)
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

	private createHighScoreDisplay(): void {
		this.highScoreDisplay = document.createElement("div");
		this.highScoreDisplay.className =
			"fixed top-5 left-5 bg-black/80 text-white py-2 px-4 rounded-lg shadow-lg backdrop-blur-sm border border-gray-700";
		this.highScoreDisplay.innerHTML = `
			<div class="text-sm font-medium text-gray-400">High Score</div>
			<div class="text-2xl font-bold text-yellow-400">0</div>
		`;
		document.body.appendChild(this.highScoreDisplay);
	}

	public updateHighScore(score: number): void {
		if (score > this.currentHighScore) {
			this.currentHighScore = score;
			this.highScoreDisplay.innerHTML = `
				<div class="text-sm font-medium text-gray-400">High Score</div>
				<div class="text-2xl font-bold text-yellow-400">${this.currentHighScore}</div>
			`;
		}
	}

	/**
	 * Create the chat interface
	 */
	private createChatInterface(): void {
		// Create chat container
		this.chatContainer = document.createElement("div");
		this.chatContainer.className = 
			"fixed bottom-20 right-5 w-80 bg-black/80 rounded-lg shadow-lg backdrop-blur-sm border border-gray-700 z-40 transition-all duration-300 transform translate-x-full";
		
		// Create chat header with toggle button
		const chatHeader = document.createElement("div");
		chatHeader.className = 
			"flex items-center justify-between p-3 border-b border-gray-700";
		
		const chatTitle = document.createElement("span");
		chatTitle.className = "text-white font-bold";
		chatTitle.textContent = "Chat";
		
		this.chatToggleButton = document.createElement("button");
		this.chatToggleButton.className = 
			"absolute -left-12 bottom-0 bg-black/80 text-white px-3 py-2 rounded-l-lg border border-gray-700 border-r-0";
		this.chatToggleButton.innerHTML = 
			'<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>';
		
		// Create unread badge
		this.chatUnreadBadge = document.createElement("div");
		this.chatUnreadBadge.className = 
			"absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center hidden";
		this.chatUnreadBadge.textContent = "0";
		this.chatToggleButton.appendChild(this.chatUnreadBadge);
		
		// Add click event to toggle button
		this.chatToggleButton.addEventListener("click", () => {
			this.toggleChat();
		});
		
		chatHeader.appendChild(chatTitle);
		
		// Create chat messages container
		this.chatMessages = document.createElement("div");
		this.chatMessages.className = 
			"p-3 h-64 overflow-y-auto flex flex-col gap-2 scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-transparent";
		
		// Create chat input area
		const chatInputContainer = document.createElement("div");
		chatInputContainer.className = 
			"p-3 border-t border-gray-700 flex gap-2";
		
		this.chatInput = document.createElement("input");
		this.chatInput.className = 
			"bg-gray-800 text-white rounded px-3 py-2 flex-grow border border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500";
		this.chatInput.placeholder = "Type a message...";
		this.chatInput.addEventListener("keypress", (e) => {
			if (e.key === "Enter" && !e.shiftKey) {
				this.sendChatMessage();
				e.preventDefault();
			}
		});
		
		this.chatButton = document.createElement("button");
		this.chatButton.className = 
			"bg-blue-600 hover:bg-blue-700 text-white rounded px-3";
		this.chatButton.innerHTML = 
			'<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 5l7 7-7 7M5 5l7 7-7 7" /></svg>';
		this.chatButton.addEventListener("click", () => {
			this.sendChatMessage();
		});
		
		chatInputContainer.appendChild(this.chatInput);
		chatInputContainer.appendChild(this.chatButton);
		
		// Assemble chat container
		this.chatContainer.appendChild(chatHeader);
		this.chatContainer.appendChild(this.chatMessages);
		this.chatContainer.appendChild(chatInputContainer);
		
		// Add chat container and toggle button to the DOM
		document.body.appendChild(this.chatContainer);
		document.body.appendChild(this.chatToggleButton);
	}
	
	/**
	 * Toggle chat visibility
	 */
	public toggleChat(show?: boolean): void {
		this.isChatVisible = show !== undefined ? show : !this.isChatVisible;
		
		if (this.isChatVisible) {
			this.chatContainer.classList.remove("translate-x-full");
			this.chatInput.focus();
			// Reset unread count
			this.unreadCount = 0;
			this.chatUnreadBadge.textContent = "0";
			this.chatUnreadBadge.classList.add("hidden");
		} else {
			this.chatContainer.classList.add("translate-x-full");
		}
	}
	
	/**
	 * Send chat message
	 */
	private sendChatMessage(): void {
		const message = this.chatInput.value.trim();
		if (message && this.onSendMessage) {
			this.onSendMessage(message);
			this.chatInput.value = "";
		}
	}
	
	/**
	 * Set the callback for when a message is sent
	 */
	public setChatMessageCallback(callback: (message: string) => void): void {
		this.onSendMessage = callback;
	}
	
	/**
	 * Add a chat message to the display
	 */
	public addChatMessage(senderId: string, senderName: string, message: string, isMe = false): void {
		console.log(`UI: Adding chat message from ${isMe ? "me" : senderName} (${senderId}): ${message}`);
		
		// Create a timestamp display
		const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
		
		const messageElement = document.createElement("div");
		messageElement.className = isMe 
			? "bg-blue-600 text-white p-3 rounded-lg self-end max-w-[80%] mb-3 shadow-md" 
			: "bg-gray-700 text-white p-3 rounded-lg self-start max-w-[80%] mb-3 shadow-md";
		
		const headerElement = document.createElement("div");
		headerElement.className = "flex justify-between items-center mb-1 text-xs gap-1";
		
		const nameElement = document.createElement("span");
		nameElement.className = "font-bold";
		nameElement.textContent = isMe ? "You" : senderName;
		
		const timeElement = document.createElement("span");
		timeElement.className = "opacity-70";
		timeElement.textContent = timestamp;
		
		headerElement.appendChild(nameElement);
		headerElement.appendChild(timeElement);
		
		const textElement = document.createElement("div");
		textElement.className = "break-words";
		textElement.textContent = message;
		
		messageElement.appendChild(headerElement);
		messageElement.appendChild(textElement);
		
		this.chatMessages.appendChild(messageElement);
		this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
		
		// Always auto-show the chat when receiving a message from others
		if (!isMe && !this.isChatVisible) {
			// Auto-show chat on messages from others
			this.toggleChat(true);
			
			// After 5 seconds, toggle chat back to hidden state if not interacting with it
			setTimeout(() => {
				if (this.isChatVisible) {
					this.toggleChat(false);
				}
			}, 5000);
		}
		
		// If chat is not visible, increment unread count and show notification
		if (!this.isChatVisible) {
			this.unreadCount++;
			this.chatUnreadBadge.textContent = this.unreadCount.toString();
			this.chatUnreadBadge.classList.remove("hidden");
			
			// Show a brief reminder about the chat key if this is the first message
			if (this.unreadCount === 1) {
				const reminderElement = document.createElement("div");
				reminderElement.className = "bg-blue-800 text-white text-xs p-2 rounded-lg text-center my-3";
				reminderElement.textContent = "Press T to toggle chat";
				this.chatMessages.appendChild(reminderElement);
				
				// Also show a notification about how to open chat
				this.showNotification("New message! Press T to open chat", 3000);
			}
		}
		
		this.lastReceivedMessageTime = Date.now();
	}
}
