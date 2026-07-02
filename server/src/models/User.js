import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: true,
      trim: true,
      minlength: 2
    },
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      minlength: 3
    },
    userId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      minlength: 4
    },
    passwordHash: {
      type: String,
      required: true
    },
    avatarUrl: {
      type: String,
      default: ""
    },
    following: {
      type: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User"
        }
      ],
      default: []
    }
  },
  { timestamps: true }
);

userSchema.methods.toProfile = function toProfile() {
  return {
    id: this._id,
    fullName: this.fullName,
    username: this.username,
    userId: this.userId,
    avatarUrl: this.avatarUrl,
    createdAt: this.createdAt
  };
};

export default mongoose.model("User", userSchema);
