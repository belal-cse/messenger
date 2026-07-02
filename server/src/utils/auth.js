import jwt from "jsonwebtoken";

export function signToken(user) {
  return jwt.sign({ id: user._id }, process.env.JWT_SECRET || "dev-secret", {
    expiresIn: "7d"
  });
}

export function normalizeHandle(value) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

export function makeUserId(username) {
  const cleanUsername = normalizeHandle(username).replace(/[^a-z0-9_]/g, "");
  const suffix = Math.random().toString(36).slice(2, 7);
  return `${cleanUsername || "user"}_${suffix}`;
}
