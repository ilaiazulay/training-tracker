// src/controllers/planController.js
const prisma = require("../prisma");

// ✅ UPDATED: Map with images
const EXERCISE_DATA = {
  "Chest Press Machine": { muscleGroup: "CHEST", imageUrl: "/exercises/ChestPressMachine.jpg" },
  "Dumbbell Fly": { muscleGroup: "CHEST", imageUrl: "/exercises/DumbbellFly.jpg" },
  "Incline Chest Press Machine": { muscleGroup: "CHEST", imageUrl: "/exercises/InclineChestPressMachine.jpg" },
  "Side Lateral Raises": { muscleGroup: "SHOULDERS", imageUrl: "/exercises/SideLateralRaises.jpg" },
  "Dumbbell Rear Delt Fly": { muscleGroup: "SHOULDERS", imageUrl: "/exercises/DumbbellRearDeltFly.jpg" },
  "Triceps Pushdown Machine": { muscleGroup: "TRICEPS", imageUrl: "/exercises/TricepsPushdownMachine.jpg" },
  "Triceps Extension": { muscleGroup: "TRICEPS", imageUrl: "/exercises/TricepsExtension.jpg" },
  "Dumbbell Overhead Triceps Extension": { muscleGroup: "TRICEPS", imageUrl: "/exercises/DumbbellOverheadTricepsExtension.jpg" },
  "Lat Pulldown": { muscleGroup: "BACK", imageUrl: "/exercises/LatPulldown.jpg" },
  "Machine Lat Pulldown": { muscleGroup: "BACK", imageUrl: "/exercises/MachineLatPulldown.jpg" },
  "Machine Row": { muscleGroup: "BACK", imageUrl: "/exercises/MachineRow.jpg" },
  "Barbell Curl": { muscleGroup: "BICEPS", imageUrl: "/exercises/BarbellCurl.jpg" },
  "Dumbbell Curl": { muscleGroup: "BICEPS", imageUrl: "/exercises/DumbbellCurl.jpg" },
  "Hammer Curls": { muscleGroup: "BICEPS", imageUrl: "/exercises/HammerCurls.jpg" },
  "Leg Press Machine": { muscleGroup: "LEGS", imageUrl: "/exercises/LegPressMachine.jpg" },
  "Leg Extension Machine": { muscleGroup: "LEGS", imageUrl: "/exercises/LegExtensionMachine.jpg" },
  "Cable Shrugs": { muscleGroup: "TRAPS", imageUrl: "/exercises/CableShrugs.jpg" },
  "Dumbbell Shrugs": { muscleGroup: "TRAPS", imageUrl: "/exercises/DumbbellShrugs.jpg" },
  "Forearm Curls": { muscleGroup: "FOREARMS", imageUrl: "/exercises/ForearmCurls.jpg" },
  // Fallbacks for standard names if not in seed
  "Bench Press": { muscleGroup: "CHEST", imageUrl: null },
  "Squat": { muscleGroup: "LEGS", imageUrl: null },
};

const defaultPlanBySplit = {
  AB: [
    {
      dayKey: "A",
      label: "Upper (Chest/Shoulders/Triceps)",
      muscles: "Chest, Shoulders, Triceps",
      exercises: [
        "Chest Press Machine",
        "Dumbbell Fly",
        "Side Lateral Raises",
        "Triceps Pushdown Machine",
        "Dumbbell Overhead Triceps Extension"
      ],
    },
    {
      dayKey: "B",
      label: "Lower & Back",
      muscles: "Legs, Back, Biceps",
      exercises: [
        "Leg Press Machine",
        "Leg Extension Machine",
        "Machine Lat Pulldown",
        "Machine Row",
        "Dumbbell Curl",
        "Hammer Curls",
      ],
    },
  ],
  ABC: [
    {
      dayKey: "A",
      label: "Chest / Shoulders / Triceps",
      muscles: "Chest, Shoulders, Triceps",
      exercises: [
        "Chest Press Machine",
        "Dumbbell Fly",
        "Incline Chest Press Machine",
        "Side Lateral Raises",
        "Triceps Pushdown Machine",
        "Triceps Extension",
        "Dumbbell Overhead Triceps Extension",
      ],
    },
    {
      dayKey: "B",
      label: "Back / Rear Delts / Biceps",
      muscles: "Back, Rear Delts, Biceps",
      exercises: [
        "Lat Pulldown",
        "Machine Lat Pulldown",
        "Machine Row",
        "Dumbbell Rear Delt Fly",
        "Barbell Curl",
        "Dumbbell Curl",
        "Hammer Curls",
      ],
    },
    {
      dayKey: "C",
      label: "Legs / Traps / Forearms",
      muscles: "Legs, Traps, Forearms",
      exercises: [
        "Leg Press Machine",
        "Leg Extension Machine",
        "Cable Shrugs",
        "Dumbbell Shrugs",
        "Forearm Curls",
      ],
    },
  ],
  ABCD: [], // Add if needed
  FULL_BODY: [] // Add if needed
};

