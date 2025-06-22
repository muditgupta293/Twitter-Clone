import express from "express";
import { checkAuth, login, logout, signup } from "../controllers/auth.controller.js";
import { protectedRoute } from "../middleware/protectedRoute.js";

const router = express.Router();

router.get("/checkAuth", protectedRoute, checkAuth);
router.post("/login", login);
router.post("/signup", signup);
router.post("/logout", logout);

export default router;
