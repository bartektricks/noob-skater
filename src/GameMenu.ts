export interface GameStartOptions {
	nickname: string;
	isMultiplayer: boolean;
	peerRole: "host" | "client";
	peerCode?: string;
	serverName?: string;
	serverId?: string;
	isOnlineMode: boolean;
}

// Define server type to avoid using any
interface ServerEntry {
	id: string;
	server_name: string | null;
	created_at: string;
	player_count?: number;
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
	private p2pOptionsContainer: HTMLDivElement | null = null;
	
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
		this.menuElement.className = "fixed inset-0 flex justify-center items-center bg-gradient-to-br from-gray-900 to-black z-100 font-sans";

		// Create menu content
		this.menuContainer = document.createElement("div");
		this.menuContainer.className = "bg-gray-800/90 rounded-xl shadow-2xl px-10 pb-10 py-6 w-full max-w-3/6 text-center text-white backdrop-blur-sm border border-gray-700 max-h-[95dvh] overflow-y-auto";

		// Create form
		const form = document.createElement("form");
		form.onsubmit = (e) => {
			e.preventDefault();
			this.startGame();
		};

		// Title
		const title = document.createElement("h1");
		title.className = "text-5xl font-bold uppercase tracking-wider text-red-400 mb-8 pb-6 border-b border-gray-700";
		title.textContent = "Noob Skater";
		form.appendChild(title);

		// Nickname field
		const nicknameGroup = document.createElement("div");
		nicknameGroup.className = "mb-8 text-left";

		const nicknameLabel = document.createElement("label");
		nicknameLabel.htmlFor = "nickname";
		nicknameLabel.className = "block mb-3 font-bold text-gray-300";
		nicknameLabel.textContent = "Nickname:";
		nicknameGroup.appendChild(nicknameLabel);

		this.nicknameInput = document.createElement("input");
		this.nicknameInput.type = "text";
		this.nicknameInput.id = "nickname";
		this.nicknameInput.name = "nickname";
		this.nicknameInput.className = "w-full p-3.5 rounded-lg bg-gray-700 border border-gray-600 text-white text-base focus:outline-none focus:ring-2 focus:ring-red-400 focus:border-transparent transition";
		this.nicknameInput.placeholder = "Enter your nickname";
		this.nicknameInput.required = true;
		this.nicknameInput.maxLength = 15;
		nicknameGroup.appendChild(this.nicknameInput);

		form.appendChild(nicknameGroup);

		// Game Mode Selection
		const gameModeGroup = document.createElement("div");
		gameModeGroup.className = "mb-8 text-left";
		
		const gameModeLabel = document.createElement("div");
		gameModeLabel.className = "block mb-3 font-bold text-gray-300";
		gameModeLabel.textContent = "Game Mode:";
		gameModeGroup.appendChild(gameModeLabel);
		
		// Online Mode option
		const onlineModeContainer = document.createElement("div");
		onlineModeContainer.className = "flex items-center mb-3";
		
		this.onlineModeRadio = document.createElement("input");
		this.onlineModeRadio.type = "radio";
		this.onlineModeRadio.id = "online-mode";
		this.onlineModeRadio.name = "game-mode";
		this.onlineModeRadio.className = "mr-3 h-4 w-4 text-red-400 focus:ring-red-400";
		this.onlineModeRadio.checked = true;
		this.onlineModeRadio.addEventListener("change", () => this.toggleGameModeOptions());
		onlineModeContainer.appendChild(this.onlineModeRadio);
		
		const onlineModeLabel = document.createElement("label");
		onlineModeLabel.htmlFor = "online-mode";
		onlineModeLabel.className = "text-gray-300 font-medium";
		onlineModeLabel.textContent = "Online Mode";
		onlineModeContainer.appendChild(onlineModeLabel);
		
		gameModeGroup.appendChild(onlineModeContainer);
		
		// Offline Mode option
		const offlineModeContainer = document.createElement("div");
		offlineModeContainer.className = "flex items-center";
		
		this.offlineModeRadio = document.createElement("input");
		this.offlineModeRadio.type = "radio";
		this.offlineModeRadio.id = "offline-mode";
		this.offlineModeRadio.name = "game-mode";
		this.offlineModeRadio.className = "mr-3 h-4 w-4 text-red-400 focus:ring-red-400";
		this.offlineModeRadio.addEventListener("change", () => this.toggleGameModeOptions());
		offlineModeContainer.appendChild(this.offlineModeRadio);
		
