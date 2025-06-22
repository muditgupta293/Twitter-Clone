import User from "../models/user.model.js";
import bcrypt from "bcryptjs";
import { generateTokenAndSetCookie } from "./utils/generateToken.js";

export const signup = async (req, res) => {
  try {
    console.log(req.body);
    const { username, fullname, email, password } = req.body;
    if (!username || !fullname || !email || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }

    // Validate email
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: "Invalid email format" });
    }

    // Check if email or username already exists
    const emailOrUsernameExist = await User.findOne({
      $or: [{ email }, { username }],
    });
    console.log(emailOrUsernameExist);
    if (emailOrUsernameExist) {
      return res
        .status(400)
        .json({ message: "Email or usernamealready exists" });
    }

    // Check if username already exists
    if (password.length < 8) {
      return res
        .status(400)
        .json({ message: "Password must be at least 8 characters" });
    }

    // Hashing password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create user
    const user = new User({
      username,
      fullname,
      email,
      password: hashedPassword,
    });

    if (user) {
      generateTokenAndSetCookie(user._id, res);
      await user.save();
      res.status(201).json({
        message: "User created successfully",
        data: {
          _id: user._id,
          username: user.username,
          fullname: user.fullname,
          email: user.email,
          profileImage: user.profileImage,
          coverImage: user.coverImage,
          followers: user.followers,
          following: user.following,
        },
      });
    } else {
      res.status(400).json({ message: "Invalid User data" });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const login = async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const user = await User.findOne({ username });
    if (!user) {
      return res.status(400).json({ message: "User not found" });
    }

    const isMatch = await bcrypt.compare(password, user?.password || "");
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    generateTokenAndSetCookie(user._id, res);
    res.status(200).json({
      message: "Login successful",
      data: {
        _id: user._id,
        username: user.username,
        fullname: user.fullname,
        email: user.email,
        profileImage: user.profileImage,
        coverImage: user.coverImage,
        followers: user.followers,
        following: user.following,
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const logout = async (req, res) => {
  try {
    if (!req.cookies?.token) {
      return res
        .status(200)
        .json({ message: "No token found, already logged out" });
    }
    res.clearCookie("token", { httpOnly: true, sameSite: "strict" });
    res.status(200).json({ message: "Logout successful" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const checkAuth = async (req, res) => {
    try {
        const user = await User.findById(req.user._id).select("-password");
        res.status(200).json({ message: "User found", data: user });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
}