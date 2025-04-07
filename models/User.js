const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  password: { type: String, required: true },
  accountNumber: { type: String, unique: true },
  fatId: { type: String, unique: true },
  fatStatus: {
    type: String,
    enum: ["verified", "not verified"],
    default: "not verified",
  },
  balance: { type: Number, default: 0 },
  profileImage: { type: String, default: "" }, 
  transactions: [{ type: mongoose.Schema.Types.ObjectId, ref: "Transaction" }],
});

module.exports = mongoose.model("User", UserSchema);
