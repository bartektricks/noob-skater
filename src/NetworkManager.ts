import Peer, { DataConnection } from 'peerjs';

export interface NetworkManagerEvents {
  onConnected: (peerId: string) => void;
  onDisconnected: () => void;
  onError: (error: string) => void;
  onGameStateReceived: (gameState: any) => void;
  onPlayerInputReceived: (input: any) => void;
}

export class NetworkManager {
  private peer: Peer | null = null;
  private connection: DataConnection | null = null;
  private isHost: boolean = false;
  private events: NetworkManagerEvents;
  
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
          this.connection = conn;
          
          this.setupConnectionHandlers();
          this.events.onConnected(conn.peer);
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
        
        this.connection = this.peer.connect(hostId);
        
        this.connection.on('open', () => {
          console.log('Connected to host:', hostId);
          this.setupConnectionHandlers();
          this.events.onConnected(hostId);
          resolve();
        });
        
        this.connection.on('error', (err) => {
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
  
  private setupConnectionHandlers() {
    if (!this.connection) return;
    
    this.connection.on('data', (data: any) => {
      console.log("Received data:", data.type, data);
      
      // Handle different types of messages
      if (data.type === 'gameState') {
        this.events.onGameStateReceived(data.payload);
      } else if (data.type === 'playerInput') {
        this.events.onPlayerInputReceived(data.payload);
      }
    });
    
    this.connection.on('close', () => {
      console.log('Connection closed');
      this.connection = null;
      this.events.onDisconnected();
    });
  }
  
  // Send game state (typically called by host)
  public sendGameState(gameState: any) {
    if (this.connection && this.isHost) {
      console.log("Sending game state", gameState.timestamp);
      this.connection.send({
        type: 'gameState',
        payload: gameState
      });
    }
  }
  
  // Send player input (typically called by client)
  public sendPlayerInput(input: any) {
    if (this.connection && !this.isHost) {
      console.log("Sending player input", input.timestamp);
      this.connection.send({
        type: 'playerInput',
        payload: input
      });
    }
  }
  
  // Check if connected to peer
  public isConnected(): boolean {
    return this.connection !== null && this.connection.open;
  }
  
  // Check if this instance is the host
  public getIsHost(): boolean {
    return this.isHost;
  }
  
  // Close connection and cleanup
  public disconnect() {
    if (this.connection) {
      this.connection.close();
    }
    
    if (this.peer) {
      this.peer.destroy();
    }
    
    this.connection = null;
    this.peer = null;
  }
} 