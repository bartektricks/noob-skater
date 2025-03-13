import Peer, { type DataConnection } from "peerjs";
import type { ChatMessage } from "./ChatManager";

export interface SkateboardState {
	position: { x: number; y: number; z: number };
	rotation: { x: number; y: number; z: number };
	velocity?: { x: number; y: number; z: number };
	timestamp?: number;
	movementState?: {
		isMoving: boolean;
		verticalMovement: boolean;
		isJumping: boolean;
		isLanding: boolean;
	};
	trickState?: {
		isDoingFlip: boolean;
		flipStartTime?: number;
		flipProgress?: number;
	};
}

export interface GameState {
	hostPeerId: string;
	skateboardState: SkateboardState;
	otherPlayers: Array<{
		peerId: string;
		skateboardState: SkateboardState;
	}>;
	timestamp: number;
}

export interface PlayerInput {
	skateboardState: SkateboardState;
	clientId?: string;
	timestamp: number;
}

export interface PlayerJoinedMessage {
	peerId: string;
	nickname?: string;
}

export interface PlayerLeftMessage {
	peerId: string;
}

export interface PlayerListMessage {
	peerIds: string[];
	nicknames: Record<string, string>;
}

export type NetworkMessageType =
	| "gameState"
	| "playerInput"
	| "playerJoined"
	| "playerLeft"
	| "playerList"
	| "chatMessage";

export type NetworkMessagePayload =
	| GameState
	| PlayerInput
	| PlayerJoinedMessage
	| PlayerLeftMessage
	| PlayerListMessage
	| ChatMessage;

export interface NetworkMessage {
	type: string;
	payload: NetworkMessagePayload;
}

export interface NetworkManagerEvents {
	onConnected: (peerId: string) => void;
	onDisconnected: (peerId?: string) => void;
	onError: (error: string) => void;
	onGameStateReceived: (gameState: GameState) => void;
	onPlayerInputReceived: (input: PlayerInput, peerId: string) => void;
	onPlayerJoined: (peerId: string, nickname?: string) => void;
	onPlayerLeft: (peerId: string) => void;
	onHostTakeover: (hostId: string) => void;
	onPlayerListReceived?: (
		peerIds: string[],
		nicknames: Record<string, string>,
	) => void;
	onGetNickname?: () => string;
	onChatMessageReceived?: (message: ChatMessage) => void;
}

export interface RemotePlayer {
	peerId: string;
	connection: DataConnection;
}

export class NetworkManager {
	private peer: Peer | null = null;
	private connections: Map<string, DataConnection> = new Map();
	private isHost = false;
	private events: NetworkManagerEvents;
	private maxConnections = 7; // Maximum of 7 clients + 1 host = 8 players
	private nickname = "Player";

	constructor(events: NetworkManagerEvents) {
		this.events = events;
	}

	// Initialize as a host - generates a peerID that can be shared
	public initAsHost(customId?: string, nickname?: string): Promise<string> {
		return new Promise((resolve, reject) => {
			this.isHost = true;

			let peerId: string;
			if (customId) {
				// Use the provided ID (e.g., Supabase server ID)
				peerId = customId;
				console.log("Using custom ID for host:", peerId);
			} else {
				// Generate a random peer ID with readable characters
				const randomId = Math.random().toString(36).substring(2, 8);
				peerId = `noobskater-${randomId}`;
				console.log("Generated random ID for host:", peerId);
			}

			this.peer = new Peer(peerId);

			this.peer.on("open", (id) => {
				console.log("Host initialized with ID:", id);

				// When a client connects to the host
				this.peer?.on("connection", (conn) => {
					console.log("Client connected:", conn.peer);

					// Limit connections to maxConnections
					if (this.connections.size >= this.maxConnections) {
						console.log(
							`Max connections (${this.maxConnections}) reached, rejecting connection from ${conn.peer}`,
						);
						conn.close();
						return;
					}

					this.connections.set(conn.peer, conn);
					this.setupConnectionHandlers(conn);

					// Wait for the connection to be fully ready
					conn.on("open", () => {
						// First notify that peer has connected
						this.events.onConnected(conn.peer);

						// Then, if we have a nickname, send it to the new client immediately
						if (nickname) {
							console.log(
								`Sending host nickname to new client ${conn.peer}: ${nickname}`,
							);
							conn.send({
								type: "playerJoined",
								payload: {
									peerId: id,
									nickname,
								},
							});
						}

						// Then trigger the playerJoined event for the UI to update
						this.events.onPlayerJoined(conn.peer);

						// Finally notify all other connected peers about the new player
						this.broadcastNewPlayer(conn.peer);
					});
				});

				resolve(id);
			});

			this.peer.on("error", (err) => {
				console.error("PeerJS host error:", err);
				this.events.onError(`Host error: ${err.message || err}`);
				reject(err);
			});
		});
	}

