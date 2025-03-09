export interface GameStartOptions {
	nickname: string;
	isMultiplayer: boolean;
	peerRole: "host" | "client";
	peerCode?: string;
	serverName?: string;
	serverId?: string;
	isOnlineMode: boolean;
}

export class GameMenu {
	private menuElement!: HTMLElement;
	private nicknameInput!: HTMLInputElement;
	private menuContainer!: HTMLDivElement;
	private resumeButton!: HTMLButtonElement;
	private startButton!: HTMLButtonElement;
	private isInitialStart = true;

	// Peer-to-peer elements
	private hostRoleRadio!: HTMLInputElement;
	private clientRoleRadio!: HTMLInputElement;
	private peerCodeInput!: HTMLInputElement;
	private peerCodeDisplay!: HTMLDivElement;
	private p2pOptionsContainer!: HTMLDivElement;
	
	// Server mode elements
	private onlineModeRadio!: HTMLInputElement;
	private offlineModeRadio!: HTMLInputElement;
	private serverNameInput!: HTMLInputElement;
	private serverListContainer!: HTMLDivElement;
	private serverModeContainer!: HTMLDivElement;
	private selectedServerId: string | null = null;
	private serversLoading = false;

	constructor(private onStartGame: (options: GameStartOptions) => void) {
		// Create menu element
		this.createMenuElement();

		// Show menu on start
		this.show();
	}

