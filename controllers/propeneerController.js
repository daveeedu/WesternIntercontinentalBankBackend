const Propeneer = require("../models/Propeneer");
const User = require("../models/User"); // Assuming you have a User model
const Transaction = require("../models/Transaction");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const sendEmail = require("../utils/email");

// Register Propeneer
exports.registerPropeneer = async (req, res) => {
  const { email, username, password } = req.body;

  try {
    // Check if email or username already exists
    const existingEmail = await Propeneer.findOne({ email });
    if (existingEmail) {
      return res.status(400).json({ error: "Email is already registered." });
    }

    const existingUsername = await Propeneer.findOne({ username });
    if (existingUsername) {
      return res.status(400).json({ error: "Username is already taken." });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const propeneer = new Propeneer({
      email,
      username,
      password: hashedPassword,
    });
    await propeneer.save();

    // Send email with username and password
    const subject = "Welcome to Global Online Banking";
    const htmlTemplate = `
       <div style="font-family: Arial, sans-serif; color: #333;">
         <h2>Welcome to Global Online Banking</h2>
         <p>Thank you for registering as a Propeneer!</p>
         <p>Your account has been successfully created. Please use the password you chose during registration to log in.</p>
         <p>Best regards,<br/>The Global Online Banking Team</p>
       </div>
         `;

    await sendEmail(email, subject, htmlTemplate);

    res.status(201).json({
      message:
        "Propeneer registered successfully. Check your email for login details.",
    });
  } catch (err) {
    console.error("Error:", err);
    res.status(500).json({ error: "Failed to register. Please try again." });
  }
};

// Check if email is already registered
exports.checkEmail = async (req, res) => {
  const { email } = req.body;
  try {
    const propeneer = await Propeneer.findOne({ email });
    if (propeneer) {
      return res.status(200).json({ isTaken: true });
    }
    return res.status(200).json({ isTaken: false });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Check if username is already taken
exports.checkUsername = async (req, res) => {
  const { username } = req.body;
  try {
    const propeneer = await Propeneer.findOne({ username });
    if (propeneer) {
      return res.status(200).json({ isTaken: true });
    }
    return res.status(200).json({ isTaken: false });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Login Propeneer
exports.loginPropeneer = async (req, res) => {
  const { username, password } = req.body;
  console.log("login details ", username, password);
  try {
    const propeneer = await Propeneer.findOne({ username });
    if (!propeneer) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const isMatch = await bcrypt.compare(password, propeneer.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const token = jwt.sign({ id: propeneer._id }, process.env.JWT_SECRET, {
      expiresIn: "24h",
    });
    res.status(200).json({ token });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Internal server error. Please try again." });
  }
};

// Get Propeneer Dashboard
exports.getPropeneer = async (req, res) => {
  try {
    const userId = req.user.id;

    const user = await Propeneer.findById(userId).select("-password");
    if (!user) {
      return res.status(404).json({ message: "Propeneer not found" });
    }

    res.status(200).json({ user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


// ADMIN ROUTES - For managing users and transactions

// Get all users (regular users, not Propeneers)
exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.find().select('-password');
    res.status(200).json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Update a user
exports.updateUser = async (req, res) => {
  const { id } = req.params;
  const updateData = req.body;

  try {
    // If password is being updated, hash it
    if (updateData.password) {
      updateData.password = await bcrypt.hash(updateData.password, 10);
    }

    const updatedUser = await User.findByIdAndUpdate(
      id,
      updateData,
      { new: true }
    ).select('-password');

    if (!updatedUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.status(200).json(updatedUser);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Delete a user
exports.deleteUser = async (req, res) => {
  const { id } = req.params;

  try {
    const deletedUser = await User.findByIdAndDelete(id);
    if (!deletedUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Delete all transactions associated with this user
    await Transaction.deleteMany({
      $or: [
        { sender: deletedUser._id },
        { receiver: deletedUser._id }
      ]
    });

    res.status(200).json({ message: 'User deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get all transactions (admin view)
exports.getAllTransactions = async (req, res) => {
  try {
    const transactions = await Transaction.find()
      .populate('sender', 'username email')
      .populate('receiver', 'username email')
      .sort({ date: -1 }); // Newest first

    res.status(200).json(transactions);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Update transaction status (e.g., mark as completed)
exports.updateTransactionStatus = async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  try {
    const updatedTransaction = await Transaction.findByIdAndUpdate(
      id,
      { status },
      { new: true }
    ).populate('sender receiver', 'username email');

    if (!updatedTransaction) {
      return res.status(404).json({ message: 'Transaction not found' });
    }

    res.status(200).json(updatedTransaction);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};