async function generateDefaultPlan(req, res) {
  try {
    const userId = req.user.id;

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const planType = user.planType;
    const template = defaultPlanBySplit[planType];

    if (!template || template.length === 0) {
      // Fallback if specific split not defined above
      return res.status(400).json({
        message: `No default template defined for split ${planType}`,
      });
    }

    // Clear existing plan for this user (if any)
    await prisma.userTrainingDayExercise.deleteMany({
      where: { trainingDay: { userId: userId } },
    });

    await prisma.userTrainingDay.deleteMany({
      where: { userId },
    });

    const createdDays = [];

    for (const day of template) {
      const trainingDay = await prisma.userTrainingDay.create({
        data: {
          userId,
          dayKey: day.dayKey,
          label: day.label,
          notes: day.muscles,
        },
      });
    
      createdDays.push(trainingDay);
    
      for (let i = 0; i < day.exercises.length; i++) {
        const name = day.exercises[i];
        const knownData = EXERCISE_DATA[name];
    
        let exercise = await prisma.exercise.findFirst({
          where: {
            name,
            OR: [
              { isGlobal: true },
              { createdByUserId: userId },
            ],
          },
        });
    
        if (!exercise) {
          // ✅ FIX: Use known metadata if available
          const muscleGroup = knownData?.muscleGroup || getMuscleGroupForExercise(day.dayKey);
          const imageUrl = knownData?.imageUrl || null;
    
          exercise = await prisma.exercise.create({
            data: {
              name,
              createdByUserId: userId,
              muscleGroup,
              imageUrl, // ✅ Populating image here!
              isGlobal: false,
            },
          });
        }
    
        await prisma.userTrainingDayExercise.create({
          data: {
            trainingDayId: trainingDay.id,
            exerciseId: exercise.id,
            orderIndex: i,
          },
        });
      }
    }    

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { hasConfiguredPlan: true },
    });

    return res.json({
      message: "Default plan generated",
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        name: updatedUser.name,
        planType: updatedUser.planType,
        hasCompletedOnboarding: updatedUser.hasCompletedOnboarding,
        hasConfiguredPlan: updatedUser.hasConfiguredPlan,
      },
      trainingDays: createdDays,
    });
  } catch (err) {
    console.error("generateDefaultPlan error:", err);
    return res
      .status(500)
      .json({ message: "Failed to generate default plan" });
  }
}

// Helper: guess muscle group by dayKey (Fallback)
function getMuscleGroupForExercise(dayKey) {
  switch (dayKey) {
    case "A": return "CHEST";
    case "B": return "BACK";
    case "C": return "LEGS";
    default: return "CHEST";
  }
}

async function saveCustomPlan(req, res) {
  try {
    const userId = req.user.id;
    const { days } = req.body;

    if (!Array.isArray(days) || days.length === 0) {
      return res.status(400).json({ message: "days is required" });
    }

    // Validate day structure
    for (const d of days) {
      if (!d.dayKey || typeof d.dayKey !== "string") {
        return res.status(400).json({ message: "Each day must include dayKey" });
      }
      if (!Array.isArray(d.exerciseIds)) {
        return res.status(400).json({ message: "Each day must include exerciseIds[]" });
      }
      if (!Array.isArray(d.muscleGroups)) {
        return res.status(400).json({ message: "Each day must include muscleGroups[]" });
      }
    }

    // Clear existing plan
    await prisma.userTrainingDayExercise.deleteMany({
      where: { trainingDay: { userId } },
    });
    await prisma.userTrainingDay.deleteMany({ where: { userId } });

    // Create new plan
    const createdDays = [];

    for (const d of days) {
      const label = d.muscleGroups.length
        ? d.muscleGroups.join(" / ")
        : `Day ${d.dayKey}`;

      const trainingDay = await prisma.userTrainingDay.create({
        data: {
          userId,
          dayKey: d.dayKey,
          label,
          notes: null,
        },
      });

      createdDays.push(trainingDay);

      for (let i = 0; i < d.exerciseIds.length; i++) {
        await prisma.userTrainingDayExercise.create({
          data: {
            trainingDayId: trainingDay.id,
            exerciseId: d.exerciseIds[i],
            orderIndex: i,
          },
        });
      }
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { hasConfiguredPlan: true },
    });

    return res.json({
      message: "Custom plan saved",
      user: {
        id: updatedUser.id,
        hasConfiguredPlan: updatedUser.hasConfiguredPlan,
      },
      trainingDays: createdDays,
    });
  } catch (err) {
    console.error("saveCustomPlan error:", err);
    return res.status(500).json({ message: "Failed to save custom plan" });
  }
}

async function getMyPlan(req, res) {
  try {
    const userId = req.user.id;

    const trainingDays = await prisma.userTrainingDay.findMany({
      where: { userId },
      orderBy: { dayKey: "asc" },
      include: {
        exercises: {
          orderBy: { orderIndex: "asc" },
          include: {
            exercise: true, 
          },
        },
      },
    });

    return res.json({
      days: trainingDays.map((d) => {
        const exerciseIds = d.exercises.map((x) => x.exerciseId);

        const muscleGroups = Array.from(
          new Set(d.exercises.map((x) => x.exercise?.muscleGroup).filter(Boolean))
        );

        return {
          dayKey: d.dayKey,
          muscleGroups,          
          exerciseIds,
        };
      }),
    });
  } catch (err) {
    console.error("getMyPlan error:", err);
    return res.status(500).json({ message: "Failed to load plan" });
  }
}

async function getCurrentPlan(req, res) {
  try {
    const userId = req.user.id;

    const trainingDays = await prisma.userTrainingDay.findMany({
      where: { userId },
      orderBy: { dayKey: "asc" },
      include: {
        exercises: {
          orderBy: { orderIndex: "asc" },
          include: {
            exercise: true,
          },
        },
      },
    });

    return res.json({
      trainingDays: trainingDays.map((d) => ({
        dayKey: d.dayKey,
        label: d.label,
        exercises: d.exercises.map((x) => ({
          exerciseId: x.exerciseId,
          name: x.exercise.name,
          muscleGroup: x.exercise.muscleGroup,
          orderIndex: x.orderIndex,
        })),
      })),
    });
  } catch (err) {
    console.error("getCurrentPlan error:", err);
    return res.status(500).json({ message: "Failed to load current plan" });
  }
}

module.exports = {
  generateDefaultPlan,
  saveCustomPlan,
  getMyPlan,
  getCurrentPlan,
};