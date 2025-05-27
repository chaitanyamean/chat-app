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

console.log(import.meta.env.VITE_BACKEND_URL);
const socket = io(import.meta.env.VITE_BACKEND_URL, {
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
  transports: ['polling', 'websocket'],  
  path: '/socket.io/',
  withCredentials: true,
  secure: true,
  rejectUnauthorized: false
});

function Chat() {
  const [username, setUsername] = useState(() => {
    return localStorage.getItem('username') || '';
  });
  const [tempUsername, setTempUsername] = useState('');
  const [room, setRoom] = useState('');
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [currentRoom, setCurrentRoom] = useState(() => {
    return localStorage.getItem('currentRoom') || '';
  });
  const [error, setError] = useState('');
  const messagesEndRef = useRef(null);
  const socketRef = useRef(socket);

  // Socket event listeners
  useEffect(() => {
    console.log('Setting up socket listeners');
    console.log('Backend URL:', import.meta.env.VITE_BACKEND_URL);
    
    const socket = socketRef.current;
    console.log('Socket connected:', socket.connected);

   // Test backend connection
   fetch(`${import.meta.env.VITE_BACKEND_URL}/health`)
   .then(response => response.text())
   .then(data => console.log('Backend health check:', data))
   .catch(error => console.error('Backend health check failed:', error));

    socket.on('connect_error', (error) => {
      console.error('Connection Error:', error);
      // Try to reconnect with polling if websocket fails
      if (socket.io.opts.transports[0] === 'websocket') {
        socket.io.opts.transports = ['polling', 'websocket'];
      }
    });

    socket.on('connect', () => {
      console.log('Socket connected');
      if (currentRoom) {
        console.log('Rejoining room after connection:', currentRoom);
        socket.emit('joinRoom', currentRoom);
      }
    });

    socket.on('disconnect', () => {
      console.log('Socket disconnected');
    });

    socket.on('message', (message) => {
      console.log('Received new message:', message);
      setMessages((prevMessages) => [...prevMessages, message]);
    });

    socket.on('previousMessages', (previousMessages) => {
      console.log('Received previous messages:', previousMessages);
      setMessages(previousMessages);
    });

    socket.on('roomList', (roomList) => {
      console.log('Received room list:', roomList);
      setRooms(roomList);
    });

    socket.on('error', (errorMsg) => {
      console.error('Received error:', errorMsg);
      setError(errorMsg);
    });

    // If we have a current room from localStorage, join it
    if (currentRoom) {
      console.log('Joining saved room:', currentRoom);
      socket.emit('joinRoom', currentRoom);
    }

    return () => {
      console.log('Cleaning up socket listeners');
      socket.off('connect');
      socket.off('disconnect');
      socket.off('message');
      socket.off('previousMessages');
      socket.off('roomList');
      socket.off('error');
      socket.off('connect_error');
    };
  }, [currentRoom]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    console.log('Messages updated:', messages);
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const createRoom = () => {
    if (room && username) {
      console.log('Creating room:', room);
      socketRef.current.emit('createRoom', room);
      setCurrentRoom(room);
      localStorage.setItem('currentRoom', room);
      setError('');
    }
  };

  const onJoinChat = () => {
    if (tempUsername) {
      console.log('Joining chat as:', tempUsername);
      setUsername(tempUsername);
      localStorage.setItem('username', tempUsername);
    }
  };

  const joinRoom = (roomName) => {
    if (username) {
      console.log('Joining room:', roomName);
      socketRef.current.emit('joinRoom', roomName);
      setCurrentRoom(roomName);
      localStorage.setItem('currentRoom', roomName);
      setError('');
    }
  };

  const sendMessage = (e) => {
    e.preventDefault();
    if (message && currentRoom && username) {
      const messageData = {
        room: currentRoom,
        message,
        username,
      };
      console.log('Sending message:', messageData);
      socketRef.current.emit('sendMessage', messageData);
      setMessage('');
    }
  };

  return (
    <Container maxWidth="md" sx={{ mt: 4 }}>
      <Paper elevation={3} sx={{ p: 3 }}>
        {!username ? (
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
        ) : (
          <>
            <Typography variant="h5" gutterBottom>
              Welcome, {username}!
            </Typography>
            {!currentRoom ? (
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
            ) : (
              <Box>
                <Typography variant="h6" gutterBottom>
                  Room: {currentRoom}
                </Typography>
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
                <form onSubmit={sendMessage}>
                  <TextField
                    fullWidth
                    label="Type a message"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    sx={{ mb: 2 }}
                  />
                  <Button
                    type="submit"
                    variant="contained"
                    disabled={!message}
                  >
                    Send
                  </Button>
                </form>
              </Box>
            )}
            {error && (
              <Typography color="error" sx={{ mt: 2 }}>
                {error}
              </Typography>
            )}
            <Divider sx={{ my: 2 }} />
            <Typography variant="h6" gutterBottom>
              Available Rooms
            </Typography>
            <List>
              {rooms.map((roomName) => (
                <ListItem key={roomName}>
                  <ListItemText primary={roomName} />
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={() => joinRoom(roomName)}
                  >
                    Join
                  </Button>
                </ListItem>
              ))}
            </List>
          </>
        )}
      </Paper>
    </Container>
  );
}

export default Chat; 