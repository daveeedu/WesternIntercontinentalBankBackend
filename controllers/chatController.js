const mongoose = require("mongoose");
const Message = require("../models/Message");
const User = require("../models/User");
const Propeneer = require("../models/Propeneer");

// Get all message threads for a user
exports.getUserThreads = async (req, res) => {
  try {
    const { userId } = req.params;

    // Verify user exists
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Get all unique threads for the user
    const threads = await Message.aggregate([
      {
        $match: {
          $or: [
            { sender: new mongoose.Types.ObjectId(userId) },
            { receiver: new mongoose.Types.ObjectId(userId) },
          ],
        },
      },
      {
        $group: {
          _id: "$threadId",
          lastMessage: { $last: "$$ROOT" },
          unreadCount: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ["$receiver", new mongoose.Types.ObjectId(userId)] },
                    { $eq: ["$read", false] },
                  ],
                },
                1,
                0,
              ],
            },
          },
        },
      },
      {
        $sort: { "lastMessage.timestamp": -1 },
      },
      {
        $lookup: {
          from: "propeneers",
          localField: "lastMessage.sender",
          foreignField: "_id",
          as: "propeneer",
        },
      },
      {
        $unwind: {
          path: "$propeneer",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "lastMessage.sender",
          foreignField: "_id",
          as: "user",
        },
      },
      {
        $unwind: {
          path: "$user",
          preserveNullAndEmptyArrays: true,
        },
      },
    ]);

    // If no threads exist, return an empty array
    res.status(200).json(threads);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Create a new thread for user
exports.createUserThread = async (req, res) => {
  try {
    const { userId } = req.params;

    // Verify user exists
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Create a new thread
    const newThread = {
      threadId: new mongoose.Types.ObjectId(),
      createdAt: new Date(),
      userId: user._id,
    };

    // In a real implementation, you might want to save this to a Threads collection
    // For now we'll just return the thread ID
    res.status(201).json({
      _id: newThread.threadId,
      userId: user._id,
      createdAt: newThread.createdAt,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

//getPropeneerThreads - Get all user threads (not limited to specific propeneer)
exports.getPropeneerThreads = async (req, res) => {
  try {
    // Get all threads where sender is a user (not propeneer)
    const threads = await Message.aggregate([
      {
        $match: {
          senderModel: "User", // Only get threads started by users
        },
      },
      {
        $group: {
          _id: "$threadId",
          lastMessage: { $last: "$$ROOT" },
          unreadCount: {
            $sum: {
              $cond: [{ $eq: ["$read", false] }, 1, 0],
            },
          },
        },
      },
      {
        $sort: { "lastMessage.timestamp": -1 },
      },
      {
        $lookup: {
          from: "users",
          localField: "lastMessage.sender",
          foreignField: "_id",
          as: "user",
        },
      },
      {
        $unwind: {
          path: "$user",
          preserveNullAndEmptyArrays: true,
        },
      },
    ]);

    res.status(200).json(threads);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get chat history for a specific thread
exports.getChatHistory = async (req, res) => {
  try {
    const { threadId } = req.params;

    const messages = await Message.find({ threadId })
      .sort({ timestamp: 1 })
      .populate([
        {
          path: "sender",
          select: "firstName lastName profileImage username",
          options: { strictPopulate: false },
        },
        {
          path: "receiver",
          select: "firstName lastName profileImage username",
          options: { strictPopulate: false },
        },
      ]);

    res.status(200).json(messages);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// User sends a message to support
exports.sendUserMessage = async (req, res) => {
  try {
    const { userId } = req.params;
    const { content, threadId } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const message = new Message({
      sender: userId,
      senderModel: "User",
      // Receiver is initially null - will be set when propeneer replies
      receiver: null,
      receiverModel: null,
      content,
      threadId: threadId || new mongoose.Types.ObjectId(), // Use existing or create new
    });

    await message.save();

    // Populate sender info for the response
    const populatedMessage = await Message.populate(message, {
      path: "sender",
      select: "firstName lastName profileImage",
    });

    res.status(201).json(populatedMessage);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Propeneer replies to a thread
exports.sendPropeneerReply = async (req, res) => {
  try {
    const { threadId } = req.params;
    const { content } = req.body;
    const propeneerId = req.user.id;

    // Find any message in the thread to get the user
    const threadMessage = await Message.findOne({ threadId });
    if (!threadMessage) {
      return res.status(404).json({ error: "Thread not found" });
    }

    const message = new Message({
      sender: propeneerId,
      senderModel: "Propeneer",
      receiver: threadMessage.sender, // Original message sender (user)
      receiverModel: "User",
      content,
      threadId,
    });

    await message.save();

    res.status(201).json(message);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getAnonymousThreads = async (req, res) => {
  try {
    // Get all unique anonymous sessions with messages
    const sessions = await Message.aggregate([
      { $match: { sessionId: { $exists: true } } },
      { $group: { _id: "$sessionId", lastMessage: { $last: "$$ROOT" } } },
      { $sort: { "lastMessage.timestamp": -1 } },
    ]);

    res.json(
      sessions.map((s) => ({
        _id: s._id,
        sessionId: s._id,
        lastMessage: s.lastMessage,
        isAnonymous: true,
      }))
    );
  } catch (error) {
    res.status(500).json({ message: "Error fetching anonymous threads" });
  }
};

exports.sendPropeneerReplyToAnonymous = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { content } = req.body;

    const message = new Message({
      sender: req.propeneer._id,
      senderModel: "Propeneer",
      sessionId,
      content,
      timestamp: new Date(),
    });

    await message.save();

    // Emit via socket
    if (req.app.get("socketio")) {
      req.app.get("socketio").to(sessionId).emit("receiveMessage", message);
    }

    res.status(201).json(message);
  } catch (error) {
    res.status(500).json({ message: "Error sending reply" });
  }
};

// Mark messages as read
exports.markAsRead = async (req, res) => {
  try {
    const { threadId, userId } = req.params;

    await Message.updateMany(
      {
        threadId,
        receiver: userId,
        read: false,
      },
      { $set: { read: true } }
    );

    res.status(200).json({ message: "Messages marked as read" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
