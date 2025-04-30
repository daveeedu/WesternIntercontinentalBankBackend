const express = require("express");
const router = express.Router();
const transactionController = require("../controllers/transactionController");
const { authenticate } = require("../middleware/auth");

// Transfer funds
router.post("/transfer", authenticate, transactionController.transferFunds);

// get transactions for a user
router.get("/", authenticate, transactionController.getUserTransactions);

// Get all transactions (propeneer only)
router.get("/all", authenticate, transactionController.getAllTransactions);

// Simulate transfer (for user testing)
router.post("/simulate", authenticate, transactionController.simulateTransfer);

module.exports = router;


