import bcrypt from "bcryptjs";
import { v2 as cloudinary } from "cloudinary";

import Notification from "../models/notification.model.js";
import User from "../models/user.model.js";

export const getUserProfile = async (req, res) => {
  try {
    const { username } = req.params;
    const user = await User.findOne({ username }).select("-password");
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    res.status(200).json({ message: "User found", data: user });
  } catch (error) {
    console.log("Error getting user profile:", error);
    res.status(500).json({ error: error.message });
  }
};

export const followUnfollowUser = async (req, res) => {
  try {
    const { id } = req.params;
    const currentUser = await User.findById(req.user._id);
    const userToFollow = await User.findById(id);

    if (!currentUser || !userToFollow) {
      return res.status(404).json({ error: "User not found" });
    }
    if (currentUser._id.equals(userToFollow._id)) {
      return res
        .status(400)
        .json({ error: "You cannot follow/unfollow yourself" });
    }

    const isFollowing = currentUser.following.includes(userToFollow._id);
    if (isFollowing) {
      // Unfollow logic
      await User.findByIdAndUpdate(currentUser._id, {
        $pull: { following: userToFollow._id },
      });
      await User.findByIdAndUpdate(userToFollow._id, {
        $pull: { followers: currentUser._id },
      });
      res.status(200).json({ message: "Successfully unfollowed" });
    } else {
      // Follow logic
      await User.findByIdAndUpdate(currentUser._id, {
        $push: { following: userToFollow._id },
      });
      await User.findByIdAndUpdate(userToFollow._id, {
        $push: { followers: currentUser._id },
      });
      const notification = new Notification({
        from: currentUser._id,
        to: userToFollow._id,
        type: "follow",
      });
      // await notification.save();
      notification.save();
      res.status(200).json({ message: "Successfully followed" });
    }
  } catch (error) {
    console.log("Error following/unfollowing user:", error);
    res.status(500).json({ error: error.message });
  }
};

export const getSuggestedUsers = async (req, res) => {
  try {
    const currentUser = await User.findById(req.user._id);
    const usersFollowedByUser = currentUser.following;
    const suggestedUsers = await User.find({
      _id: { $nin: [...usersFollowedByUser, currentUser._id] },
    })
      .select("-password")
      .limit(5);
    res
      .status(200)
      .json({ message: "Suggested users found", data: suggestedUsers });
  } catch (error) {
    console.log("Error getting suggested users:", error);
    res.status(500).json({ error: error.message });
  }
};

export const updateUser = async (req, res) => {
  try {
    const { fullname, newPassword, currentPassword, email, link, bio } =
      req.body;
    let { profileImage, coverImage } = req.body;
    let user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    if (
      (!currentPassword && newPassword) ||
      (currentPassword && !newPassword)
    ) {
      return res
        .status(400)
        .json({ message: "Current password and new password are required" });
    }
    if (currentPassword && newPassword) {
      const isMatch = await bcrypt.compare(currentPassword, user.password);
      if (!isMatch) {
        return res
          .status(400)
          .json({ message: "Current password is incorrect" });
      }
      if (newPassword.length < 8) {
        return res
          .status(400)
          .json({ message: "Password must be at least 8 characters" });
      }
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(newPassword, salt);
      user.password = hashedPassword;
    }
    if (!fullname && !email && !link && !bio && !profileImage && !coverImage) {
      return res
        .status(400)
        .json({ message: "At least one field is required" });
    }
    if (profileImage) {
      // Upload profile image after removing old if exists
      if (user.profileImage) {
        await cloudinary.uploader.destroy(
          user.profileImage.split("/").pop().split(".")[0]
        );
      }
      const uploadedUrl = await cloudinary.uploader.upload(profileImage);
      profileImage = uploadedUrl.secure_url;
    }
    if (coverImage) {
      // Upload cover image after removing old if exists
      if (user.coverImage) {
        await cloudinary.uploader.destroy(
          user.coverImage.split("/").pop().split(".")[0]
        );
      }
      const uploadedUrl = await cloudinary.uploader.upload(coverImage);
      coverImage = uploadedUrl.secure_url;
    }
    user.fullname = fullname || user.fullname;
    user.email = email || user.email;
    user.link = link || user.link;
    user.bio = bio || user.bio;
    user.profileImage = profileImage || user.profileImage;
    user.coverImage = coverImage || user.coverImage;
    await user.save();
    user.password = undefined;
    res.status(200).json({ message: "User updated successfully", data: user });
  } catch (error) {
    console.log("Error updating user:", error);
    res.status(500).json({ error: error.message });
  }
};
