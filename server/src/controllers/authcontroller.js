const jwt = require("jsonwebtoken");
const User = require("../models/User.js");

const signToken = (userId) =>
  jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: "7d" });

const register = async (req, res) => {
  try {
    const { name, email, password, role = "student" } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters long." });
    }

    const exists = await User.findOne({ email });
    if (exists) {
      return res.status(409).json({ message: "Email already in use" });
    }

    const user = await User.create({ name, email, password, role });
    const token = signToken(user._id.toString());

    res.status(201).json({
      token,
      user: { id: user._id, name: user.name, email: user.email, role: user.role },
    });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // Enterprise Security: Account Lockout Check
    if (user.lockUntil && user.lockUntil > new Date()) {
      const waitMinutes = Math.ceil((user.lockUntil.getTime() - Date.now()) / 60000);
      return res.status(429).json({
        message: `Account is temporarily locked due to multiple failed login attempts. Please try again in ${waitMinutes} minutes.`,
      });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      user.failedLoginAttempts = (user.failedLoginAttempts || 0) + 1;
      if (user.failedLoginAttempts >= 5) {
        user.lockUntil = new Date(Date.now() + 15 * 60 * 1000); // Lock for 15 mins
      }
      await user.save();
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // Reset failed attempts & record login audit log
    user.failedLoginAttempts = 0;
    user.lockUntil = undefined;
    user.loginHistory.push({
      timestamp: new Date(),
      ip: req.ip || req.headers["x-forwarded-for"] || "127.0.0.1",
      userAgent: req.headers["user-agent"] || "Browser",
    });

    await user.save();

    const token = signToken(user._id.toString());

    res.json({
      token,
      user: { id: user._id, name: user.name, email: user.email, role: user.role },
    });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.userId).select("-password");
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json({ user });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

module.exports = { register, login, getMe };