import Habit from "../models/Habit.js";
import HabitLog from "../models/HabitLog.js";

export const getHabits = async (req, res) => {
    try {
        const { includeArchived } = req.query;
        const filter = { userId: req.user._id };
        if (includeArchived !== "true") filter.isArchived = false;
        const habits = await Habit.find(filter).sort({ order: 1, createdAt: 1 });
        res.json(habits);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};
