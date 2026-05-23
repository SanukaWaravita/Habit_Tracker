import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { connectionDB } from "./config/db.js";
import authRoutes from "./routes/auth.js";
import habitRoutes from "./routes/habits.js";
import { notFound, errorHandler } from "./middleware/errorHandler.js";

const app = express();

const allowedOrigins = (process.env.CLIENT_URL || "")
.split(",")
.map((s) => s.trim())
.filter(Boolean);

// Flexible cors strategy
const corsOptions = {
    // dynamic origin function for precise control defined
    origin(origin, cb) {
        // Allow requests with no origin (curl, same-origin, server-to-server)
        if (!origin) return cb(null, true);
        // Allow any localhost / 127.0.0.1 origin in development
        if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) {
            return cb(null, true);
        }
        // Allow anything explicitly listed in CLIENT_URL (comma-separated)
        if (allowedOrigins.includes(origin)) return cb(null, true);
        return cb(new Error(`Origin ${origin} not allowed by CORS`));
    },
    credentials: true, 
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
};

app.use(cors(corsOptions));
app.options("*", cors(corsOptions));
// JSON parsing with size limit to prevent large payloads
// (also prevents potential DoS attacks with large bodies)
app.use(express.json({limit: "1mb"}));

// Simple health check route
// Reliable signal for uptime and responsiveness
app.get("/api/health", (req, res) =>
    res.json({ status: "ok", time: new Date().toISOString()})
);

app.use("/api/auth", authRoutes);
app.use("/api/habits", habitRoutes);

app.use(notFound);
app.use(errorHandler);

// Instead of starting the server immediately, we wait for the DB connection to succeed

const PORT = process.env.PORT || 8000;
connectionDB().then(() => {
    app.listen(PORT, () => 
        console.log(`Server running on http://localhost:${PORT}`)
    );
});
