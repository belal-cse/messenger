import express from "express";
import bcrypt from "bcryptjs";
import User from "../models/User.js";
import { makeUserId, normalizeHandle, signToken } from "../utils/auth.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/register", async (req, res) => {
  const { fullName, username, password, confirmPassword } = req.body;
  const cleanUsername = normalizeHandle(username);

  if (!fullName?.trim() || !cleanUsername || !password || !confirmPassword) {
    return res.status(400).json({ message: "All fields are required" });
  }

  if (password.length < 6) {
    return res.status(400).json({ message: "Password must be at least 6 characters" });
  }

  if (password !== confirmPassword) {
    return res.status(400).json({ message: "Passwords do not match" });
  }

  const existingUser = await User.findOne({ username: cleanUsername });
  if (existingUser) {
    return res.status(409).json({ message: "Username already exists" });
  }

  let userId = makeUserId(cleanUsername);
  while (await User.exists({ userId })) {
    userId = makeUserId(cleanUsername);
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const user = await User.create({
    fullName: fullName.trim(),
    username: cleanUsername,
    userId,
    passwordHash
  });

  res.status(201).json({
    token: signToken(user),
    user: user.toProfile()
  });
});

router.post("/login", async (req, res) => {
  const { loginId, password } = req.body;
  const cleanLoginId = normalizeHandle(loginId);

  if (!cleanLoginId || !password) {
    return res.status(400).json({ message: "Username/userId and password are required" });
  }

  const user = await User.findOne({
    $or: [{ username: cleanLoginId }, { userId: cleanLoginId }]
  });

  if (!user) {
    return res.status(401).json({ message: "Invalid login details" });
  }

  const passwordMatches = await bcrypt.compare(password, user.passwordHash);
  if (!passwordMatches) {
    return res.status(401).json({ message: "Invalid login details" });
  }

  res.json({
    token: signToken(user),
    user: user.toProfile()
  });
});

router.get("/me", protect, (req, res) => {
  res.json({ user: req.user.toProfile() });
});

export default router;