		const offlineModeLabel = document.createElement("label");
		offlineModeLabel.htmlFor = "offline-mode";
		offlineModeLabel.className = "text-gray-300 font-medium";
		offlineModeLabel.textContent = "Offline Mode";
		offlineModeContainer.appendChild(offlineModeLabel);
		
		gameModeGroup.appendChild(offlineModeContainer);
		form.appendChild(gameModeGroup);
		
		// Server Mode Options (visible only when online mode is selected)
		this.serverModeContainer = document.createElement("div");
		this.serverModeContainer.className = "form-group mb-8 text-left";
		this.serverModeContainer.id = "server-mode-container";
		
		const serverModeLabel = document.createElement("div");
		serverModeLabel.className = "block mb-3 font-bold text-gray-300";
		serverModeLabel.textContent = "Server Options:";
		this.serverModeContainer.appendChild(serverModeLabel);
		
		// Create flex container for the radio options
		const serverOptionsContainer = document.createElement("div");
		serverOptionsContainer.className = "flex gap-8 mb-5";
		this.serverModeContainer.appendChild(serverOptionsContainer);
		
		// Create New Server option
		const createServerContainer = document.createElement("div");
		createServerContainer.className = "flex items-center";
		
		this.hostRoleRadio = document.createElement("input");
		this.hostRoleRadio.type = "radio";
		this.hostRoleRadio.id = "host-role";
		this.hostRoleRadio.name = "peer-role";
		this.hostRoleRadio.className = "mr-3 h-4 w-4 text-red-400 focus:ring-red-400";
		this.hostRoleRadio.checked = true;
		
		const createServerLabel = document.createElement("label");
		createServerLabel.htmlFor = "host-role";
		createServerLabel.className = "text-gray-300 font-medium";
		createServerLabel.textContent = "Create New Server";
		
		createServerContainer.appendChild(this.hostRoleRadio);
		createServerContainer.appendChild(createServerLabel);
		serverOptionsContainer.appendChild(createServerContainer);
		
		// Join Existing Server option
		const joinServerContainer = document.createElement("div");
		joinServerContainer.className = "flex items-center";
		
		this.clientRoleRadio = document.createElement("input");
		this.clientRoleRadio.type = "radio";
		this.clientRoleRadio.id = "client-role";
		this.clientRoleRadio.name = "peer-role";
		this.clientRoleRadio.className = "mr-3 h-4 w-4 text-red-400 focus:ring-red-400";
		
		const joinServerLabel = document.createElement("label");
		joinServerLabel.htmlFor = "client-role";
		joinServerLabel.className = "text-gray-300 font-medium";
		joinServerLabel.textContent = "Join Existing Server";
		
		joinServerContainer.appendChild(this.clientRoleRadio);
		joinServerContainer.appendChild(joinServerLabel);
		serverOptionsContainer.appendChild(joinServerContainer);
		
		// Server name input (visible when creating a new server)
		const serverNameGroup = document.createElement("div");
		serverNameGroup.className = "mb-6 text-left";
		serverNameGroup.id = "server-name-group";
		
		const serverNameLabel = document.createElement("label");
		serverNameLabel.htmlFor = "server-name";
		serverNameLabel.className = "block mb-3 font-bold text-gray-300";
		serverNameLabel.textContent = "Server Name:";
		serverNameGroup.appendChild(serverNameLabel);
		
		this.serverNameInput = document.createElement("input");
		this.serverNameInput.type = "text";
		this.serverNameInput.id = "server-name";
		this.serverNameInput.name = "server-name";
		this.serverNameInput.className = "w-full p-3.5 rounded-lg bg-gray-700 border border-gray-600 text-white text-base focus:outline-none focus:ring-2 focus:ring-red-400 focus:border-transparent transition";
		this.serverNameInput.placeholder = "Enter server name";
		this.serverNameInput.maxLength = 30;
		serverNameGroup.appendChild(this.serverNameInput);
		
		this.serverModeContainer.appendChild(serverNameGroup);
		
