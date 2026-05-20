import jwt from "jsonwebtoken";
import User from "../models/User.js";

// Helper function
const signToken = (id) =>
    jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRES_IN || "30d",
    });

// Register function