	private createMenuElement(): void {
		// Create main container
		this.menuElement = document.createElement("div");
		this.menuElement.id = "game-menu";

		// Create menu content
		this.menuContainer = document.createElement("div");
		this.menuContainer.className = "menu-container";

		// Create form
		const form = document.createElement("form");
		form.onsubmit = (e) => {
			e.preventDefault();
			this.startGame();
		};

		// Title
		const title = document.createElement("h1");
		title.textContent = "Noob Skater";
		form.appendChild(title);

		// Nickname field
		const nicknameGroup = document.createElement("div");
		nicknameGroup.className = "form-group";

		const nicknameLabel = document.createElement("label");
		nicknameLabel.htmlFor = "nickname";
		nicknameLabel.textContent = "Nickname:";
		nicknameGroup.appendChild(nicknameLabel);

		this.nicknameInput = document.createElement("input");
		this.nicknameInput.type = "text";
		this.nicknameInput.id = "nickname";
		this.nicknameInput.name = "nickname";
		this.nicknameInput.placeholder = "Enter your nickname";
		this.nicknameInput.required = true;
		this.nicknameInput.maxLength = 15;
		nicknameGroup.appendChild(this.nicknameInput);

		form.appendChild(nicknameGroup);

		// Game Mode Selection
		const gameModeGroup = document.createElement("div");
		gameModeGroup.className = "form-group";
		
		const gameModeLabel = document.createElement("div");
		gameModeLabel.className = "group-label";
		gameModeLabel.textContent = "Game Mode:";
		gameModeGroup.appendChild(gameModeLabel);
		
		// Online Mode option
		const onlineModeContainer = document.createElement("div");
		onlineModeContainer.className = "radio-container";
		
		this.onlineModeRadio = document.createElement("input");
		this.onlineModeRadio.type = "radio";
		this.onlineModeRadio.id = "online-mode";
		this.onlineModeRadio.name = "game-mode";
		this.onlineModeRadio.checked = true;
		
		const onlineModeLabel = document.createElement("label");
		onlineModeLabel.htmlFor = "online-mode";
		onlineModeLabel.textContent = "Online";
		
		onlineModeContainer.appendChild(this.onlineModeRadio);
		onlineModeContainer.appendChild(onlineModeLabel);
		gameModeGroup.appendChild(onlineModeContainer);
		
		// Offline Mode option
		const offlineModeContainer = document.createElement("div");
		offlineModeContainer.className = "radio-container";
		
		this.offlineModeRadio = document.createElement("input");
		this.offlineModeRadio.type = "radio";
		this.offlineModeRadio.id = "offline-mode";
		this.offlineModeRadio.name = "game-mode";
		
		const offlineModeLabel = document.createElement("label");
		offlineModeLabel.htmlFor = "offline-mode";
		offlineModeLabel.textContent = "Offline";
		
		offlineModeContainer.appendChild(this.offlineModeRadio);
		offlineModeContainer.appendChild(offlineModeLabel);
		gameModeGroup.appendChild(offlineModeContainer);
		
		form.appendChild(gameModeGroup);
		
		// Server Mode Options (visible only when online mode is selected)
		this.serverModeContainer = document.createElement("div");
		this.serverModeContainer.className = "form-group";
		this.serverModeContainer.id = "server-mode-container";
		
		const serverModeLabel = document.createElement("div");
		serverModeLabel.className = "group-label";
		serverModeLabel.textContent = "Server Options:";
		this.serverModeContainer.appendChild(serverModeLabel);
		
		// Create New Server option
		const createServerContainer = document.createElement("div");
		createServerContainer.className = "radio-container";
		
		this.hostRoleRadio = document.createElement("input");
		this.hostRoleRadio.type = "radio";
		this.hostRoleRadio.id = "host-role";
		this.hostRoleRadio.name = "peer-role";
		this.hostRoleRadio.checked = true;
		
		const createServerLabel = document.createElement("label");
		createServerLabel.htmlFor = "host-role";
		createServerLabel.textContent = "Create New Server";
		
		createServerContainer.appendChild(this.hostRoleRadio);
		createServerContainer.appendChild(createServerLabel);
		this.serverModeContainer.appendChild(createServerContainer);
		
		// Server name input (visible when creating a new server)
		const serverNameGroup = document.createElement("div");
		serverNameGroup.className = "form-group indent";
		serverNameGroup.id = "server-name-group";
		
		const serverNameLabel = document.createElement("label");
		serverNameLabel.htmlFor = "server-name";
		serverNameLabel.textContent = "Server Name:";
		serverNameGroup.appendChild(serverNameLabel);
		
		this.serverNameInput = document.createElement("input");
		this.serverNameInput.type = "text";
		this.serverNameInput.id = "server-name";
		this.serverNameInput.name = "server-name";
		this.serverNameInput.placeholder = "Enter server name";
		this.serverNameInput.maxLength = 30;
		serverNameGroup.appendChild(this.serverNameInput);
		
		this.serverModeContainer.appendChild(serverNameGroup);
		
		// Join Existing Server option
		const joinServerContainer = document.createElement("div");
		joinServerContainer.className = "radio-container";
		
		this.clientRoleRadio = document.createElement("input");
		this.clientRoleRadio.type = "radio";
		this.clientRoleRadio.id = "client-role";
		this.clientRoleRadio.name = "peer-role";
		
		const joinServerLabel = document.createElement("label");
		joinServerLabel.htmlFor = "client-role";
		joinServerLabel.textContent = "Join Existing Server";
		
		joinServerContainer.appendChild(this.clientRoleRadio);
		joinServerContainer.appendChild(joinServerLabel);
		this.serverModeContainer.appendChild(joinServerContainer);
		
		// Server list container (visible when joining an existing server)
		this.serverListContainer = document.createElement("div");
		this.serverListContainer.className = "server-list-container indent";
		this.serverListContainer.id = "server-list-container";
		this.serverListContainer.style.display = "none";
		
		const serverListTitle = document.createElement("div");
		serverListTitle.className = "server-list-title";
		serverListTitle.textContent = "Available Servers:";
		this.serverListContainer.appendChild(serverListTitle);
		
		const serverList = document.createElement("div");
		serverList.className = "server-list";
		serverList.id = "server-list";
		this.serverListContainer.appendChild(serverList);
		
		const refreshButton = document.createElement("button");
		refreshButton.type = "button";
		refreshButton.className = "refresh-button";
		refreshButton.textContent = "Refresh Server List";
		refreshButton.onclick = () => this.refreshServerList();
		this.serverListContainer.appendChild(refreshButton);
		
		this.serverModeContainer.appendChild(this.serverListContainer);
		
		// Connection code input for direct p2p connection
		const connectionCodeGroup = document.createElement("div");
		connectionCodeGroup.className = "form-group indent";
		connectionCodeGroup.id = "connection-code-group";
		connectionCodeGroup.style.display = "none";
		
		const connectionCodeLabel = document.createElement("label");
		connectionCodeLabel.htmlFor = "connection-code";
		connectionCodeLabel.textContent = "Direct P2P Connection Code:";
		connectionCodeGroup.appendChild(connectionCodeLabel);
		
		this.peerCodeInput = document.createElement("input");
		this.peerCodeInput.type = "text";
		this.peerCodeInput.id = "connection-code";
		this.peerCodeInput.name = "connection-code";
		this.peerCodeInput.placeholder = "Enter connection code";
		connectionCodeGroup.appendChild(this.peerCodeInput);
		
		this.serverModeContainer.appendChild(connectionCodeGroup);
		
		// Peer code display for hosts
		this.peerCodeDisplay = document.createElement("div");
		this.peerCodeDisplay.className = "peer-code-display";
		this.peerCodeDisplay.style.display = "none";
		this.serverModeContainer.appendChild(this.peerCodeDisplay);
		
		form.appendChild(this.serverModeContainer);
		
		// Buttons
		const buttonGroup = document.createElement("div");
		buttonGroup.className = "form-group button-group";
		
		this.startButton = document.createElement("button");
		this.startButton.type = "submit";
		this.startButton.textContent = "Start Game";
		buttonGroup.appendChild(this.startButton);
		
		this.resumeButton = document.createElement("button");
		this.resumeButton.type = "button";
		this.resumeButton.textContent = "Resume Game";
		this.resumeButton.style.display = "none";
		this.resumeButton.onclick = () => this.resumeGame();
		buttonGroup.appendChild(this.resumeButton);
		
		form.appendChild(buttonGroup);
		
		this.menuContainer.appendChild(form);
		this.menuElement.appendChild(this.menuContainer);
		document.body.appendChild(this.menuElement);
		
		// Set up event listeners
		this.hostRoleRadio.addEventListener("change", () => this.toggleServerOptions());
		this.clientRoleRadio.addEventListener("change", () => this.toggleServerOptions());
		this.onlineModeRadio.addEventListener("change", () => this.toggleGameModeOptions());
		this.offlineModeRadio.addEventListener("change", () => this.toggleGameModeOptions());
		
		// Initialize options display
		this.toggleGameModeOptions();
	}

