import { Server } from 'socket.io';
import { createServer } from 'http';
import { v4 as uuidv4 } from 'uuid';

// Player representation
interface Player {
  id: string;
  nickname: string;
  position: { x: number; y: number; z: number };
  rotation: { x: number; y: number; z: number; w: number };
  tricks: {
    currentTrick: string;
    comboScore: number;
    lastTrickTime: number;
  };
}

// Game state
const players: Record<string, Player> = {};

// Create HTTP server
const httpServer = createServer();

// Create Socket.io server
const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Socket.io connection handler
io.on('connection', (socket) => {
  console.log(`New connection: ${socket.id} from ${socket.handshake.address}`);
  
  // Handle player join
  socket.on('player:join', (data: { nickname: string }) => {
    const playerId = socket.id;
    const player: Player = {
      id: playerId,
      nickname: data.nickname || `Player-${playerId.substring(0, 5)}`,
      position: { x: 0, y: 0, z: 0 },
      rotation: { x: 0, y: 0, z: 0, w: 1 },
      tricks: {
        currentTrick: '',
        comboScore: 0,
        lastTrickTime: Date.now()
      }
    };
    
    players[playerId] = player;
    
    // Send the current state to the new player
    socket.emit('game:state', Object.values(players));
    
    // Broadcast new player to all others
    socket.broadcast.emit('player:joined', player);
    
    console.log(`Player joined: ${player.nickname} (${playerId})`);
    console.log(`Total players: ${Object.keys(players).length}`);
  });
  
  // Handle player state update
  socket.on('player:update', (data: {
    position: { x: number, y: number, z: number },
    rotation: { x: number, y: number, z: number, w: number },
    tricks?: {
      currentTrick: string,
      comboScore: number,
      lastTrickTime: number
    }
  }) => {
    const playerId = socket.id;
    const player = players[playerId];
    
    if (player) {
      player.position = data.position;
      player.rotation = data.rotation;
      
      if (data.tricks) {
        player.tricks = data.tricks;
      }
      
      // Broadcast player update to all other clients
      socket.broadcast.emit('player:updated', player);
    }
  });
  
  // Handle player trick performed
  socket.on('player:trick', (data: { trick: string, score: number }) => {
    const playerId = socket.id;
    const player = players[playerId];
    
    if (player) {
      player.tricks.currentTrick = data.trick;
      player.tricks.comboScore += data.score;
      player.tricks.lastTrickTime = Date.now();
      
      // Broadcast trick to all other clients
      socket.broadcast.emit('player:trick', {
        playerId,
        trick: data.trick,
        score: data.score
      });
    }
  });
  
  // Handle disconnection
  socket.on('disconnect', () => {
    const playerId = socket.id;
    const player = players[playerId];
    
    if (player) {
      console.log(`Player left: ${player.nickname}`);
      delete players[playerId];
      
      // Broadcast player left to all clients
      io.emit('player:left', { id: playerId });
    }
  });
});

// Start server
const PORT = process.env.PORT || 3000;
const host = '0.0.0.0'; // Listen on all available network interfaces
httpServer.listen(PORT, () => {
  console.log(`WebSocket server running on http://${host}:${PORT}`);
  console.log(`Connect to this server by selecting "Online" in the game menu`);
}); 