	// Connect to a host using their peerID
	public connectToHost(hostId: string, nickname?: string): Promise<void> {
		return new Promise((resolve, reject) => {
			this.isHost = false;

			this.peer = new Peer();

			this.peer.on("open", (myId) => {
				console.log("Client initialized with ID:", myId);

				if (!this.peer) {
					reject(new Error("Peer connection is not initialized"));
					return;
				}

				const connection = this.peer.connect(hostId);

				connection.on("open", () => {
					console.log("Connected to host:", hostId);
					this.connections.set(hostId, connection);
					this.setupConnectionHandlers(connection);
					this.events.onConnected(hostId);

					// If we have a nickname, send it immediately after connection
					if (nickname) {
						console.log(`Sending client nickname to host: ${nickname}`);
						// Send our nickname to the host
						connection.send({
							type: "playerJoined",
							payload: {
								peerId: myId,
								nickname,
							},
						});
					}

					resolve();
				});

				connection.on("error", (err) => {
					console.error("Connection error:", err);
					// For error events, we don't reject immediately, we'll try takeover
				});
			});

			// Handle peer error - this is called when the host can't be found or connected to
			this.peer.on("error", (err) => {
				console.error("PeerJS client error:", err);

				// Check if this is a connection error to the host (server not found)
				if (
					err.type === "peer-unavailable" ||
					err.message?.includes("Could not connect to peer")
				) {
					console.log("Host unavailable, attempting to take over as host...");

					// Clean up the failed client connection
					this.peer?.destroy();
					this.peer = null;

					// Attempt to become the host with the same ID and our nickname
					this.attemptHostTakeover(hostId)
						.then(() => {
							resolve(); // Connection succeeded as new host
						})
						.catch((takoverErr) => {
							reject(new Error(`Failed to take over as host: ${takoverErr}`));
						});
				} else {
					// For other types of errors, just reject
					this.events.onError(`Client error: ${err.message || err}`);
					reject(err);
				}
			});
		});
	}

	// Attempt to take over as host with the specified ID
	private attemptHostTakeover(hostId: string): Promise<void> {
		return new Promise((resolve, reject) => {
			// Get the player's nickname to use when initializing as host
			let nickname = undefined;
			if (this.peer?.id) {
				// If we have a peer ID (as client), we might have sent our nickname earlier
				// Try to retrieve it from the Game class via a callback
				nickname = this.events.onGetNickname?.();
			}

			// Initialize as host with the existing server ID and our nickname
			this.initAsHost(hostId, nickname)
				.then((id) => {
					console.log("Successfully took over as host with ID:", id);
					this.isHost = true;
					this.events.onHostTakeover(id);
					resolve();
				})
				.catch((err) => {
					console.error("Failed to take over as host:", err);
					reject(err);
				});
		});
	}

	private broadcastNewPlayer(newPeerId: string, nickname?: string) {
		if (!this.isHost) return;

		// Notify all other connected peers about the new player
		for (const [peerId, conn] of this.connections.entries()) {
			if (peerId !== newPeerId && conn.open) {
				conn.send({
					type: "playerJoined",
					payload: {
						peerId: newPeerId,
						nickname,
					},
				});
			}
		}
	}

