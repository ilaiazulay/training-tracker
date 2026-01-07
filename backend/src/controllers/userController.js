const prisma = require("../prisma");

// POST /user/onboarding
async function completeOnboarding(req, res) {
  try {
    const userId = req.user.id; // from auth middleware
    let { gender, age, heightCm, planType } = req.body;

    // Normalize empty strings to undefined
    if (gender === "") gender = undefined;
    if (age === "" || age === null) age = undefined;
    if (heightCm === "" || heightCm === null) heightCm = undefined;
    if (planType === "") planType = undefined;

    // ----- VALIDATION -----
    const allowedGenders = ["MALE", "FEMALE"];
    const allowedPlans = ["AB", "ABC", "ABCD", "FULL_BODY"];

    // planType is required in onboarding
    if (!planType) {
      return res
        .status(400)
        .json({ message: "planType is required for onboarding." });
    }

    if (!allowedPlans.includes(planType)) {
      return res.status(400).json({
        message: `Invalid planType. Must be one of: ${allowedPlans.join(", ")}`,
      });
    }

    // gender is optional, but if sent, must be valid
    if (gender && !allowedGenders.includes(gender)) {
      return res.status(400).json({
        message: `Invalid gender. Must be one of: ${allowedGenders.join(", ")}`,
      });
    }

    // age: optional, but if sent, must be integer 10–100
    let ageNumber;
    if (age !== undefined) {
      ageNumber = Number(age);
      if (
        !Number.isInteger(ageNumber) ||
        ageNumber < 10 ||
        ageNumber > 100
      ) {
        return res.status(400).json({
          message: "Age must be an integer between 10 and 100.",
        });
      }
    }

    // heightCm: optional, but if sent, must be integer 120–230
    let heightNumber;
    if (heightCm !== undefined) {
      heightNumber = Number(heightCm);
      if (
        !Number.isInteger(heightNumber) ||
        heightNumber < 120 ||
        heightNumber > 230
      ) {
        return res.status(400).json({
          message: "Height must be an integer between 120 and 230 cm.",
        });
      }
    }

    // ----- BUILD DATA OBJECT FOR UPDATE -----
    const data = {
      hasCompletedOnboarding: true,
      planType,
    };

    if (gender) data.gender = gender;
    if (ageNumber !== undefined) data.age = ageNumber;
    if (heightNumber !== undefined) data.heightCm = heightNumber;

    // ----- UPDATE USER -----
    const updated = await prisma.user.update({
      where: { id: userId },
      data,
    });

    return res.json({
      user: {
        id: updated.id,
        email: updated.email,
        name: updated.name,
        planType: updated.planType,
        hasCompletedOnboarding: updated.hasCompletedOnboarding,
        gender: updated.gender,
        age: updated.age,
        heightCm: updated.heightCm,
      },
    });
  } catch (err) {
    console.error("Onboarding error:", err);
    return res.status(500).json({ message: "Failed to complete onboarding" });
  }
}

module.exports = {
  completeOnboarding,
};
