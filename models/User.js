const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

// Every login is saved here (last 10 are kept)
const loginEntrySchema = new mongoose.Schema(
  {
    ip: String,
    userAgent: String,
    at: { type: Date, default: Date.now },
  },
  { _id: false }
);

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: [true, "Name is required"], trim: true, maxlength: 60 },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, "Please enter a valid email"],
    },
    password: { type: String, required: true, minlength: 6, select: false },

    // Profile info
    phone: { type: String, trim: true, default: "" },
    bio: { type: String, trim: true, maxlength: 200, default: "" },
    role: { type: String, enum: ["user", "admin"], default: "user" },
    isActive: { type: Boolean, default: true },

    // Tracking info
    signupIp: String,
    signupUserAgent: String,
    lastLogin: Date,
    lastLoginIp: String,
    loginCount: { type: Number, default: 0 },
    loginHistory: [loginEntrySchema],
  },
  { timestamps: true } // adds createdAt + updatedAt automatically
);

// Hash the password before saving (only when it changed)
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

userSchema.methods.matchPassword = function (plainPassword) {
  return bcrypt.compare(plainPassword, this.password);
};

module.exports = mongoose.model("User", userSchema);
