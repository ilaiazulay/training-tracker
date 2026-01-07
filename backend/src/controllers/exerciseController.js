const prisma = require("../prisma");

// GET /exercises
async function listExercises(req, res) {
  try {
    const userId = req.user.id;

    const exercises = await prisma.exercise.findMany({
      where: {
        OR: [{ isGlobal: true }, { createdByUserId: userId }],
      },
      orderBy: [{ isGlobal: "desc" }, { name: "asc" }],
      select: {
        id: true,
        name: true,
        muscleGroup: true,
        imageUrl: true,
        isGlobal: true,
        createdByUserId: true,
      },
    });

    res.json({ exercises });
  } catch (err) {
    console.error("listExercises error:", err);
    res.status(500).json({ message: "Failed to list exercises" });
  }
}

// POST /exercises
async function createExercise(req, res) {
  try {
    const userId = req.user.id;
    let { name, muscleGroup } = req.body;

    if (!name || typeof name !== "string") {
      return res.status(400).json({ message: "name is required" });
    }
    name = name.trim();
    if (name.length < 2 || name.length > 60) {
      return res.status(400).json({ message: "name must be 2-60 chars" });
    }

    if (!muscleGroup) {
      return res.status(400).json({ message: "muscleGroup is required" });
    }

    // IMPORTANT: muscleGroup must match your Prisma enum exactly
    // Example allowed list (edit to match YOUR enum):
    const allowed = ["CHEST","BACK","SHOULDERS","LEGS","BICEPS","TRICEPS","TRAPS","FOREARMS","CORE"];
    if (!allowed.includes(muscleGroup)) {
      return res.status(400).json({ message: `Invalid muscleGroup: ${muscleGroup}` });
    }

    // Prevent duplicates for this user (same name)
    const existing = await prisma.exercise.findFirst({
      where: { name, createdByUserId: userId },
    });
    if (existing) {
      return res.status(409).json({ message: "You already have this exercise" });
    }

    const ex = await prisma.exercise.create({
      data: {
        name,
        muscleGroup,
        createdByUserId: userId,
        isGlobal: false,
      },
      select: { id: true, name: true, muscleGroup: true, isGlobal: true },
    });

    res.status(201).json({ exercise: ex });
  } catch (err) {
    console.error("createExercise error:", err);
    res.status(500).json({ message: "Failed to create exercise" });
  }
}

module.exports = { listExercises, createExercise };
