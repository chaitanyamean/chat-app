const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const app = express();
app.use(cors());

// Load environment variables
require('dotenv').config();

const server = http.createServer(app);

const io = socketIo(server, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST"]
  },
});

// Add a basic route to test if server is running
app.get('/', (req, res) => {
  res.send('Server is running');
});

// Add a health check endpoint
app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

// Add error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Something broke!');
});

// Handle 404s
app.use((req, res) => {
  res.status(404).send('Not Found');
});

// Store active rooms and their messages
const rooms = new Map();
const roomMessages = new Map();

// File paths for storage
const STORAGE_DIR = path.join(__dirname, 'storage');
const ROOMS_FILE = path.join(STORAGE_DIR, 'rooms.json');
const MESSAGES_DIR = path.join(STORAGE_DIR, 'messages');

// Ensure storage directory exists
if (!fs.existsSync(STORAGE_DIR)) {
  fs.mkdirSync(STORAGE_DIR);
}
if (!fs.existsSync(MESSAGES_DIR)) {
  fs.mkdirSync(MESSAGES_DIR);
}

// Load saved rooms and messages
const loadSavedData = () => {
  try {
    if (fs.existsSync(ROOMS_FILE)) {
      const savedRooms = JSON.parse(fs.readFileSync(ROOMS_FILE, 'utf8'));
      console.log('Loading saved rooms:', savedRooms);
      
      savedRooms.forEach(roomName => {
        rooms.set(roomName, new Set());
        
        // Load messages for each room
        const messagesFile = path.join(MESSAGES_DIR, `${roomName}.json`);
        if (fs.existsSync(messagesFile)) {
          const messages = JSON.parse(fs.readFileSync(messagesFile, 'utf8'));
          console.log(`Loading messages for room ${roomName}:`, messages);
          roomMessages.set(roomName, messages);
        } else {
          roomMessages.set(roomName, []);
        }
      });
    }
  } catch (error) {
    console.error('Error loading saved data:', error);
  }
};

// Initial load of saved data
loadSavedData();

// Save rooms to file
const saveRooms = () => {
  try {
    const roomsArray = Array.from(rooms.keys());
    console.log('Saving rooms:', roomsArray);
    fs.writeFileSync(ROOMS_FILE, JSON.stringify(roomsArray));
  } catch (error) {
    console.error('Error saving rooms:', error);
  }
};

// Save messages for a room
const saveMessages = (roomName) => {
  try {
    const messages = roomMessages.get(roomName) || [];
    console.log(`Saving messages for room ${roomName}:`, messages);
    const messagesFile = path.join(MESSAGES_DIR, `${roomName}.json`);
    fs.writeFileSync(messagesFile, JSON.stringify(messages));
  } catch (error) {
    console.error('Error saving messages:', error);
  }
};

io.on('connection', (socket) => {
  console.log('New client connected');
  console.log('Current rooms:', Array.from(rooms.keys()));

  // Send existing rooms to the new client
  socket.emit('roomList', Array.from(rooms.keys()));

  // Handle room creation
  socket.on('createRoom', (roomName) => {
    console.log('Creating room:', roomName);
    if (!rooms.has(roomName)) {
      rooms.set(roomName, new Set());
      roomMessages.set(roomName, []);
      socket.join(roomName);
      rooms.get(roomName).add(socket.id);
      socket.emit('roomCreated', roomName);
      io.emit('roomList', Array.from(rooms.keys()));
      saveRooms();
    } else {
      socket.emit('error', 'Room already exists');
    }
  });

  // Handle joining a room
  socket.on('joinRoom', (roomName) => {
    console.log('Joining room:', roomName);
    if (rooms.has(roomName)) {
      socket.join(roomName);
      rooms.get(roomName).add(socket.id);
      socket.emit('roomJoined', roomName);
      
      // Send existing messages for the room
      const messages = roomMessages.get(roomName) || [];
      console.log(`Sending previous messages for room ${roomName}:`, messages);
      socket.emit('previousMessages', messages);
      
      io.to(roomName).emit('userJoined', socket.id);
    } else {
      socket.emit('error', 'Room does not exist');
    }
  });

  // Handle messages
  socket.on('sendMessage', (data) => {
    console.log('Received message data:', data);
    const { room, message, username } = data;
    
    if (!room || !message || !username) {
      console.error('Invalid message data:', data);
      return;
    }

    const messageData = {
      user: username,
      text: message,
      time: new Date().toLocaleTimeString()
    };
    
    // Store message in room messages
    const messages = roomMessages.get(room) || [];
    messages.push(messageData);
    roomMessages.set(room, messages);
    
    // Save messages to file
    saveMessages(room);
    
    // Broadcast to all clients in the room
    console.log('Broadcasting message to room:', room, messageData);
    console.log("messageData",messageData)
    io.to(room).emit('message', messageData);
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
    rooms.forEach((users, roomName) => {
      if (users.has(socket.id)) {
        users.delete(socket.id);
        if (users.size === 0) {
          // Don't delete the room, just remove the user
          io.to(roomName).emit('userLeft', socket.id);
        }
      }
    });
    io.emit('roomList', Array.from(rooms.keys()));
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 