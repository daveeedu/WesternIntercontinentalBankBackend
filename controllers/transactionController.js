const Transaction = require("../models/Transaction");
const Propeneer = require("../models/Propeneer");
const User = require("../models/User");
const mongoose = require("mongoose");

// Function to generate random ObjectId
const generateRandomObjectId = () => {
  return new mongoose.Types.ObjectId();
};

// Transfer Funds
exports.transferFunds = async (req, res) => {
  try {
    const { receiverAccountNumber, amount } = req.body;
    const senderId = req.user.id;

    // Find sender and receiver
    const sender = await Propeneer.findById(senderId);
    const receiver = await User.findOne({
      accountNumber: receiverAccountNumber,
    });

    if (!sender || !receiver) {
      return res.status(404).json({ message: "Sender or receiver not found" });
    }

    // Update  receivers balance

    receiver.balance += amount;

    // Create a new transaction
    const transaction = new Transaction({
      sender: sender._id,
      receiver: receiver._id,
      amount,
      status: "Completed",
    });

    // Save changes
    await sender.save();
    await receiver.save();
    await transaction.save();

    res.status(200).json({ message: "Transfer successful", transaction });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get all transactions for the logged-in user
exports.getUserTransactions = async (req, res) => {
  try {
    const userId = req.user.id;

    // Find transactions where the user is either the sender or receiver
    const transactions = await Transaction.find({
      $or: [{ sender: userId }, { receiver: userId }],
    })
      .populate({
        path: "sender",
        model: Propeneer, // Using the Propeneer model for sender
        select: "username email", // choose fields to populate
      })
      .populate({
        path: "receiver",
        model: User, // Using the User model for receiver
        select: "firstName lastName email", // choose fields to populate
      })
      .sort({ date: -1 }); // Sort by date (newest first)

    res.status(200).json({ transactions });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get all transactions (for propeneer dashboard)
exports.getAllTransactions = async (req, res) => {
  try {
    const transactions = await Transaction.find()
      .populate({
        path: "sender",
        model: "Propeneer",
        select: "username email",
      })
      .populate({
        path: "receiver",
        model: "User",
        select: "firstName lastName email accountNumber",
      })
      .sort({ date: -1 });

    res.status(200).json({ transactions });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.simulateTransfer = async (req, res) => {
  try {
    const { amount, recipientName } = req.body;
    const senderId = req.user.id;

    // Find sender (user)
    const sender = await User.findById(senderId);

    if (!sender) {
      return res.status(404).json({ message: "Sender not found" });
    }

    // Validate sender has sufficient balance
    if (sender.balance < amount) {
      return res.status(400).json({ message: "Insufficient balance" });
    }

    // Deduct from sender's balance
    sender.balance -= amount;

    // Create a new transaction
    const transaction = new Transaction({
      sender: sender._id,
      receiver: generateRandomObjectId(),
      amount,
      status: "Completed",
    });

    // Save changes
    await sender.save();
    await transaction.save();

    // Add transaction to user's transactions array
    sender.transactions.push(transaction._id);
    await sender.save();

    res.status(200).json({
      message: "Simulated transfer successful",
      transaction,
      newBalance: sender.balance,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
