# Chat Application Server Documentation

## Overview
The server component of the chat application is built using Node.js, Express, and Socket.IO. It handles real-time communication, room management, and message persistence.

## Core Dependencies
```javascript
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
```

## Server Configuration
```javascript
const app = express();
app.use(cors());

const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST"]
  }
});
```

## Data Storage Structure
```javascript
const rooms = new Map();           // Active rooms
const roomMessages = new Map();    // Messages for each room
const STORAGE_DIR = path.join(__dirname, 'storage');
const ROOMS_FILE = path.join(STORAGE_DIR, 'rooms.json');
const MESSAGES_DIR = path.join(STORAGE_DIR, 'messages');
```

## Key Components

### 1. Data Persistence

#### Storage Structure
- Rooms are stored in `rooms.json`
- Messages are stored in individual JSON files per room
- Automatic directory creation on server start

#### Data Loading
```javascript
const loadSavedData = () => {
  try {
    if (fs.existsSync(ROOMS_FILE)) {
      const savedRooms = JSON.parse(fs.readFileSync(ROOMS_FILE, 'utf8'));
      savedRooms.forEach(roomName => {
        rooms.set(roomName, new Set());
        const messagesFile = path.join(MESSAGES_DIR, `${roomName}.json`);
        if (fs.existsSync(messagesFile)) {
          const messages = JSON.parse(fs.readFileSync(messagesFile, 'utf8'));
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
```

#### Data Saving
```javascript
const saveRooms = () => {
  try {
    const roomsArray = Array.from(rooms.keys());
    fs.writeFileSync(ROOMS_FILE, JSON.stringify(roomsArray));
  } catch (error) {
    console.error('Error saving rooms:', error);
  }
};

const saveMessages = (roomName) => {
  try {
    const messages = roomMessages.get(roomName) || [];
    const messagesFile = path.join(MESSAGES_DIR, `${roomName}.json`);
    fs.writeFileSync(messagesFile, JSON.stringify(messages));
  } catch (error) {
    console.error('Error saving messages:', error);
  }
};
```

### 2. Socket.IO Event Handlers

#### Connection Events
```javascript
io.on('connection', (socket) => {
  console.log('New client connected');
  socket.emit('roomList', Array.from(rooms.keys()));
});
```

#### Room Management
```javascript
// Create Room
socket.on('createRoom', (roomName) => {
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

// Join Room
socket.on('joinRoom', (roomName) => {
  if (rooms.has(roomName)) {
    socket.join(roomName);
    rooms.get(roomName).add(socket.id);
    socket.emit('roomJoined', roomName);
    const messages = roomMessages.get(roomName) || [];
    socket.emit('previousMessages', messages);
    io.to(roomName).emit('userJoined', socket.id);
  } else {
    socket.emit('error', 'Room does not exist');
  }
});
```

#### Message Handling
```javascript
socket.on('sendMessage', (data) => {
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
  
  const messages = roomMessages.get(room) || [];
  messages.push(messageData);
  roomMessages.set(room, messages);
  
  saveMessages(room);
  io.in(room).emit('message', messageData);
});
```

#### Disconnection Handling
```javascript
socket.on('disconnect', () => {
  rooms.forEach((users, roomName) => {
    if (users.has(socket.id)) {
      users.delete(socket.id);
      if (users.size === 0) {
        io.to(roomName).emit('userLeft', socket.id);
      }
    }
  });
  io.emit('roomList', Array.from(rooms.keys()));
});
```

## Error Handling
- Invalid message data validation
- Room existence checks
- File system operation error handling
- Socket connection error handling

## Security Considerations
- CORS configuration for specific origin
- Input validation for room names and messages
- Error messages for invalid operations

## Setup and Installation

1. Install dependencies:
```bash
npm install express socket.io cors
```

2. Start the server:
```bash
node server.js
```

## Environment Variables
- PORT: Server port (default: 5000)

## Dependencies
- express: Web framework
- socket.io: Real-time communication
- cors: Cross-origin resource sharing
- fs: File system operations (built-in)
- path: Path manipulation (built-in)

## Best Practices
1. Error handling for all operations
2. Data validation before processing
3. Proper cleanup on disconnection
4. Efficient message broadcasting
5. Persistent storage management
6. Logging for debugging 