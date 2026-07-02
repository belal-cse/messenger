import express from "express";
import Message from "../models/Message.js";
import User from "../models/User.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

function hasMutualFollow(me, otherUser) {
  const meFollowsOther = me.following.some((id) => id.equals(otherUser._id));
  const otherFollowsMe = otherUser.following.some((id) => id.equals(me._id));
  return meFollowsOther && otherFollowsMe;
}

router.get("/:userId", protect, async (req, res) => {
  const otherUser = await User.findById(req.params.userId).select("fullName username userId avatarUrl following");

  if (!otherUser) {
    return res.status(404).json({ message: "User not found" });
  }

  if (!hasMutualFollow(req.user, otherUser)) {
    return res.status(403).json({ message: "Follow back required before messaging" });
  }

  const messages = await Message.find({
    $or: [
      { sender: req.user._id, receiver: otherUser._id },
      { sender: otherUser._id, receiver: req.user._id }
    ]
  }).sort({ createdAt: 1 });

  res.json({ otherUser, messages });
});

router.post("/:userId", protect, async (req, res) => {
  const text = String(req.body.text || "").trim();

  if (!text) {
    return res.status(400).json({ message: "Message cannot be empty" });
  }

  const receiver = await User.findById(req.params.userId).select("following");
  if (!receiver) {
    return res.status(404).json({ message: "User not found" });
  }

  if (receiver._id.equals(req.user._id)) {
    return res.status(400).json({ message: "You cannot message yourself" });
  }

  if (!hasMutualFollow(req.user, receiver)) {
    return res.status(403).json({ message: "Follow back required before messaging" });
  }

  const message = await Message.create({
    sender: req.user._id,
    receiver: receiver._id,
    text
  });

  res.status(201).json({ message });
});

export default router;
