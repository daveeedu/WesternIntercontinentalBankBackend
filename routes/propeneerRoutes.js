const express = require("express");
const router = express.Router();
const propeneerController = require("../controllers/propeneerController");
const { authenticate } = require("../middleware/auth");

router.post("/register", propeneerController.registerPropeneer);
router.post("/check-email", propeneerController.checkEmail);
router.post("/check-username", propeneerController.checkUsername);
router.post("/login", propeneerController.loginPropeneer);

// Protected Routes (require authentication)
router.get("/", authenticate, propeneerController.getPropeneer);

// ADMIN MANAGEMENT ROUTES - Require authentication
router.get("/users", authenticate, propeneerController.getAllUsers);
router.put("/users/:id", authenticate, propeneerController.updateUser);
router.delete("/users/:id", authenticate, propeneerController.deleteUser);

// TRANSACTION MANAGEMENT ROUTES
router.get(
  "/transactions",
  authenticate,
  propeneerController.getAllTransactions
);
router.put(
  "/transactions/:id/status",
  authenticate,
  propeneerController.updateTransactionStatus
);

router.post("/reset-password", authenticate, propeneerController.resetPassword);

module.exports = router;