	private toggleGameModeOptions(): void {
		if (this.onlineModeRadio.checked) {
			this.serverModeContainer.style.display = "block";
			this.toggleServerOptions(); // Update server options based on current selection
		} else {
			this.serverModeContainer.style.display = "none";
		}
	}

	private toggleServerOptions(): void {
		// Only relevant when online mode is selected
		if (!this.onlineModeRadio.checked) return;
		
		const serverNameGroup = document.getElementById("server-name-group");
		const connectionCodeGroup = document.getElementById("connection-code-group");
		
		if (this.hostRoleRadio.checked) {
			// Create server mode
			if (serverNameGroup) {
				serverNameGroup.style.display = "block";
			}
			if (connectionCodeGroup) {
				connectionCodeGroup.style.display = "none";
			}
			this.serverListContainer.style.display = "none";
			this.peerCodeDisplay.style.display = "none";
		} else {
			// Join server mode
			if (serverNameGroup) {
				serverNameGroup.style.display = "none";
			}
			this.serverListContainer.style.display = "block";
			
			// Load server list
			this.refreshServerList();
			
			// Show connection code input for direct p2p
			if (connectionCodeGroup) {
				connectionCodeGroup.style.display = "block";
			}
		}
	}

	private async refreshServerList(): Promise<void> {
		if (this.serversLoading) return;
		
		this.serversLoading = true;
		const serverList = document.getElementById("server-list");
		if (!serverList) return;
		
		serverList.innerHTML = '<div class="loading-message">Loading servers...</div>';
		
		try {
			// Import dynamically to avoid circular dependencies
			const { getActiveServers } = await import('./supabase');
			const servers = await getActiveServers();
			
			serverList.innerHTML = '';
			
			if (servers.length === 0) {
				serverList.innerHTML = '<div class="no-servers-message">No active servers found</div>';
				this.serversLoading = false;
				return;
			}
			
			// Create a server entry for each server
			for (const server of servers) {
				const serverEntry = document.createElement("div");
				serverEntry.className = "server-entry";
				serverEntry.dataset.id = server.id;
				if (this.selectedServerId === server.id) {
					serverEntry.classList.add("selected");
				}
				
				const serverName = document.createElement("div");
				serverName.className = "server-name";
				serverName.textContent = server.server_name || "Unnamed Server";
				
				const serverTime = document.createElement("div");
				serverTime.className = "server-time";
				serverTime.textContent = this.formatServerTime(server.created_at);
				
				serverEntry.appendChild(serverName);
				serverEntry.appendChild(serverTime);
				
				// Add click event to select server
				serverEntry.addEventListener("click", () => {
					// Remove selected class from all server entries
					const serverEntries = document.querySelectorAll(".server-entry");
					for (const entry of serverEntries) {
						entry.classList.remove("selected");
					}
					
					// Add selected class to this server entry
					serverEntry.classList.add("selected");
					this.selectedServerId = server.id;
				});
				
				serverList.appendChild(serverEntry);
			}
		} catch (error) {
			console.error("Failed to load servers:", error);
			serverList.innerHTML = '<div class="error-message">Failed to load servers</div>';
		}
		
		this.serversLoading = false;
	}
	