	private setupConnectionHandlers(connection: DataConnection) {
		connection.on("open", () => {
			// ... existing code ...
		});

		connection.on("data", (data: unknown) => {
			const message = data as NetworkMessage;
			if (!message || !message.type) {
				console.warn("Received invalid message format:", data);
				return;
			}

			// Handle different message types
			if (message.type === "gameState") {
				// ... existing gameState handler ...
				this.events.onGameStateReceived(message.payload as GameState);
			} else if (message.type === "playerInput") {
				// ... existing playerInput handler ...
				// Use the provided clientId if available, otherwise use the connection's peer ID
				const payload = message.payload as PlayerInput;
				const clientId = payload.clientId || connection.peer;
				this.events.onPlayerInputReceived(payload, clientId);
			} else if (message.type === "playerJoined") {
				// ... existing playerJoined handler ...
				const payload = message.payload as PlayerJoinedMessage;
				console.log(
					`Received playerJoined message: ${payload.peerId}${payload.nickname ? ` (${payload.nickname})` : ""}`,
				);
				this.events.onPlayerJoined(payload.peerId, payload.nickname);
			} else if (message.type === "playerLeft") {
				// ... existing playerLeft handler ...
				this.events.onPlayerLeft((message.payload as PlayerLeftMessage).peerId);
			} else if (message.type === "playerList") {
				// ... existing playerList handler ...
				const payload = message.payload as PlayerListMessage;
				console.log("Received full player list:", payload);
				this.events.onPlayerListReceived?.(payload.peerIds, payload.nicknames);
			} else if (message.type === "chatMessage") {
				// Chat message received
				const payload = message.payload as ChatMessage;
				console.log(`Received chat message over network from ${payload.senderNickname}: ${payload.message}`);
				
				// IMPORTANT: Always process the message locally first
				if (this.events.onChatMessageReceived) {
					// This is an incoming message from someone else, so we should always display it
					this.events.onChatMessageReceived(payload);
				}
				
				// If we're the host, relay this message to all other clients
				if (this.isHost) {
					console.log(`Host: Relaying chat message from ${payload.senderNickname} to all other clients`);
					for (const conn of this.connections.values()) {
						// Don't send back to original sender
						if (conn.peer !== connection.peer && conn.open) {
							console.log(`Relaying to: ${conn.peer}`);
							conn.send(message);
						}
					}
				}
			}
		});

		connection.on("close", () => {
			console.log("Connection closed with peer:", connection.peer);

			// Remove from connections map
			this.connections.delete(connection.peer);

			// Notify about disconnection
			this.events.onDisconnected(connection.peer);
			this.events.onPlayerLeft(connection.peer);

			// If host, notify all other peers about this player leaving
			if (this.isHost) {
				for (const conn of this.connections.values()) {
					if (conn.open) {
						conn.send({
							type: "playerLeft",
							payload: { peerId: connection.peer },
						});
					}
				}
			}
		});
	}

	// Send game state to all clients (host only)
	public sendGameState(gameState: GameState) {
		if (!this.isHost) return;

		for (const connection of this.connections.values()) {
			if (connection.open) {
				try {
					connection.send({
						type: "gameState",
						payload: gameState,
					});
				} catch (error) {
					console.error("Error sending game state to", connection.peer, error);
				}
			}
		}
	}

	// Send game state to a specific client (host only)
	public sendGameStateToPlayer(gameState: GameState, peerId: string) {
		if (!this.isHost) return;

		const connection = this.connections.get(peerId);
		if (connection?.open) {
			try {
				connection.send({
					type: "gameState",
					payload: gameState,
				});
			} catch (error) {
				console.error(
					"Error sending game state to specific player",
					peerId,
					error,
				);
			}
		}
	}

	// Send player input to the host (client only)
	public sendPlayerInput(input: PlayerInput) {
		if (this.isHost) return;

		// Clients only send to the host
		for (const connection of this.connections.values()) {
			if (connection.open) {
				console.log("Sending player input", input.timestamp);
				connection.send({
					type: "playerInput",
					payload: input,
				});
			}
		}
	}

