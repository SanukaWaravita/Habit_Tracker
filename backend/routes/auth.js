import express from "express";
import {
    register,
    login,
    me,
    updateProfile,
} from "../controllers/authController.js";
import { protect } from "../middleware/auth.js";

const router = express.Router();

// All auth controller functions
// Public; anyone can hit them
router.post("/register", register);
router.post("/login", login);

// The protect middleware
//  Protected; protect middleware passed before the controller
// Meaning every request hitting these routers must have valid jwt token
router.get("/me", protect, me);
router.put("/profile", protect, updateProfile);

export default router;