// routes/anonymousChatRoutes.js
const express = require("express");
const router = express.Router();
const Message = require("../models/Message");
const {
  generateAnonymousSession,
  anonymousLimiter,
} = require("../middleware/auth");

// Get messages for anonymous session
router.get("/:sessionId", generateAnonymousSession, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const skip = parseInt(req.query.skip) || 0;
    
    const messages = await Message.find({
      $or: [
        { sessionId: req.params.sessionId },
        { sessionId: req.session.anonId },
        { receiver: req.params.sessionId },
        { receiver: req.session.anonId }
      ]
    })
    .sort("timestamp")
    .skip(skip)
    .limit(limit);
    
    res.json(messages); 
  } catch (error) {
    console.error("Error fetching messages:", error);
    res.status(500).json({ message: "Error fetching messages" });
  }
});

// Send message as anonymous
router.post(
  "/:sessionId/send",
  generateAnonymousSession,
  anonymousLimiter,
  async (req, res) => {
    try {
      const { content } = req.body;

      const newMessage = new Message({
        sessionId: req.session.anonId,
        content,
        timestamp: new Date(),
        isSupport: false,
        threadId: req.session.anonId, // Use sessionId as threadId for anonymous chats
        receiver: "propeneer" // Generic receiver for support team
      });

      await newMessage.save();
      
      // Emit via socket if available
      if (req.app.get('socketio')) {
        req.app.get('socketio').to('propeneers').emit('receiveMessage', {
          ...newMessage.toObject(),
          receiver: 'propeneers'
        });
      }
      
      res.status(201).json(newMessage);
    } catch (error) {
      console.error("Error sending message:", error);
      res.status(500).json({ message: "Error sending message" });
    }
  }
);

module.exports = router;