import User from "../models/user.model.js";
import jwt from "jsonwebtoken";

export const protectedRoute = async (req, res, next) => {
    try {
        const token = req.cookies?.token;
        if (!token) {
            return res.status(401).json({ message: "No Token found" });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        if (!decoded) {
            return res.status(401).json({ message: "Unauthorized" });
        }
        const user = await User.findById(decoded.id).select("-password");
        if (!user) {
            return res.status(401).json({ message: "Unauthorized User" });
        }
        req.user = user;
        next();
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};