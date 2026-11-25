const express = require("express");
const {
  register,
  login,
  getMe,
  updateProfile,
  changePassword,
  deleteAccount,
} = require("../controllers/authController");
const { protect } = require("../middleware/auth");

const router = express.Router();

router.post("/register", register);
router.post("/login", login);

router.get("/me", protect, getMe);
router.put("/me", protect, updateProfile);
router.delete("/me", protect, deleteAccount);
router.put("/password", protect, changePassword);

module.exports = router;
