const express = require("express");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const cors = require("cors");
const http = require("http");
const socketio = require("socket.io");
const Message = require("./models/Message");
const { validateSocketAuth } = require("./middleware/socketAuth");
const sanitizeHtml = require("sanitize-html");

dotenv.config();

const app = express();
const server = http.createServer(app);

const io = socketio(server, {
  cors: {
    origin: [
      process.env.CLIENT_NAME,
      process.env.FAT_NAME,
      process.env.LOCAL_CLIENTNAME,
      process.env.LOCAL_CLIENT_NAME,
    ],
    methods: ["GET", "POST"],
    credentials: true,
  },
  connectionStateRecovery: {
    maxDisconnectionDuration: 2 * 60 * 1000, // 2 minutes
    skipMiddlewares: true,
  },
});

const PORT = process.env.PORT || 5000;

// CORS Configuration
const corsOptions = {
  origin: [
    process.env.CLIENT_NAME,
    process.env.FAT_NAME,
    process.env.LOCAL_CLIENTNAME,
    process.env.LOCAL_CLIENT_NAME,
  ],
  optionsSuccessStatus: 200,
};
app.use(cors(corsOptions));
app.use(express.json());

// Database Connection with improved settings
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB Connected"))
  .catch((err) => {
    console.error("MongoDB connection error:", err);
    process.exit(1);
  });

// Socket.IO Authentication Middleware
io.use((socket, next) => {
  validateSocketAuth(socket, next);
});

// Socket.io connection with enhanced features
io.on("connection", (socket) => {
  console.log(`New client connected: ${socket.id}`);

  // Handle disconnections
  socket.on("disconnect", (reason) => {
    console.log(`Client disconnected: ${socket.id}, Reason: ${reason}`);
  });

  // Error handling
  socket.on("error", (error) => {
    console.error(`Socket error (${socket.id}):`, error);
  });

  // Typing indicators
  let typingTimeout;
  socket.on("typing", ({ room, isTyping }) => {
    socket.to(room).emit("typing", {
      userId: socket.user?._id || socket.handshake.auth.sessionId,
      isTyping,
    });

    clearTimeout(typingTimeout);
    if (isTyping) {
      typingTimeout = setTimeout(() => {
        socket.to(room).emit("typing", {
          userId: socket.user?._id || socket.handshake.auth.sessionId,
          isTyping: false,
        });
      }, 3000);
    }
  });

  // Handle room joins with validation
  socket.on("join", async ({ userId, sessionId }, callback) => {
    try {
      if (!userId && !sessionId) {
        throw new Error("Either userId or sessionId must be provided");
      }

      const room = userId ? `user_${userId}` : `anon_${sessionId}`;
      socket.join(room);

      console.log(
        `${userId ? "User" : "Anonymous session"} joined room: ${room}`
      );

      if (callback) callback({ status: "success", room });
    } catch (error) {
      console.error("Join error:", error);
      if (callback) callback({ status: "error", message: error.message });
    }
  });

  // Enhanced message handling
  socket.on(
    "sendMessage",
    async ({ senderId, sessionId, receiverId, message }, callback) => {
      try {
        // Validate message content
        if (!message?.trim()) {
          throw new Error("Message content is required");
        }

        // For anonymous messages, ensure sessionId exists
        if (!senderId && !sessionId) {
          throw new Error("Session ID is required for anonymous messages");
        }

        // Sanitize message content
        const cleanContent = sanitizeHtml(message.trim(), {
          allowedTags: [],
          allowedAttributes: {},
        });

        // Determine sender type
        let senderType = null;
        let senderRef = null;

        if (senderId) {
          senderType =
            socket.handshake.auth.role === "propeneer" ? "Propeneer" : "User";
          senderRef = senderId;
        }

        // Set isSupport flag - true for propeneer messages
        const isSupport =
          senderType === "Propeneer" ||
          socket.handshake.auth.role === "propeneer";

        // Create and save message
        const newMessage = new Message({
          sender: senderRef,
          senderModel: senderType,
          sessionId: sessionId,
          receiver: receiverId || "propeneer",
          content: cleanContent,
          timestamp: new Date(),
          threadId: sessionId || senderId,
          isSupport: isSupport,
        });

        await newMessage.save();

        // Determine rooms for emission
        let targetRoom;

        // Handle anonymous chat rooms specially
        if (receiverId && receiverId.startsWith("anon_")) {
          // If it's a direct reference to an anonymous room
          targetRoom = receiverId;
        } else if (sessionId) {
          // Anonymous user's room
          targetRoom = `anon_${sessionId}`;
        } else if (receiverId) {
          // Regular user's room
          targetRoom = `user_${receiverId}`;
        } else {
          // Default room for support team
          targetRoom = "propeneers";
        }

        const senderRoom = senderId
          ? `user_${senderId}`
          : sessionId
          ? `anon_${sessionId}`
          : "propeneers";

        // Emit to recipient(s)
        io.to(targetRoom).emit("receiveMessage", newMessage);

        // Echo back to sender if different from receiver
        if (targetRoom !== senderRoom) {
          io.to(senderRoom).emit("receiveMessage", newMessage);
        }

        // Acknowledge successful send
        if (callback)
          callback({
            status: "success",
            messageId: newMessage._id,
            isSupport: newMessage.isSupport,
            timestamp: newMessage.timestamp,
          });
      } catch (error) {
        console.error("Message send error:", error);
        if (callback)
          callback({
            status: "error",
            message: error.message || "Failed to send message",
          });
      }
    }
  );
});

// Routes
app.get("/", (req, res) => {
  res.send("Banking API");
});

// Making io instance available to routes
app.set("socketio", io);

const propeneerRoutes = require("./routes/propeneerRoutes");
const paymentRoute = require("./routes/paymentRoute");
const userRoutes = require("./routes/userRoutes");
const transactionRoutes = require("./routes/transactionRoutes");
const chatRoutes = require("./routes/chatRoutes");
const anonymousChatRoutes = require("./routes/anonymousChatRoutes");

app.use("/propeneer", propeneerRoutes);
app.use("/payment", paymentRoute);
app.use("/user", userRoutes);
app.use("/transactions", transactionRoutes);
app.use("/chat", chatRoutes);
app.use("/anonymous", anonymousChatRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error("Global error handler:", err);
  res.status(500).json({
    error: "Internal server error",
    message: err.message,
  });
});

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
