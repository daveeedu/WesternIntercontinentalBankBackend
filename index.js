const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const cors = require('cors');
const http = require('http');
const socketio = require('socket.io');

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = socketio(server, {
  cors: {
    origin: [process.env.CLIENT_NAME, process.env.FAT_NAME, process.env.LOCAL_CLIENTNAME, process.env.LOCAL_CLIENT_NAME],
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 5000;

// CORS Configuration
const corsOptions = {
  origin: [process.env.CLIENT_NAME, process.env.FAT_NAME, process.env.LOCAL_CLIENTNAME, process.env.LOCAL_CLIENT_NAME],
};
app.use(cors(corsOptions));
app.use(express.json());

// Database Connection
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB Connected'))
  .catch(err => console.log(err));

// Socket.io connection
io.on('connection', (socket) => {
  console.log('New client connected');
  
  // Join a room based on user ID
  socket.on('join', (userId) => {
    socket.join(userId);
    console.log(`User ${userId} joined their room`);
  });
  
  // Handle chat messages
  socket.on('sendMessage', async ({ senderId, receiverId, message }) => {
    try {
      // Save message to database (you'll need to create a Message model)
      const newMessage = new Message({
        sender: senderId,
        receiver: receiverId,
        content: message,
        timestamp: new Date()
      });
      await newMessage.save();
      
      // Emit to the receiver
      io.to(receiverId).emit('receiveMessage', {
        senderId,
        message,
        timestamp: new Date()
      });
      
      // Also emit back to sender for their own UI update
      io.to(senderId).emit('receiveMessage', {
        senderId,
        message,
        timestamp: new Date()
      });
    } catch (error) {
      console.error('Error sending message:', error);
    }
  });
  
  socket.on('disconnect', () => {
    console.log('Client disconnected');
  });
});

// Routes
app.get('/', (req, res) => {
  res.send('Banking API');
});

const propeneerRoutes = require('./routes/propeneerRoutes');
const paymentRoute = require('./routes/paymentRoute');
const userRoutes = require('./routes/userRoutes');
const transactionRoutes = require('./routes/transactionRoutes');
const chatRoutes = require('./routes/chatRoutes'); 

app.use('/admin', propeneerRoutes);
app.use('/payment', paymentRoute);
app.use('/user', userRoutes);
app.use('/transactions', transactionRoutes);
app.use('/chat', chatRoutes);

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});