		// Server list container (visible when joining an existing server)
		this.serverListContainer = document.createElement("div");
		this.serverListContainer.className = "mb-5 rounded-lg overflow-hidden bg-gray-900/70 border border-gray-700 shadow-lg";
		this.serverListContainer.id = "server-list-container";
		this.serverListContainer.style.display = "none";
		
		const serverListTitle = document.createElement("div");
		serverListTitle.className = "py-3.5 px-5 font-bold text-gray-200 bg-gray-800/90 border-b border-gray-700 flex justify-between items-center";
		serverListTitle.innerHTML = `
			<span>Available Servers</span>
			<span class="text-xs font-normal text-gray-400" id="server-count"></span>
		`;
		this.serverListContainer.appendChild(serverListTitle);
		
		const serverList = document.createElement("div");
		serverList.className = "max-h-[280px] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-900";
		serverList.id = "server-list";
		this.serverListContainer.appendChild(serverList);
		
		// Add pagination controls
		const paginationContainer = document.createElement("div");
		paginationContainer.className = "flex justify-between items-center py-3 px-5 bg-gray-800/60 border-t border-gray-700";
		paginationContainer.id = "pagination-container";
		paginationContainer.innerHTML = `
			<div class="flex space-x-3">
				<button id="prev-page" class="px-4 py-1.5 rounded bg-gray-700 text-gray-300 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium">Prev</button>
				<button id="next-page" class="px-4 py-1.5 rounded bg-gray-700 text-gray-300 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium">Next</button>
			</div>
			<div class="text-sm text-gray-400" id="page-info">Page 1 of 1</div>
		`;
		this.serverListContainer.appendChild(paginationContainer);
		
		const refreshButton = document.createElement("button");
		refreshButton.type = "button";
		refreshButton.className = "w-full py-3 px-5 bg-indigo-600/70 hover:bg-indigo-700/70 text-white rounded-b-lg transition font-medium flex justify-center items-center gap-3";
		refreshButton.innerHTML = `
			<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
			</svg>
			Refresh Server List
		`;
		refreshButton.onclick = () => this.refreshServerList();
		this.serverListContainer.appendChild(refreshButton);
		
		this.serverModeContainer.appendChild(this.serverListContainer);
		
		// Connection code input for direct p2p connection
		const connectionCodeGroup = document.createElement("div");
		connectionCodeGroup.className = "mb-6 text-left";
		connectionCodeGroup.id = "connection-code-group";
		connectionCodeGroup.style.display = "none";
		
		const connectionCodeLabel = document.createElement("label");
		connectionCodeLabel.htmlFor = "connection-code";
		connectionCodeLabel.className = "block mb-3 font-bold text-gray-300";
		connectionCodeLabel.textContent = "Direct P2P Connection Code:";
		connectionCodeGroup.appendChild(connectionCodeLabel);
		
		this.peerCodeInput = document.createElement("input");
		this.peerCodeInput.type = "text";
		this.peerCodeInput.id = "connection-code";
		this.peerCodeInput.name = "connection-code";
		this.peerCodeInput.className = "w-full p-3.5 rounded-lg bg-gray-700 border border-gray-600 text-white text-base focus:outline-none focus:ring-2 focus:ring-red-400 focus:border-transparent transition";
		this.peerCodeInput.placeholder = "Enter connection code";
		connectionCodeGroup.appendChild(this.peerCodeInput);
		
		this.serverModeContainer.appendChild(connectionCodeGroup);
		
		// Peer code display for hosts
		this.peerCodeDisplay = document.createElement("div");
		this.peerCodeDisplay.className = "mb-6 p-5 bg-gray-900/70 rounded-lg border border-gray-700 hidden";
		this.peerCodeDisplay.style.display = "none";
		this.serverModeContainer.appendChild(this.peerCodeDisplay);
		
		form.appendChild(this.serverModeContainer);
		
		// Buttons
		const buttonGroup = document.createElement("div");
		buttonGroup.className = "mt-8 flex flex-col gap-4";
		
		this.startButton = document.createElement("button");
		this.startButton.type = "submit";
		this.startButton.className = "bg-blue-600 hover:bg-blue-700 text-white py-4 px-6 rounded-lg font-bold text-lg transition-colors shadow-lg";
		this.startButton.textContent = "Start Game";
		buttonGroup.appendChild(this.startButton);
		
