// src/controllers/authController.js
const bcrypt = require("bcrypt");
const prisma = require("../prisma");
const {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
} = require("../utils/token");
const { OAuth2Client } = require("google-auth-library");

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

function toAuthUser(user) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    planType: user.planType,
    hasCompletedOnboarding: user.hasCompletedOnboarding,
    hasConfiguredPlan: user.hasConfiguredPlan, // ✅ IMPORTANT
    gender: user.gender,
    age: user.age,
    heightCm: user.heightCm,
  };
}

// POST /auth/signup
async function signup(req, res) {
  try {
    const { email, password, name, planType } = req.body;

    if (!email || !password || !name || !planType) {
      return res.status(400).json({ message: "Missing fields" });
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return res.status(409).json({ message: "Email already in use" });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        name,
        planType, // AB / ABC / ABCD / FULL_BODY
      },
    });

    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    return res.status(201).json({
      user: toAuthUser(user),
      tokens: { accessToken, refreshToken },
    });
  } catch (err) {
    console.error("Signup error:", err);
    return res.status(500).json({ message: "Server error" });
  }
}

// POST /auth/login
async function login(req, res) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Missing email or password" });
    }

    const user = await prisma.user.findUnique({ where: { email } });

    if (!user || !user.passwordHash) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    return res.status(200).json({
      user: toAuthUser(user),
      tokens: { accessToken, refreshToken },
    });
  } catch (err) {
    console.error("Login error:", err);
    return res.status(500).json({ message: "Server error" });
  }
}

// POST /auth/refresh
async function refresh(req, res) {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(400).json({ message: "Missing refresh token" });
    }

    let payload;
    try {
      payload = verifyRefreshToken(refreshToken);
    } catch {
      return res.status(401).json({ message: "Invalid refresh token" });
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
    });

    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }

    const newAccessToken = generateAccessToken(user);
    const newRefreshToken = generateRefreshToken(user);

    // (Optional) You can also return user here, but not required
    return res.json({
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    });
  } catch (err) {
    console.error("Refresh error:", err);
    return res.status(500).json({ message: "Server error" });
  }
}

// POST /auth/google
async function loginWithGoogle(req, res) {
  try {
    const { idToken, planType, nameFallback } = req.body;

    if (!idToken) {
      return res.status(400).json({ message: "Missing idToken" });
    }

    const ticket = await googleClient.verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    const googleId = payload.sub;
    const email = payload.email;
    const nameFromGoogle = payload.name || email.split("@")[0];

    let user = await prisma.user.findFirst({
      where: { OR: [{ googleId }, { email }] },
    });

    if (!user) {
      const plan = planType || "AB";
      user = await prisma.user.create({
        data: {
          email,
          googleId,
          name: nameFallback || nameFromGoogle,
          planType: plan,
        },
      });
    } else if (!user.googleId) {
      user = await prisma.user.update({
        where: { id: user.id },
        data: { googleId },
      });
    }

    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    return res.status(200).json({
      user: toAuthUser(user),
      tokens: { accessToken, refreshToken },
    });
  } catch (err) {
    console.error("Google auth error:", err);
    return res.status(500).json({ message: "Google authentication failed" });
  }
}

module.exports = {
  signup,
  login,
  refresh,
  loginWithGoogle,
};
