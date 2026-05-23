import express from "express";
import {
    getHabits,
    createHabit,
    updateHabit,
    deleteHabit,
    archiveHabit,
    reorderHabits,
} from "../controllers/habitController.js";
import { protect } from "../middleware/auth.js";

// We create a router...
const router = express.Router();

// ... and apply the middleware to the entire router
router.use(protect);

router.get("/", getHabits);
router.post("/", createHabit);
router.put("/reorder", reorderHabits);
router.put("/:id", updateHabit);
router.delete("/:id", deleteHabit);
router.put("/:id/archive", archiveHabit);

export default router;
