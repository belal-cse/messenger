import express from "express";
import User from "../models/User.js";
import { protect } from "../middleware/authMiddleware.js";
import { normalizeHandle } from "../utils/auth.js";

const router = express.Router();

function idSet(ids) {
  return new Set(ids.map((id) => id.toString()));
}

function publicUser(user, currentUser) {
  const following = idSet(currentUser.following || []);
  const theirFollowing = idSet(user.following || []);
  const userId = user._id.toString();
  const currentUserId = currentUser._id.toString();

  return {
    _id: user._id,
    fullName: user.fullName,
    username: user.username,
    userId: user.userId,
    avatarUrl: user.avatarUrl,
    isFollowing: following.has(userId),
    followsMe: theirFollowing.has(currentUserId),
    isMutual: following.has(userId) && theirFollowing.has(currentUserId)
  };
}

router.patch("/me", protect, async (req, res) => {
  const { fullName, userId, avatarUrl } = req.body;

  if (fullName !== undefined) {
    if (!fullName.trim()) {
      return res.status(400).json({ message: "Full name cannot be empty" });
    }

    req.user.fullName = fullName.trim();
  }

  if (userId !== undefined) {
    const cleanUserId = normalizeHandle(userId).replace(/[^a-z0-9_]/g, "");

    if (cleanUserId.length < 4) {
      return res.status(400).json({ message: "User ID must be at least 4 characters" });
    }

    const taken = await User.findOne({ userId: cleanUserId, _id: { $ne: req.user._id } });
    if (taken) {
      return res.status(409).json({ message: "User ID already taken" });
    }

    req.user.userId = cleanUserId;
  }

  if (avatarUrl !== undefined) {
    const cleanAvatar = String(avatarUrl || "").trim();

    if (cleanAvatar && !cleanAvatar.startsWith("data:image/") && !cleanAvatar.startsWith("http")) {
      return res.status(400).json({ message: "Photo must be an image upload or image URL" });
    }

    req.user.avatarUrl = cleanAvatar;
  }

  await req.user.save();
  res.json({ user: req.user.toProfile() });
});

router.get("/people", protect, async (req, res) => {
  const users = await User.find({ _id: { $ne: req.user._id } })
    .sort({ createdAt: -1 })
    .limit(100)
    .select("fullName username userId avatarUrl following");

  res.json({ users: users.map((user) => publicUser(user, req.user)) });
});

router.get("/contacts", protect, async (req, res) => {
  const users = await User.find({ _id: { $ne: req.user._id }, following: req.user._id })
    .sort({ fullName: 1 })
    .select("fullName username userId avatarUrl following");

  const contacts = users
    .map((user) => publicUser(user, req.user))
    .filter((user) => user.isMutual);

  res.json({ users: contacts });
});

router.post("/:id/follow", protect, async (req, res) => {
  if (req.user._id.equals(req.params.id)) {
    return res.status(400).json({ message: "You cannot follow yourself" });
  }

  const target = await User.findById(req.params.id).select("fullName username userId avatarUrl following");
  if (!target) {
    return res.status(404).json({ message: "User not found" });
  }

  if (!req.user.following.some((id) => id.equals(target._id))) {
    req.user.following.push(target._id);
    await req.user.save();
  }

  res.json({ user: publicUser(target, req.user), me: req.user.toProfile() });
});

router.delete("/:id/follow", protect, async (req, res) => {
  req.user.following = req.user.following.filter((id) => !id.equals(req.params.id));
  await req.user.save();

  const target = await User.findById(req.params.id).select("fullName username userId avatarUrl following");

  res.json({ user: target ? publicUser(target, req.user) : null, me: req.user.toProfile() });
});

router.get("/search", protect, async (req, res) => {
  const q = normalizeHandle(req.query.q);

  if (!q) {
    return res.json({ users: [] });
  }

  const users = await User.find({
    _id: { $ne: req.user._id },
    $or: [
      { username: { $regex: q, $options: "i" } },
      { userId: { $regex: q, $options: "i" } },
      { fullName: { $regex: q, $options: "i" } }
    ]
  })
    .limit(10)
    .select("fullName username userId avatarUrl following");

  res.json({ users: users.map((user) => publicUser(user, req.user)) });
});

export default router;