		this.resumeButton = document.createElement("button");
		this.resumeButton.type = "button";
		this.resumeButton.className = "bg-green-600 hover:bg-green-700 text-white py-4 px-6 rounded-lg font-bold text-lg transition-colors shadow-lg hidden";
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
		const serverCount = document.getElementById("server-count");
		const pageInfo = document.getElementById("page-info");
		const prevPageBtn = document.getElementById("prev-page") as HTMLButtonElement;
		const nextPageBtn = document.getElementById("next-page") as HTMLButtonElement;
		
		if (!serverList || !pageInfo || !prevPageBtn || !nextPageBtn || !serverCount) return;
		
		serverList.innerHTML = `
			<div class="flex justify-center items-center py-10 text-gray-400">
				<svg class="animate-spin -ml-1 mr-3 h-6 w-6 text-indigo-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
					<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
					<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
				</svg>
				Loading servers...
			</div>
		`;
		
		try {
			// Import dynamically to avoid circular dependencies
			const { getActiveServers } = await import('./supabase');
			const servers = await getActiveServers();
			
			serverList.innerHTML = '';
			serverCount.textContent = `(${servers.length} found)`;
			
			if (servers.length === 0) {
				serverList.innerHTML = `
					<div class="flex flex-col justify-center items-center py-12 text-gray-400">
						<svg xmlns="http://www.w3.org/2000/svg" class="h-14 w-14 mb-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
						</svg>
						No active servers found
					</div>
				`;
				this.serversLoading = false;
				return;
			}
			
			// Setup pagination
			const serversPerPage = 4;
			let currentPage = 1;
			const totalPages = Math.ceil(servers.length / serversPerPage);
			
			// Show a single server entry
			const renderServerEntry = (server: ServerEntry, isSelected: boolean) => {
				const serverEntry = document.createElement("div");
				serverEntry.className = "border-b border-gray-700 last:border-0 transition cursor-pointer hover:bg-gray-800/50";
				serverEntry.dataset.id = server.id;
				if (isSelected) {
					serverEntry.classList.add("bg-indigo-900/30");
				}
				
				const serverContent = document.createElement("div");
				serverContent.className = "p-5";
				
				const serverNameTime = document.createElement("div");
				serverNameTime.className = "flex justify-between items-center mb-2";
				
				const serverName = document.createElement("div");
				serverName.className = "font-medium text-white text-lg";
				serverName.textContent = server.server_name || "Unnamed Server";
				
				const serverTime = document.createElement("div");
				serverTime.className = "text-gray-400 text-sm";
				serverTime.textContent = this.formatServerTime(server.created_at);
				
				serverNameTime.appendChild(serverName);
				serverNameTime.appendChild(serverTime);
				serverContent.appendChild(serverNameTime);
				
				// Add player count if available
				if (server.player_count !== undefined) {
					const playerCount = document.createElement("div");
					playerCount.className = "text-gray-400 text-sm";
					playerCount.textContent = `Players: ${server.player_count}`;
					serverContent.appendChild(playerCount);
				}
				
				serverEntry.appendChild(serverContent);
				
				// Add click event to select server
				serverEntry.addEventListener("click", () => {
					// Remove selected class from all server entries
					const serverEntries = document.querySelectorAll("[data-id]");
					for (const entry of serverEntries) {
						entry.classList.remove("bg-indigo-900/30");
					}
					
					// Add selected class to this server entry
					serverEntry.classList.add("bg-indigo-900/30");
					this.selectedServerId = server.id;
				});
				
				return serverEntry;
			};
			
			// Function to render current page
			const renderPage = (
				serverList: HTMLElement, 
				servers: ServerEntry[], 
				currentPage: number, 
				totalPages: number, 
				serversPerPage: number, 
				pageInfo: HTMLElement, 
				prevPageBtn: HTMLButtonElement, 
				nextPageBtn: HTMLButtonElement
			) => {
				const start = (currentPage - 1) * serversPerPage;
				const end = start + serversPerPage;
				const pageServers = servers.slice(start, end);
				
				serverList.innerHTML = '';
				
				// Create a server entry for each server
				for (const server of pageServers) {
					const isSelected = this.selectedServerId === server.id;
					const serverEntry = renderServerEntry(server, isSelected);
					serverList.appendChild(serverEntry);
				}
				
				// Update page info
				pageInfo.textContent = `Page ${currentPage} of ${totalPages}`;
				
				// Update button states
				prevPageBtn.disabled = currentPage === 1;
				nextPageBtn.disabled = currentPage === totalPages;
			};
			
			// Initial render
			renderPage(serverList, servers, currentPage, totalPages, serversPerPage, pageInfo, prevPageBtn, nextPageBtn);
			
			// Add pagination event listeners
			prevPageBtn.onclick = () => {
				if (currentPage > 1) {
					currentPage--;
					renderPage(serverList, servers, currentPage, totalPages, serversPerPage, pageInfo, prevPageBtn, nextPageBtn);
				}
			};
			
			nextPageBtn.onclick = () => {
				if (currentPage < totalPages) {
					currentPage++;
					renderPage(serverList, servers, currentPage, totalPages, serversPerPage, pageInfo, prevPageBtn, nextPageBtn);
				}
			};
		} catch (error) {
			console.error("Failed to load servers:", error);
			serverList.innerHTML = `
				<div class="flex flex-col justify-center items-center py-12 text-red-400">
					<svg xmlns="http://www.w3.org/2000/svg" class="h-14 w-14 mb-4 text-red-500/70" fill="none" viewBox="0 0 24 24" stroke="currentColor">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
					</svg>
					Failed to load servers
				</div>
			`;
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
      <div class="mb-3 font-medium text-gray-300">Share this code with friends to join your game:</div>
      <div class="bg-black/40 py-3 px-4 rounded border border-gray-700 font-mono text-xl text-center text-yellow-300">${code}</div>
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
		// Hide all form elements except the title
		const form = this.menuContainer.querySelector("form");
		if (form) {
			for (const child of form.children) {
				// Don't hide the title
				if (
					child.tagName === "H1" ||
					child.classList.contains("connection-message") ||
					child.classList.contains("cancel-button")
				) {
					return;
				}
				child.classList.add("hidden");
			}
		}

		// Show connection message
		const connectionMessage = document.createElement("div");
		connectionMessage.className = "my-8 text-center";
		connectionMessage.innerHTML = `
			<p class="text-2xl font-bold text-yellow-300 mb-5">Waiting for another player to join...</p>
			<p class="text-base text-gray-300 mb-8">Share the code below with a friend</p>
		`;
		connectionMessage.classList.add("connection-message");
		
		// Show peer code
		this.peerCodeDisplay = document.createElement("div");
		this.peerCodeDisplay.className = "bg-gray-900/80 text-yellow-300 p-6 rounded-lg font-mono text-2xl mb-8 border border-gray-700 mx-auto max-w-md";
		this.peerCodeDisplay.id = "peer-code-display";
		this.peerCodeDisplay.innerHTML = `
			<div class="flex justify-center items-center gap-3">
				<svg class="animate-spin h-5 w-5 text-yellow-300" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
					<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
					<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
				</svg>
				Generating code...
			</div>
		`;
		
		// Show a cancel button to go back to the main menu
		const cancelButton = document.createElement("button");
		cancelButton.textContent = "Cancel";
		cancelButton.className = "bg-gray-600 hover:bg-gray-500 text-white py-3 px-6 rounded-lg font-medium text-lg transition-colors shadow-lg";
		cancelButton.addEventListener("click", () => {
			this.resetMenuDisplay();
		});

		// Add these elements to the form
		form?.appendChild(connectionMessage);
		form?.appendChild(this.peerCodeDisplay);
		form?.appendChild(cancelButton);
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

		// Reset p2pOptionsContainer children display if it exists
		// Note: In the new UI, we don't use p2pOptionsContainer anymore
		if (this.p2pOptionsContainer?.children) {
			const p2pChildren = this.p2pOptionsContainer.children;
			for (let i = 0; i < p2pChildren.length; i++) {
				const child = p2pChildren[i] as HTMLElement;
				child.style.display = "block";
			}
		}

		// Re-apply the toggle to hide/show appropriate elements
		this.toggleGameModeOptions();
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
		// No custom styles needed anymore, using Tailwind classes instead
	}
}
