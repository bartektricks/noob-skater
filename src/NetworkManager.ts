import Peer, { DataConnection } from 'peerjs';

export interface NetworkManagerEvents {
  onConnected: (peerId: string) => void;
  onDisconnected: (peerId?: string) => void;
  onError: (error: string) => void;
  onGameStateReceived: (gameState: any) => void;
  onPlayerInputReceived: (input: any, peerId: string) => void;
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
  private isHost: boolean = false;
  private events: NetworkManagerEvents;
  private maxConnections: number = 7; // Maximum of 7 clients + 1 host = 8 players
  
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
      
      this.peer.on('open', (id) => {
        console.log('Host initialized with ID:', id);
        
        // When a client connects to the host
        this.peer?.on('connection', (conn) => {
          console.log('Client connected:', conn.peer);
          
          // Limit connections to maxConnections
          if (this.connections.size >= this.maxConnections) {
            console.log(`Max connections (${this.maxConnections}) reached, rejecting connection from ${conn.peer}`);
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
      
      this.peer.on('error', (err) => {
        console.error('PeerJS host error:', err);
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
      
      this.peer.on('open', (myId) => {
        console.log('Client initialized with ID:', myId);
        
        if (!this.peer) {
          reject(new Error('Peer connection is not initialized'));
          return;
        }
        
        const connection = this.peer.connect(hostId);
        
        connection.on('open', () => {
          console.log('Connected to host:', hostId);
          this.connections.set(hostId, connection);
          this.setupConnectionHandlers(connection);
          this.events.onConnected(hostId);
          resolve();
        });
        
        connection.on('error', (err) => {
          console.error('Connection error:', err);
          this.events.onError(`Connection error: ${err.message || err}`);
          reject(err);
        });
      });
      
      this.peer.on('error', (err) => {
        console.error('PeerJS client error:', err);
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
          type: 'playerJoined',
          payload: { peerId: newPeerId }
        });
      }
    });
  }
  
  private setupConnectionHandlers(connection: DataConnection) {
    connection.on('data', (data: any) => {
      console.log("Received data from", connection.peer, ":", data.type);
      
      // Handle different types of messages
      if (data.type === 'gameState') {
        this.events.onGameStateReceived(data.payload);
      } else if (data.type === 'playerInput') {
        // Use the provided clientId if available, otherwise use the connection's peer ID
        const clientId = data.payload.clientId || connection.peer;
        this.events.onPlayerInputReceived(data.payload, clientId);
      } else if (data.type === 'playerJoined') {
        this.events.onPlayerJoined(data.payload.peerId);
      } else if (data.type === 'playerLeft') {
        this.events.onPlayerLeft(data.payload.peerId);
      }
    });
    
    connection.on('close', () => {
      console.log('Connection closed with peer:', connection.peer);
      
      // Remove from connections map
      this.connections.delete(connection.peer);
      
      // Notify about disconnection
      this.events.onDisconnected(connection.peer);
      this.events.onPlayerLeft(connection.peer);
      
      // If host, notify all other peers about this player leaving
      if (this.isHost) {
        this.connections.forEach((conn) => {
          if (conn.open) {
            conn.send({
              type: 'playerLeft',
              payload: { peerId: connection.peer }
            });
          }
        });
      }
    });
  }
  
  // Send game state to all clients (host only)
  public sendGameState(gameState: any) {
    if (!this.isHost) return;
    
    this.connections.forEach((connection) => {
      if (connection.open) {
        try {
          connection.send({
            type: 'gameState',
            payload: gameState
          });
        } catch (error) {
          console.error("Error sending game state to", connection.peer, error);
        }
      }
    });
  }
  
  // Send game state to a specific client (host only)
  public sendGameStateToPlayer(gameState: any, peerId: string) {
    if (!this.isHost) return;
    
    const connection = this.connections.get(peerId);
    if (connection && connection.open) {
      try {
        connection.send({
          type: 'gameState',
          payload: gameState
        });
      } catch (error) {
        console.error("Error sending game state to specific player", peerId, error);
      }
    }
  }
  
  // Send player input to the host (client only)
  public sendPlayerInput(input: any) {
    if (this.isHost) return;
    
    // Clients only send to the host
    this.connections.forEach((connection) => {
      if (connection.open) {
        console.log("Sending player input", input.timestamp);
        connection.send({
          type: 'playerInput',
          payload: input
        });
      }
    });
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
    this.connections.forEach((connection) => {
      connection.close();
    });
    
    this.connections.clear();
    
    if (this.peer) {
      this.peer.destroy();
    }
    
    this.peer = null;
  }
} 