	// Get all connected peer IDs
	public getConnectedPeers(): string[] {
		return Array.from(this.connections.keys());
	}

	// Get my own peer ID
	public getMyPeerId(): string | null {
		return this.peer ? this.peer.id : null;
	}

	// Check if connected to any peer
	public isConnected(): boolean {
		return this.connections.size > 0;
	}

	// Check if this instance is the host
	public getIsHost(): boolean {
		return this.isHost;
	}

	// Get number of connected players
	public getConnectionCount(): number {
		return this.connections.size;
	}

	// Close connection and cleanup
	public disconnect() {
		for (const connection of this.connections.values()) {
			connection.close();
		}

		this.connections.clear();

		if (this.peer) {
			this.peer.destroy();
		}

		this.peer = null;
	}

	// Send host information to a newly connected client
	public sendHostInfo(nickname: string): void {
		if (!this.isHost || !this.peer?.id) return;

		// Send to all connected peers
		for (const conn of this.connections.values()) {
			if (conn.open) {
				conn.send({
					type: "playerJoined",
					payload: {
						peerId: this.peer.id,
						nickname,
					},
				});
				console.log("Sent host info to client with nickname:", nickname);
			}
		}
	}

	// Method to broadcast that a new player has joined with their nickname
	public sendPlayerJoined(nickname: string): void {
		if (!this.peer || !this.peer.id) return;

		// Send to all connected peers
		for (const conn of this.connections.values()) {
			if (conn.open) {
				conn.send({
					type: "playerJoined",
					payload: {
						peerId: this.peer.id || "unknown",
						nickname,
					},
				});
			}
		}
	}

	// Method to broadcast current player list to all connected clients
	public broadcastPlayerList(nicknames: Record<string, string>): void {
		if (!this.isHost) return; // Only host should broadcast the full list

		const peerIds = Array.from(this.connections.keys());

		// Add the host's own ID to the list
		if (this.peer?.id) {
			peerIds.push(this.peer.id);
		}

		const message: NetworkMessage = {
			type: "playerList",
			payload: {
				peerIds,
				nicknames,
			},
		};

		// Send to all connected peers
		for (const conn of this.connections.values()) {
			if (conn.open) {
				conn.send(message);
			}
		}

		console.log("Broadcasted player list to all clients:", message.payload);
	}

	// Method to get the current player's nickname
	public getMyNickname(): string {
		if (this.events.onGetNickname) {
			return this.events.onGetNickname();
		}
		return this.nickname;
	}

	// Method to set the current player's nickname
	public setNickname(nickname: string): void {
		this.nickname = nickname;
	}

	// Register handler for chat messages
	public registerChatMessageHandler(handler: (message: ChatMessage) => void): void {
		console.log("Chat message handler registered");
		this.events.onChatMessageReceived = handler;
	}

	// Send a chat message to all connected peers
	public sendChatMessage(message: ChatMessage): void {
		const chatMessage: NetworkMessage = {
			type: "chatMessage",
			payload: message,
		};

		console.log(`Sending chat message to peers: ${message.message} (isHost: ${this.isHost}, senderId: ${message.senderId})`);
		
		// If we're not connected to anyone, just log a warning
		if (this.connections.size === 0) {
			console.warn("Cannot send chat message - not connected to any peers");
			return;
		}
		
		// Regardless of host status, send the message to all connections
		// This ensures everyone gets the message
		if (this.isHost) {
			// If we're the host, send to all clients
			for (const connection of this.connections.values()) {
				if (connection.open) {
					console.log(`Host sending chat to client ${connection.peer}`);
					connection.send(chatMessage);
				}
			}
		} else {
			// If we're a client, send to the host who will relay it
			// Client should only have one connection - to the host
			let sentToHost = false;
			for (const connection of this.connections.values()) {
				if (connection.open) {
					console.log(`Client sending chat to host ${connection.peer}`);
					connection.send(chatMessage);
					sentToHost = true;
					break; // Only send to the host
				}
			}
			
			if (!sentToHost) {
				console.warn("Failed to send message to host - no open connection");
			}
		}
	}
}
