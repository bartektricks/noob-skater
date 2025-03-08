import Peer, { type DataConnection } from "peerjs";

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
}

export interface PlayerLeftMessage {
	peerId: string;
}

export type NetworkMessagePayload =
	| GameState
	| PlayerInput
	| PlayerJoinedMessage
	| PlayerLeftMessage;

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
	onPlayerJoined: (peerId: string) => void;
	onPlayerLeft: (peerId: string) => void;
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

	constructor(events: NetworkManagerEvents) {
		this.events = events;
	}

	// Initialize as a host - generates a peerID that can be shared
	public initAsHost(): Promise<string> {
		return new Promise((resolve, reject) => {
			this.isHost = true;

			// Generate a random peer ID with readable characters
			const randomId = Math.random().toString(36).substring(2, 8);
			this.peer = new Peer(`noobskater-${randomId}`);

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
					this.events.onConnected(conn.peer);
					this.events.onPlayerJoined(conn.peer);

					// Notify all other connected peers about the new player
					this.broadcastNewPlayer(conn.peer);
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
	public connectToHost(hostId: string): Promise<void> {
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
					resolve();
				});

				connection.on("error", (err) => {
					console.error("Connection error:", err);
					this.events.onError(`Connection error: ${err.message || err}`);
					reject(err);
				});
			});

			this.peer.on("error", (err) => {
				console.error("PeerJS client error:", err);
				this.events.onError(`Client error: ${err.message || err}`);
				reject(err);
			});
		});
	}

	private broadcastNewPlayer(newPeerId: string) {
		if (!this.isHost) return;

		// Notify all other connected peers about the new player
		this.connections.forEach((conn, peerId) => {
			if (peerId !== newPeerId && conn.open) {
				conn.send({
					type: "playerJoined",
					payload: { peerId: newPeerId },
				});
			}
		});
	}

	private setupConnectionHandlers(connection: DataConnection) {
		connection.on("data", (data: unknown) => {
			const message = data as NetworkMessage;
			console.log("Received data from", connection.peer, ":", message.type);

			// Handle different types of messages
			if (message.type === "gameState") {
				this.events.onGameStateReceived(message.payload as GameState);
			} else if (message.type === "playerInput") {
				// Use the provided clientId if available, otherwise use the connection's peer ID
				const payload = message.payload as PlayerInput;
				const clientId = payload.clientId || connection.peer;
				this.events.onPlayerInputReceived(payload, clientId);
			} else if (message.type === "playerJoined") {
				this.events.onPlayerJoined(
					(message.payload as PlayerJoinedMessage).peerId,
				);
			} else if (message.type === "playerLeft") {
				this.events.onPlayerLeft((message.payload as PlayerLeftMessage).peerId);
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
}
