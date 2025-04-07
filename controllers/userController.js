const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const sendEmail = require("../utils/email");
const generateAccountNumber = require("../utils/generateAccountNumber");
const generateFatId = require("../utils/generateFatId");
const multer = require("multer");
const { profileImageStorage } = require("../config/cloudinary");
const uploadProfileImage = multer({ storage: profileImageStorage }).single(
  "profileImage"
);

// Register User
// Register User
exports.registerUser = async (req, res) => {
  const { email, firstName, lastName, password } = req.body;
  try {
    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    // Generating a unique account number and fatId
    const accountNumber = await generateAccountNumber();
    const fatId = await generateFatId();

    // Create new user
    const user = new User({
      email,
      firstName,
      lastName,
      password: hashedPassword,
      accountNumber,
      fatId,
    });
    await user.save();

    // Send email with login details and account number
    const subject = "Welcome to Global Online Banking";
    const text = `Thank you for registering! Here is your Account Number:
               
                    Account Number: ${accountNumber}`;

    await sendEmail(email, subject, text);

    res.status(201).json({
      message:
        "User registered successfully. Check your email for login details.",
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Check if email is already registered
exports.checkEmail = async (req, res) => {
  const { email } = req.body;
  try {
    const user = await User.findOne({ email });
    if (user) {
      return res.status(200).json({ isTaken: true });
    }
    return res.status(200).json({ isTaken: false });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Login User
exports.loginUser = async (req, res) => {
  const { email, password } = req.body;
  try {
    // Find user by email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    // Check password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    // Generate JWT token
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "24h",
    });
    res.status(200).json({ token });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get User Dashboard
exports.getUser = async (req, res) => {
  try {
    const userId = req.user.id;

    const user = await User.findById(userId).select("-password");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json({ user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Search User by Account Number
exports.searchByAccountNumber = async (req, res) => {
  try {
    const { accountNumber } = req.params;

    // Find user by account number
    const user = await User.findOne({ accountNumber }).select("-password");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json({ user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.updateFatStatus = async (req, res) => {
  const { fatId } = req.body;

  try {
    const user = await User.findOneAndUpdate(
      { fatId },
      { fatStatus: "verified" },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json({ message: "FAT Verified", user });
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
};

// Upload Profile Image
exports.uploadProfileImage = async (req, res) => {
  try {
    uploadProfileImage(req, res, async (err) => {
      if (err) {
        return res.status(400).json({ error: err.message });
      }

      if (!req.file) {
        return res.status(400).json({ error: "No image file provided" });
      }

      const user = await User.findByIdAndUpdate(
        req.user.id,
        { profileImage: req.file.path },
        { new: true }
      ).select("-password");

      res.status(200).json({
        message: "Profile image uploaded successfully",
        user,
      });
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get total user count
exports.getUserCount = async (req, res) => {
  try {
    const count = await User.countDocuments();
    res.status(200).json({ count });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};


// Get all users (for admin dashboard)
exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.find().select('-password');
    res.status(200).json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Delete user
exports.deleteUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const deletedUser = await User.findByIdAndDelete(userId);
    
    if (!deletedUser) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    res.status(200).json({ message: 'User deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Update user
exports.updateUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const updates = req.body;
    
    // Don't allow password updates through this endpoint
    if (updates.password) {
      delete updates.password;
    }
    
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      updates,
      { new: true, runValidators: true }
    ).select('-password');
    
    if (!updatedUser) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    res.status(200).json(updatedUser);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};