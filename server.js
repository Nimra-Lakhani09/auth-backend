require("dotenv").config();
const express = require("express");
const cors = require("cors");
const connectDB = require("./config/db");
const authRoutes = require("./routes/authRoutes");
const { notFound, errorHandler } = require("./middleware/error");

const app = express();

// Needed so req.ip / x-forwarded-for work correctly behind Vercel's proxy
app.set("trust proxy", 1);

// ---------- CORS ----------
// CLIENT_URL can hold several origins separated by commas
const allowedOrigins = (process.env.CLIENT_URL || "http://localhost:5173")
  .split(",")
  .map((o) => o.trim().replace(/\/$/, ""));

const corsOptions = {
  origin: (origin, callback) => {
    // allow tools like Postman (no origin) and any whitelisted origin
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error(`CORS blocked for origin: ${origin}`));
  },
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
};

app.use(cors(corsOptions));
app.options("*", cors(corsOptions));
app.use(express.json());

// ---------- Make sure DB is connected before every request (serverless friendly) ----------
app.use(async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (err) {
    next(err);
  }
});

// ---------- Routes ----------
app.get("/", (req, res) => res.json({ message: "MERN Auth API is running 🚀" }));
app.get("/api/health", (req, res) => res.json({ status: "ok", time: new Date() }));
app.use("/api/auth", authRoutes);

app.use(notFound);
app.use(errorHandler);

// Local development: start the server. On Vercel the app is exported instead.
if (!process.env.VERCEL) {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => console.log(`✅ Server running on http://localhost:${PORT}`));
}

module.exports = app;
