const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const prisma = require("./prisma");
const authRoutes = require("./routes/auth");
const authenticate = require("./middleware/auth");
const userRoutes = require("./routes/user");
const planRoutes = require("./routes/plan");
const exerciseRoutes = require("./routes/exercises");
const workoutRoutes = require("./routes/workoutRoutes");
const workoutSessionRoutes = require("./routes/workoutSessionRoutes");
const setRoutes = require("./routes/setRoutes");
const statsRoutes = require("./routes/statsRoutes");

dotenv.config();

const app = express();

/**
 * ✅ CORS allowlist
 * Put your Vercel domains here.
 * You can also use env var for production.
 */
const allowedOrigins = [
  "http://localhost:5173",
  "https://training-tracker-iota.vercel.app",
  // if you have a custom domain later, add it here
];

app.use(
  cors({
    origin: (origin, cb) => {
      // allow requests with no origin (Postman, server-to-server, health checks)
      if (!origin) return cb(null, true);

      if (allowedOrigins.includes(origin)) return cb(null, true);

      return cb(new Error("CORS blocked origin: " + origin));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use(express.json());

app.get("/", (req, res) => {
  res.json({ message: "Training Tracker API is running" });
});

app.use("/user", userRoutes);
app.use("/auth", authRoutes);
app.use("/plan", planRoutes);
app.use("/exercises", exerciseRoutes);
app.use("/workout", workoutRoutes);
app.use("/workouts", workoutSessionRoutes);
app.use("/stats", statsRoutes);
app.use("/", setRoutes);

app.get("/me", authenticate, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { id: true, email: true, name: true, planType: true },
    });

    if (!user) return res.status(404).json({ message: "User not found" });
    return res.json({ user });
  } catch (err) {
    console.error("Me route error:", err);
    return res.status(500).json({ message: "Server error" });
  }
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
