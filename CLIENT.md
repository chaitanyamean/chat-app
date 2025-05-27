# Chat Application Client Documentation

## Overview
The client component is a React application built with Material-UI that provides the user interface for the chat application. It handles real-time communication with the server, user interactions, and local state management.

## Core Dependencies
```javascript
import React, { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import {
  Box,
  Container,
  TextField,
  Button,
  Typography,
  Paper,
  List,
  ListItem,
  ListItemText,
  Divider,
} from '@mui/material';
```

## Socket Configuration
```javascript
const socket = io('http://localhost:5000', {
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000
});
```

## State Management
```javascript
const [username, setUsername] = useState(() => localStorage.getItem('username') || '');
const [tempUsername, setTempUsername] = useState('');
const [room, setRoom] = useState('');
const [message, setMessage] = useState('');
const [messages, setMessages] = useState([]);
const [rooms, setRooms] = useState([]);
const [currentRoom, setCurrentRoom] = useState(() => localStorage.getItem('currentRoom') || '');
const [error, setError] = useState('');
```

## Key Components

### 1. Socket Event Management
```javascript
useEffect(() => {
  const socket = socketRef.current;

  socket.on('connect', () => {
    if (currentRoom) {
      socket.emit('joinRoom', currentRoom);
    }
  });

  socket.on('message', (message) => {
    setMessages((prevMessages) => [...prevMessages, message]);
  });

  socket.on('previousMessages', (previousMessages) => {
    setMessages(previousMessages);
  });

  socket.on('roomList', (roomList) => {
    setRooms(roomList);
  });

  socket.on('error', (errorMsg) => {
    setError(errorMsg);
  });

  return () => {
    socket.off('connect');
    socket.off('message');
    socket.off('previousMessages');
    socket.off('roomList');
    socket.off('error');
  };
}, [currentRoom]);
```

### 2. Message Handling
```javascript
const sendMessage = (e) => {
  e.preventDefault();
  if (message && currentRoom && username) {
    const messageData = {
      room: currentRoom,
      message,
      username,
    };
    socketRef.current.emit('sendMessage', messageData);
    setMessage('');
  }
};
```

### 3. Room Management
```javascript
const createRoom = () => {
  if (room && username) {
    socketRef.current.emit('createRoom', room);
    setCurrentRoom(room);
    localStorage.setItem('currentRoom', room);
    setError('');
  }
};

const joinRoom = (roomName) => {
  if (username) {
    socketRef.current.emit('joinRoom', roomName);
    setCurrentRoom(roomName);
    localStorage.setItem('currentRoom', roomName);
    setError('');
  }
};
```

### 4. UI Components

#### Username Input
```javascript
<Box sx={{ mb: 3 }}>
  <TextField
    fullWidth
    label="Enter your username"
    value={tempUsername}
    onChange={(e) => setTempUsername(e.target.value)}
    sx={{ mb: 2 }}
  />
  <Button
    variant="contained"
    onClick={onJoinChat}
    disabled={!tempUsername}
  >
    Join Chat
  </Button>
</Box>
```

#### Room Management Interface
```javascript
<Box sx={{ mb: 3 }}>
  <TextField
    fullWidth
    label="Create or Join Room"
    value={room}
    onChange={(e) => setRoom(e.target.value)}
    sx={{ mb: 2 }}
  />
  <Button
    variant="contained"
    onClick={createRoom}
    disabled={!room}
    sx={{ mr: 2 }}
  >
    Create Room
  </Button>
  <Button
    variant="outlined"
    onClick={() => joinRoom(room)}
    disabled={!room}
  >
    Join Room
  </Button>
</Box>
```

#### Message Display
```javascript
<Paper
  elevation={2}
  sx={{
    height: '400px',
    overflow: 'auto',
    mb: 2,
    p: 2,
  }}
>
  <List>
    {messages.map((msg, index) => (
      <ListItem key={index}>
        <ListItemText
          primary={msg.text}
          secondary={`${msg.user} - ${msg.time}`}
        />
      </ListItem>
    ))}
    <div ref={messagesEndRef} />
  </List>
</Paper>
```

## Features

### 1. Persistence
- Username stored in localStorage
- Current room stored in localStorage
- Automatic room rejoining on page load

### 2. Real-time Updates
- Automatic message updates
- Room list updates
- User join/leave notifications

### 3. Error Handling
- Socket connection errors
- Room creation/joining errors
- Message sending errors

### 4. UI/UX Features
- Auto-scrolling messages
- Disabled states for invalid actions
- Clear error messaging
- Responsive design using Material-UI

## Setup and Installation

1. Install dependencies:
```bash
npm install react socket.io-client @mui/material @emotion/react @emotion/styled
```

2. Start the development server:
```bash
npm start
```

## Dependencies
- react: UI library
- socket.io-client: Real-time communication
- @mui/material: UI components
- @emotion/react: CSS-in-JS
- @emotion/styled: Styled components

## Best Practices
1. Functional components with hooks
2. Proper cleanup of socket listeners
3. Local storage for persistence
4. Error handling and user feedback
5. Responsive design
6. Code organization and readability

## Component Structure
```
Chat/
├── State Management
│   ├── User State
│   ├── Room State
│   └── Message State
├── Socket Events
│   ├── Connection
│   ├── Messages
│   └── Room Management
├── UI Components
│   ├── Username Input
│   ├── Room Management
│   ├── Message Display
│   └── Error Notifications
└── Utility Functions
    ├── Message Handling
    ├── Room Management
    └── Local Storage
``` 