	private formatServerTime(dateString: string): string {
		const date = new Date(dateString);
		const now = new Date();
		const diffMs = now.getTime() - date.getTime();
		const diffMins = Math.floor(diffMs / 60000);
		
		if (diffMins < 1) {
			return 'Just now';
		}
		
		if (diffMins < 60) {
			return `${diffMins} min ago`;
		}
		
		if (diffMins < 1440) {
			return `${Math.floor(diffMins / 60)} hr ago`;
		}
		
		return `${Math.floor(diffMins / 1440)} days ago`;
	}

	// Set the peer code in the display (called after host generates code)
	public setPeerCode(code: string): void {
		this.peerCodeDisplay.innerHTML = `
      <div class="code-box">${code}</div>
    `;
		this.peerCodeDisplay.style.display = "block";
	}

	private async startGame(): Promise<void> {
		if (!this.nicknameInput.value.trim()) {
			alert("Please enter a nickname!");
			return;
		}
		
		const isOnlineMode = this.onlineModeRadio.checked;
		
		if (isOnlineMode) {
			if (this.hostRoleRadio.checked) {
				// Create server mode
				if (!this.serverNameInput.value.trim()) {
					alert("Please enter a server name!");
					return;
				}
			} else {
				// Join server mode
				// Check if a server is selected or direct connection code is provided
				if (!this.selectedServerId && !this.peerCodeInput.value.trim()) {
					alert("Please select a server or enter a direct connection code!");
					return;
				}
			}
		}
		
		let serverId: string | undefined = undefined;
		
		// If creating a new server in online mode, register it with Supabase
		if (isOnlineMode && this.hostRoleRadio.checked && this.serverNameInput.value.trim()) {
			try {
				// Import dynamically to avoid circular dependencies
				const { addServer } = await import('./supabase');
				serverId = await addServer(this.serverNameInput.value.trim()) || undefined;
				
				if (!serverId) {
					console.warn("Failed to register server, continuing without server registration");
				}
			} catch (error) {
				console.error("Error registering server:", error);
			}
		}
		
		// When joining a server, use the server ID as the peer code
		let peerCode: string | undefined = undefined;
		if (this.clientRoleRadio.checked) {
			if (this.selectedServerId) {
				// Use selected server ID as peer code when joining from server list
				peerCode = this.selectedServerId;
				console.log("Using server ID as peer code:", peerCode);
			} else if (this.peerCodeInput.value.trim()) {
				// Use manual peer code input if provided
				peerCode = this.peerCodeInput.value.trim();
				console.log("Using manual peer code:", peerCode);
			}
		}
		
		const options: GameStartOptions = {
			nickname: this.nicknameInput.value.trim(),
			isMultiplayer: true,
			peerRole: this.hostRoleRadio.checked ? "host" : "client",
			isOnlineMode,
			peerCode,
			serverName: this.hostRoleRadio.checked ? this.serverNameInput.value.trim() : undefined,
			serverId: this.clientRoleRadio.checked ? this.selectedServerId || undefined : serverId
		};
		
		// Hide the menu
		this.hide();
		
		// Start the game
		this.onStartGame(options);
	}

	private resumeGame(): void {
		this.hide();

		// Pass empty options just to trigger the game to resume
		const options: GameStartOptions = {
			nickname: this.nicknameInput.value || "Player",
			isMultiplayer: true,
			peerRole: "host", // Default role doesn't matter for resuming
			isOnlineMode: false // Default to false when resuming
		};

		this.onStartGame(options);
	}

	public show(): void {
		this.menuElement.style.display = "flex";
		this.addStyles();
		
		// Focus nickname input
		setTimeout(() => {
			this.nicknameInput.focus();
		}, 100);
	}

	public hide(): void {
		this.menuElement.style.display = "none";
	}

