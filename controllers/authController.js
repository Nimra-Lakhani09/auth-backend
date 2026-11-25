const jwt = require("jsonwebtoken");
const User = require("../models/User");

const signToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || "7d" });

const getIp = (req) => (req.headers["x-forwarded-for"] || req.socket.remoteAddress || "").split(",")[0].trim();

// Never send the password hash to the browser
const publicUser = (u) => ({
  id: u._id,
  name: u.name,
  email: u.email,
  phone: u.phone,
  bio: u.bio,
  role: u.role,
  lastLogin: u.lastLogin,
  lastLoginIp: u.lastLoginIp,
  loginCount: u.loginCount,
  loginHistory: [...(u.loginHistory || [])].reverse(),
  createdAt: u.createdAt,
  updatedAt: u.updatedAt,
});

// POST /api/auth/register
exports.register = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: "Name, email and password are required" });
    }
    if (password.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters" });
    }

    const exists = await User.findOne({ email: email.toLowerCase() });
    if (exists) return res.status(409).json({ message: "This email is already registered" });

    const ip = getIp(req);
    const userAgent = req.headers["user-agent"] || "";

    const user = await User.create({
      name,
      email,
      password,
      signupIp: ip,
      signupUserAgent: userAgent,
      lastLogin: new Date(),
      lastLoginIp: ip,
      loginCount: 1,
      loginHistory: [{ ip, userAgent }],
    });

    res.status(201).json({ token: signToken(user._id), user: publicUser(user) });
  } catch (err) {
    next(err);
  }
};

// POST /api/auth/login
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    const user = await User.findOne({ email: email.toLowerCase() }).select("+password");
    if (!user || !(await user.matchPassword(password))) {
      return res.status(401).json({ message: "Invalid email or password" });
    }
    if (!user.isActive) return res.status(403).json({ message: "Account is disabled" });

    const ip = getIp(req);
    user.lastLogin = new Date();
    user.lastLoginIp = ip;
    user.loginCount += 1;
    user.loginHistory.push({ ip, userAgent: req.headers["user-agent"] || "" });
    if (user.loginHistory.length > 10) user.loginHistory.shift(); // keep last 10
    await user.save();

    res.json({ token: signToken(user._id), user: publicUser(user) });
  } catch (err) {
    next(err);
  }
};

// GET /api/auth/me
exports.getMe = async (req, res) => {
  res.json({ user: publicUser(req.user) });
};

// PUT /api/auth/me  (update name, phone, bio)
exports.updateProfile = async (req, res, next) => {
  try {
    const { name, phone, bio } = req.body;
    const user = req.user;

    if (name !== undefined) {
      if (!name.trim()) return res.status(400).json({ message: "Name cannot be empty" });
      user.name = name;
    }
    if (phone !== undefined) user.phone = phone;
    if (bio !== undefined) user.bio = bio;

    await user.save();
    res.json({ message: "Profile updated", user: publicUser(user) });
  } catch (err) {
    next(err);
  }
};

// PUT /api/auth/password
exports.changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: "Current and new password are required" });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ message: "New password must be at least 6 characters" });
    }

    const user = await User.findById(req.user._id).select("+password");
    if (!(await user.matchPassword(currentPassword))) {
      return res.status(401).json({ message: "Current password is incorrect" });
    }

    user.password = newPassword; // hashed automatically by the pre-save hook
    await user.save();
    res.json({ message: "Password changed successfully" });
  } catch (err) {
    next(err);
  }
};

// DELETE /api/auth/me
exports.deleteAccount = async (req, res, next) => {
  try {
    const { password } = req.body;
    if (!password) return res.status(400).json({ message: "Password is required to delete your account" });

    const user = await User.findById(req.user._id).select("+password");
    if (!(await user.matchPassword(password))) {
      return res.status(401).json({ message: "Password is incorrect" });
    }

    await user.deleteOne();
    res.json({ message: "Account deleted" });
  } catch (err) {
    next(err);
  }
};
