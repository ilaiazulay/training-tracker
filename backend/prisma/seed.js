// prisma/seed.js
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  // Map exercise name -> image filename in /frontend/public/exercises/
  // NOTE: The URL stored is "/exercises/<filename>" (served by Vite from public/)
  const exercises = [
    // Chest
    {
      name: "Chest Press Machine",
      muscleGroup: "CHEST",
      imageUrl: "/exercises/ChestPressMachine.jpg",
    },
    {
      name: "Dumbbell Fly",
      muscleGroup: "CHEST",
      imageUrl: "/exercises/DumbbellFly.jpg",
    },
    {
      name: "Incline Chest Press Machine",
      muscleGroup: "CHEST",
      imageUrl: "/exercises/InclineChestPressMachine.jpg",
    },

    // Shoulders
    {
      name: "Side Lateral Raises",
      muscleGroup: "SHOULDERS",
      imageUrl: "/exercises/SideLateralRaises.jpg",
    },
    {
      name: "Dumbbell Rear Delt Fly",
      muscleGroup: "SHOULDERS",
      imageUrl: "/exercises/DumbbellRearDeltFly.jpg",
    },

    // Triceps
    {
      name: "Triceps Pushdown Machine",
      muscleGroup: "TRICEPS",
      imageUrl: "/exercises/TricepsPushdownMachine.jpg",
    },
    {
      name: "Triceps Extension",
      muscleGroup: "TRICEPS",
      imageUrl: "/exercises/TricepsExtension.jpg",
    },
    {
      name: "Dumbbell Overhead Triceps Extension",
      muscleGroup: "TRICEPS",
      imageUrl: "/exercises/DumbbellOverheadTricepsExtension.jpg",
    },

    // Back
    {
      name: "Lat Pulldown",
      muscleGroup: "BACK",
      imageUrl: "/exercises/LatPulldown.jpg",
    },
    {
      name: "Machine Lat Pulldown",
      muscleGroup: "BACK",
      imageUrl: "/exercises/MachineLatPulldown.jpg",
    },
    {
      name: "Machine Row",
      muscleGroup: "BACK",
      imageUrl: "/exercises/MachineRow.jpg",
    },

    // Biceps
    {
      name: "Barbell Curl",
      muscleGroup: "BICEPS",
      imageUrl: "/exercises/BarbellCurl.jpg",
    },
    {
      name: "Dumbbell Curl",
      muscleGroup: "BICEPS",
      imageUrl: "/exercises/DumbbellCurl.jpg",
    },
    {
      name: "Hammer Curls",
      muscleGroup: "BICEPS",
      imageUrl: "/exercises/HammerCurls.jpg",
    },

    // Legs
    {
      name: "Leg Press Machine",
      muscleGroup: "LEGS",
      imageUrl: "/exercises/LegPressMachine.jpg",
    },
    {
      name: "Leg Extension Machine",
      muscleGroup: "LEGS",
      imageUrl: "/exercises/LegExtensionMachine.jpg",
    },

    // Traps
    {
      name: "Cable Shrugs",
      muscleGroup: "TRAPS",
      imageUrl: "/exercises/CableShrugs.jpg",
    },
    {
      name: "Dumbbell Shrugs",
      muscleGroup: "TRAPS",
      imageUrl: "/exercises/DumbbellShrugs.jpg",
    },

    // Forearms
    {
      name: "Forearm Curls",
      muscleGroup: "FOREARMS",
      imageUrl: "/exercises/ForearmCurls.jpg",
    },
  ];

  let created = 0;
  let updated = 0;

  for (const ex of exercises) {
    const existing = await prisma.exercise.findFirst({
      where: { name: ex.name, isGlobal: true },
      select: { id: true, muscleGroup: true, imageUrl: true },
    });

    if (!existing) {
      await prisma.exercise.create({
        data: {
          name: ex.name,
          muscleGroup: ex.muscleGroup,
          imageUrl: ex.imageUrl,
          isGlobal: true,
          createdByUserId: null,
        },
      });
      created++;
      continue;
    }

    // Update if anything changed (muscleGroup / imageUrl)
    const needsUpdate =
      existing.muscleGroup !== ex.muscleGroup || existing.imageUrl !== ex.imageUrl;

    if (needsUpdate) {
      await prisma.exercise.update({
        where: { id: existing.id },
        data: {
          muscleGroup: ex.muscleGroup,
          imageUrl: ex.imageUrl,
        },
      });
      updated++;
    }
  }

  console.log(`✅ Seed complete. Created: ${created}, Updated: ${updated}`);
}

main()
  .catch((e) => {
    console.error("Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
