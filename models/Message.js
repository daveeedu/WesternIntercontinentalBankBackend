// models/Message.js
const mongoose = require("mongoose");

const MessageSchema = new mongoose.Schema({
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    required: false, // Not required for anonymous messages
    refPath: "senderModel",
  },
  senderModel: {
    type: String,
    required: function () {
      return !!this.sender; // Only required if sender exists
    },
    enum: ["User", "Propeneer"],
  },
  sessionId: {
    type: String,
    required: function () {
      return !this.sender; // Required for anonymous messages
    },
    index: true,
  },
  receiver: {
    type: mongoose.Schema.Types.Mixed,
    required: false,
  },
  content: {
    type: String,
    required: true,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
  read: {
    type: Boolean,
    default: false,
  },
  threadId: {
    type: mongoose.Schema.Types.Mixed,
    required: true,
  },
  isSupport: {
    type: Boolean,
    default: false,
  },
});

module.exports = mongoose.model("Message", MessageSchema);
