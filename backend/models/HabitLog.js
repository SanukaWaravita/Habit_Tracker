import mongoose from "mongoose";

const habitLogSchema = new mongoose.Schema(
    {
        // 4 fields
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true,
        },
        habitId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Habit",
            required: true,
            index: true,
        },
        completedDate: { type: String, required: true }, // YYYY-MM-DD
        notes: { type: String, default: "" },
    },
    { timestamps: true }
);

// Unique index created using the following
habitLogSchema.index(
    { userId: 1, habitId: 1, completedDate: 1},
    { unique: true }
);

export default mongoose.model("HabitLog", habitLogSchema);