const mongoose = require('mongoose');

const MessageSchema = new mongoose.Schema({
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    refPath: 'senderModel'
  },
  senderModel: {
    type: String,
    required: true,
    enum: ['User', 'Propeneer']
  },
  receiver: {
    type: mongoose.Schema.Types.ObjectId,
    required: function() {
      // Only require receiver if sender is Propeneer
      return this.senderModel === 'Propeneer';
    },
    refPath: 'receiverModel'
  },
  receiverModel: {
    type: String,
    required: function() {
      // Only require receiverModel if receiver is set
      return !!this.receiver;
    },
    enum: ['User', 'Propeneer']
  },
  content: {
    type: String,
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  read: {
    type: Boolean,
    default: false
  },
  threadId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  }
});

module.exports = mongoose.model('Message', MessageSchema);