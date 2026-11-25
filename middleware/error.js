exports.notFound = (req, res) => {
  res.status(404).json({ message: `Route not found: ${req.method} ${req.originalUrl}` });
};

exports.errorHandler = (err, req, res, next) => {
  console.error("❌", err.message);

  // Duplicate email
  if (err.code === 11000) {
    return res.status(409).json({ message: "This email is already registered" });
  }

  // Mongoose validation errors -> first readable message
  if (err.name === "ValidationError") {
    const first = Object.values(err.errors)[0];
    return res.status(400).json({ message: first.message });
  }

  res.status(err.statusCode || 500).json({ message: err.message || "Server error" });
};
