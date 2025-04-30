// routes/chatRoutes.js
const express = require("express");
const router = express.Router();
const chatController = require("../controllers/chatController");
const { authenticate } = require("../middleware/auth");

// User Thread Management
router.get(
  "/user/:userId/threads",
  authenticate,
  chatController.getUserThreads
);
router.post(
  "/user/:userId/thread",
  authenticate,
  chatController.createUserThread
);

// Message Handling
router.post("/user/:userId/send", authenticate, chatController.sendUserMessage);
router.get("/thread/:threadId", authenticate, chatController.getChatHistory);
router.put(
  "/thread/:threadId/mark-read",
  authenticate,
  chatController.markAsRead
);

// Propeneer Endpoints
router.get(
  "/propeneer/threads",
  authenticate,
  chatController.getPropeneerThreads
);
router.get(
  "/anonymous/threads",
  authenticate,
  chatController.getAnonymousThreads
);
router.post(
  "/propeneer/reply/:threadId",
  authenticate,
  chatController.sendPropeneerReply
);

// New route for anonymous replies
router.post(
  "/propeneer/reply/anonymous/:sessionId",
  authenticate,
  chatController.sendPropeneerReplyToAnonymous
);

module.exports = router;
