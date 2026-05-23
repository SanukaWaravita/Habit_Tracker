import Habit from "../models/Habit.js";
import HabitLog from "../models/HabitLog.js";
import AIInsight from "../models/AIInsight.js";
import { chatCompletion, parseJSON, SYSTEM_PROMPTS } from "../utils/aiService.js";
import { calcStreak, lastDays, last90Days, todayKey } from "../utils/dateHelper.js";

const CATEGORIES = [
    "Health",
    "Fitness",
    "Learning",
    "Mindfulness",
    "Productivity",
    "Social",
    "Finance",
    "Creative",
    "Other",
];

const buildHabitSummary = (habits, logs) =>
    habits.map((habit) => {
        const habitLogs = logs
            .filter((log) => String(log.habitId) === String(habit._id))
            .map((log) => log.completedDate)
            .sort()
            .reverse();
        const streak = calcStreak([...new Set(habitLogs)]);

        return {
            id: habit._id,
            name: habit.name,
            category: habit.category,
            frequency: habit.frequency,
            targetDays: habit.targetDays,
            isArchived: habit.isArchived,
            completions: habitLogs.length,
            completedDates: habitLogs,
            currentStreak: streak.current,
            longestStreak: streak.longest,
        };
    });

const buildRangeContext = async (userId, days) => {
    const habits = await Habit.find({ userId }).sort({ order: 1, createdAt: 1 });
    const logs = await HabitLog.find({
        userId,
        completedDate: { $gte: days[0], $lte: days[days.length - 1] },
    }).sort({ completedDate: -1 });

    return {
        days,
        today: todayKey(),
        habits: buildHabitSummary(habits, logs),
    };
};

const saveInsight = async (userId, type, content, meta = {}) => {
    await AIInsight.create({
        userId,
        type,
        content,
        meta,
    });
};

export const weeklyReport = async (req, res) => {
    try {
        const ctx = await buildRangeContext(req.user._id, lastDays(7));
        const activeHabits = ctx.habits.filter((habit) => !habit.isArchived);

        if (!activeHabits.length) {
            return res.json({
                content:
                    "You don't have any active habits yet. Create your first habit and I'll turn your weekly progress into a useful report.",
            });
        }

        const result = await chatCompletion({
            system: SYSTEM_PROMPTS.weekly,
            user: JSON.stringify({ ...ctx, habits: activeHabits }),
            temperature: 0.65,
        });

        await saveInsight(req.user._id, "weekly", result.content, {
            ok: result.ok,
            days: ctx.days,
        });

        res.json({ content: result.content });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

export const suggestHabits = async (req, res) => {
    try {
        const { goals = "", productiveTime = "", struggles = "" } = req.body;
        const ctx = await buildRangeContext(req.user._id, lastDays(30));

        const result = await chatCompletion({
            system: SYSTEM_PROMPTS.suggestion,
            user: JSON.stringify({
                goals,
                productiveTime,
                struggles,
                existingHabits: ctx.habits.map((habit) => ({
                    name: habit.name,
                    category: habit.category,
                    frequency: habit.frequency,
                    completions30d: habit.completions,
                })),
            }),
            temperature: 0.8,
        });

        if (!result.ok) {
            return res.json({ suggestions: [], message: result.content });
        }

        let parsed;
        try {
            parsed = parseJSON(result.content);
        } catch {
            return res.json({
                suggestions: [],
                message: "AI returned an invalid suggestion format. Please try again.",
            });
        }

        const suggestions = (parsed.suggestions || []).slice(0, 3).map((item) => ({
            name: String(item.name || "").trim(),
            description: String(item.description || "").trim(),
            frequency: item.frequency === "weekly" ? "weekly" : "daily",
            category: CATEGORIES.includes(item.category) ? item.category : "Other",
            icon: String(item.icon || "🎯").trim().slice(0, 4),
            reason: String(item.reason || "").trim(),
        }));

        await saveInsight(req.user._id, "suggestion", JSON.stringify(suggestions), {
            goals,
            productiveTime,
            struggles,
        });

        res.json({ suggestions });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

export const recoveryPlan = async (req, res) => {
    try {
        const { habitId } = req.body;
        const habit = await Habit.findOne({ _id: habitId, userId: req.user._id });
        if (!habit) return res.status(404).json({ message: "Habit not found" });

        const days = last90Days();
        const logs = await HabitLog.find({
            userId: req.user._id,
            habitId: habit._id,
            completedDate: { $gte: days[0], $lte: days[days.length - 1] },
        }).sort({ completedDate: -1 });
        const completedDates = logs.map((log) => log.completedDate);
        const streak = calcStreak(completedDates);

        const result = await chatCompletion({
            system: SYSTEM_PROMPTS.recovery,
            user: JSON.stringify({
                today: todayKey(),
                habit: {
                    name: habit.name,
                    description: habit.description,
                    category: habit.category,
                    frequency: habit.frequency,
                    targetDays: habit.targetDays,
                },
                completedDates,
                currentStreak: streak.current,
                longestStreak: streak.longest,
            }),
            temperature: 0.7,
        });

        await saveInsight(req.user._id, "recovery", result.content, {
            ok: result.ok,
            habitId: habit._id,
        });

        res.json({ content: result.content });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

export const chat = async (req, res) => {
    try {
        const { question } = req.body;
        if (!question?.trim()) {
            return res.status(400).json({ message: "Question is required" });
        }

        const ctx = await buildRangeContext(req.user._id, lastDays(30));
        const result = await chatCompletion({
            system: SYSTEM_PROMPTS.chat,
            user: JSON.stringify({
                question,
                context: ctx,
            }),
            temperature: 0.55,
        });

        await saveInsight(req.user._id, "chat", result.content, {
            ok: result.ok,
            question,
        });

        res.json({ content: result.content });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

export const morningMotivation = async (req, res) => {
    try {
        const ctx = await buildRangeContext(req.user._id, lastDays(14));
        const today = todayKey();
        const result = await chatCompletion({
            system: SYSTEM_PROMPTS.morning,
            user: JSON.stringify({
                user: { name: req.user.name },
                today,
                habits: ctx.habits
                    .filter((habit) => !habit.isArchived)
                    .map((habit) => ({
                        name: habit.name,
                        category: habit.category,
                        completedToday: habit.completedDates.includes(today),
                        currentStreak: habit.currentStreak,
                        longestStreak: habit.longestStreak,
                        recentCompletions: habit.completions,
                    })),
            }),
            temperature: 0.75,
        });

        await saveInsight(req.user._id, "morning", result.content, {
            ok: result.ok,
            today,
        });

        res.json({ content: result.content });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};
