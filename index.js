const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const cors = require('cors');
``;
const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, addDoc, query, orderBy, limit } = require('firebase/firestore');

const app = express();
app.use(cors());
const server = http.createServer(app);
const io = socketIO(server, {
  cors: {
    origin: '*',
  },
});

// Firebase configuration
const firebaseConfig = {
  apiKey: 'AIzaSyADbMs8VN6Y_jWyWZrpWRh1u8akDlN0E64',
  authDomain: 'rabbits-a0ddb.firebaseapp.com',
  projectId: 'rabbits-a0ddb',
  storageBucket: 'rabbits-a0ddb.appspot.com',
  messagingSenderId: '735858540702',
  appId: '1:735858540702:web:e346e753462af482eb3b8f',
};

// Initialize Firebase
const firebaseApp = initializeApp(firebaseConfig);
const db = getFirestore(firebaseApp);

// Store connected clients
const clients = new Set();
let onlineUsers = 0;

// Broadcast messages to all connected clients
async function broadcastMessage(message) {
  io.emit('chatMessage', message);

  // Store the message in Firebase Firestore
  try {
    await addDoc(collection(db, 'rabbits'), message);
    console.log('Message added to Firestore');
  } catch (error) {
    console.log('Error adding message to Firestore', error);
  }
}

// Function to emit updated user count to all clients
function updateOnlineUsersCount() {
  io.emit('onlineUsersCount', onlineUsers);
  console.log('Total online users:', onlineUsers);
}

io.on('connection', async (socket) => {
  // Add the new client to the set
  clients.add(socket);
  onlineUsers = clients.size;

  updateOnlineUsersCount();

  try {
    // Fetch the last 100 chat messages from Firestore
    const querySnapshot = await getDocs(query(collection(db, 'rabbits'), orderBy('timestamp'), limit(100)));
    const messages = [];
    querySnapshot.forEach((doc) => {
      messages.push(doc.data());
    });

    // Send the past 100 chat messages to the newly connected user
    socket.emit('pastChatMessages', messages);
  } catch (error) {
    console.error('Error fetching past chat messages:', error);
  }

  // Handle messages from the client
  socket.on('chatMessage', (message) => {
    // Broadcast the message to all clients
    broadcastMessage(message);
  });

  // Handle client disconnection
  socket.on('disconnect', () => {
    // Remove the client from the set
    clients.delete(socket);
    onlineUsers = clients.size;
    updateOnlineUsersCount();
  });
});

server.listen(8080, () => {
  console.log('Socket.io server started on port 8080');
});