	// Add this method to show a special waiting screen for the host
	public showHostWaitingScreen(): void {
		// Hide the main form elements except for the peer code display
		const form = this.menuContainer.querySelector("form");

		if (!form) return;

		const formChildren = form.children;

		// Hide everything except the title and the peer code display
		for (let i = 0; i < formChildren.length; i++) {
			const child = formChildren[i] as HTMLElement;

			// Keep the title and peer code display visible
			if (child.tagName === "H1" || child === this.p2pOptionsContainer) {
				child.style.display = "block";
			} else {
				child.style.display = "none";
			}
		}

		// Within p2pOptionsContainer, hide everything except peerCodeDisplay
		const p2pChildren = this.p2pOptionsContainer.children;
		for (let i = 0; i < p2pChildren.length; i++) {
			const child = p2pChildren[i] as HTMLElement;
			if (child !== this.peerCodeDisplay) {
				child.style.display = "none";
			}
		}

		// Show a cancel button to go back to the main menu
		const cancelButton = document.createElement("button");
		cancelButton.textContent = "Cancel";
		cancelButton.className = "menu-button cancel-button";
		cancelButton.style.backgroundColor = "#666";
		cancelButton.style.marginTop = "20px";
		cancelButton.addEventListener("click", () => {
			// Reset UI and show the full menu again
			this.resetMenuDisplay();
			// Don't trigger game start - just go back to menu
		});

		// Add a connection status message
		const statusMessage = document.createElement("p");
		statusMessage.className = "connection-message";
		statusMessage.textContent = "Waiting for another player to connect...";
		statusMessage.style.marginTop = "20px";
		statusMessage.style.fontStyle = "italic";

		// Add these elements to the form
		form.appendChild(statusMessage);
		form.appendChild(cancelButton);
	}

	// Add this method to reset the menu display
	private resetMenuDisplay(): void {
		// Show all form elements
		const form = this.menuContainer.querySelector("form");

		if (!form) return;

		const formChildren = form.children;

		// Show standard form elements
		for (let i = 0; i < formChildren.length; i++) {
			const child = formChildren[i] as HTMLElement;

			// Don't show elements with class "connection-message" and "cancel-button"
			if (
				!child.classList.contains("connection-message") &&
				!child.classList.contains("cancel-button")
			) {
				child.style.display = "block";
			} else {
				// Remove temporary elements
				child.remove();
				i--; // Adjust index after removal
			}
		}

		// Reset p2pOptionsContainer children display
		const p2pChildren = this.p2pOptionsContainer.children;
		for (let i = 0; i < p2pChildren.length; i++) {
			const child = p2pChildren[i] as HTMLElement;
			child.style.display = "block";
		}

		// Re-apply the toggle to hide/show appropriate elements
		this.toggleServerOptions();
	}

	// Add this method to reset the menu to its initial state
	public resetToInitialState(): void {
		// Reset form fields
		this.nicknameInput.value = "";
		this.serverNameInput.value = "";
		this.peerCodeInput.value = "";
		this.peerCodeDisplay.innerHTML = "";
		this.peerCodeDisplay.style.display = "none";
		this.selectedServerId = null;
		
		// Reset radio buttons
		this.onlineModeRadio.checked = true;
		this.offlineModeRadio.checked = false;
		this.hostRoleRadio.checked = true;
		this.clientRoleRadio.checked = false;
		
		// Reset display
		this.toggleGameModeOptions();
		
		// Show the menu in initial state
		this.resetMenuDisplay();
		
		// Show the menu
		this.show();
	}

	// Add custom CSS styles for the server list
	private addStyles(): void {
		const styleElement = document.createElement("style");
		styleElement.textContent = `
			.server-list-container {
				margin-top: 10px;
				max-height: 200px;
				overflow-y: auto;
				border: 1px solid #444;
				border-radius: 4px;
				background-color: rgba(0, 0, 0, 0.2);
			}
			
			.server-list-title {
				padding: 8px;
				font-weight: bold;
				border-bottom: 1px solid #444;
			}
			
			.server-list {
				max-height: 150px;
				overflow-y: auto;
			}
			
			.server-entry {
				padding: 8px;
				border-bottom: 1px solid #333;
				cursor: pointer;
				display: flex;
				justify-content: space-between;
				transition: background-color 0.2s;
			}
			
			.server-entry:hover {
				background-color: rgba(255, 255, 255, 0.1);
			}
			
			.server-entry.selected {
				background-color: rgba(0, 100, 255, 0.3);
			}
			
			.server-name {
				font-weight: bold;
			}
			
			.server-time {
				color: #aaa;
				font-size: 0.9em;
			}
			
			.no-servers-message, .loading-message, .error-message {
				padding: 15px;
				text-align: center;
				color: #aaa;
			}
			
			.error-message {
				color: #ff6b6b;
			}
			
			.refresh-button {
				width: 100%;
				padding: 8px;
				background-color: rgba(0, 100, 255, 0.2);
				border: 1px solid #444;
				color: white;
				cursor: pointer;
				transition: background-color 0.2s;
			}
			
			.refresh-button:hover {
				background-color: rgba(0, 100, 255, 0.4);
			}
			
			.indent {
				margin-left: 20px;
				margin-top: 5px;
			}
			
			.form-group.button-group {
				margin-top: 20px;
			}
		`;
		document.head.appendChild(styleElement);
	}
}
