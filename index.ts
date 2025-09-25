import express from "express";
import cookieParser from "cookie-parser";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import path from "path";
import { PrismaClient } from "@prisma/client";

const app = express();
const prisma = new PrismaClient();

const JWT_SECRET = process.env.JWT_SECRET || "dev_secret";

// Serve static frontend from /public (make sure you have a /public folder)
const staticRoot = path.join(__dirname, "public");

// Middleware
app.use(express.json({ limit: "2mb" })); // allow base64 profile pics in Details/Profile
app.use(cookieParser());

// Helpers
function signToken(userId: string) {
  return jwt.sign({ sub: userId }, JWT_SECRET, { expiresIn: "7d" });
}
function requireAuth(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) {
  const token = (req as any).cookies?.sid;
  if (!token) return res.status(401).json({ error: "Unauthorized" });
  try {
    const payload = jwt.verify(token, JWT_SECRET) as { sub: string };
    (req as any).userId = payload.sub;
    next();
  } catch {
    return res.status(401).json({ error: "Unauthorized" });
  }
}
function toPublicUser(u: any) {
  if (!u) return null;
  const { passwordHash, ...rest } = u;
  return rest;
}

// Health
app.get("/api/health", (_req, res) => res.json({ ok: true }));

// Debug (DEV ONLY — remove before production)
// WARNING: This returns passwordHash as well. Use to inspect DB during development.
app.get("/api/debug/users", async (_req, res) => {
  const users = await prisma.user.findMany();
  res.json({ users });
});

// Register
app.post("/api/auth/register", async (req, res) => {
  try {
    const { username, email, password } = (req.body || {}) as {
      username?: string;
      email?: string;
      password?: string;
    };
    if (!username || !email || !password) {
      return res.status(400).json({ error: "Missing required fields" });
    }
    const exists = await prisma.user.findFirst({
      where: { OR: [{ email: email.toLowerCase() }, { username }] },
    });
    if (exists) return res.status(409).json({ error: "User already exists" });

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({
      data: {
        username,
        email: email.toLowerCase(),
        passwordHash,
        role: "Player", // updated later in Details
      },
    });
    const token = signToken(user.id);
    res.cookie("sid", token, { httpOnly: true, sameSite: "lax" });
    return res.status(201).json(toPublicUser(user));
  } catch (e) {
    console.error("REGISTER_ERROR", e);
    return res.status(500).json({ error: "Server error" });
  }
});

// Login (email OR username)
app.post("/api/auth/login", async (req, res) => {
  try {
    const { identifier, password } = (req.body || {}) as {
      identifier?: string;
      password?: string;
    };
    if (!identifier || !password) {
      return res.status(400).json({ error: "Missing credentials" });
    }
    const idLower = String(identifier).trim().toLowerCase();
    const user = await prisma.user.findFirst({
      where: { OR: [{ email: idLower }, { username: idLower }] },
    });
    if (!user) return res.status(401).json({ error: "Invalid credentials" });

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return res.status(401).json({ error: "Invalid credentials" });

    const token = signToken(user.id);
    res.cookie("sid", token, { httpOnly: true, sameSite: "lax" });
    return res.json(toPublicUser(user));
  } catch (e) {
    console.error("LOGIN_ERROR", e);
    return res.status(500).json({ error: "Server error" });
  }
});

// Logout
app.post("/api/auth/logout", (_req, res) => {
  res.clearCookie("sid");
  res.json({ ok: true });
});

// Me (get)
app.get("/api/me", requireAuth, async (req, res) => {
  try {
    const userId = (req as any).userId as string;
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return res.status(404).json({ error: "Not found" });
    res.json(toPublicUser(user));
  } catch (e) {
    console.error("ME_GET_ERROR", e);
    res.status(500).json({ error: "Server error" });
  }
});

// Me (update) — Details/Profile
app.patch("/api/me", requireAuth, async (req, res) => {
  try {
    const userId = (req as any).userId as string;
    const {
      name,
      dob,
      gender,
      mobile,
      role,
      sport,
      profilePic,
      height,
      weight,
      bloodgroup,
      address,
    } = (req.body || {}) as Record<string, unknown>;

    if (mobile && !/^[0-9]{10}$/.test(String(mobile))) {
      return res.status(400).json({ error: "Mobile must be 10 digits" });
    }

    const data: any = {};
    if (name !== undefined) data.name = String(name);
    if (dob !== undefined) data.dob = dob ? new Date(String(dob)) : null;
    if (gender !== undefined) data.gender = String(gender);
    if (mobile !== undefined) data.mobile = String(mobile);
    if (role !== undefined) data.role = String(role);
    if (sport !== undefined) data.sport = String(sport);
    if (profilePic !== undefined) data.profilePic = String(profilePic);
    if (height !== undefined)
      data.height = height === null ? null : Number(height);
    if (weight !== undefined)
      data.weight = weight === null ? null : Number(weight);
    if (bloodgroup !== undefined) data.bloodgroup = String(bloodgroup);
    if (address !== undefined) data.address = String(address);

    const updated = await prisma.user.update({ where: { id: userId }, data });
    res.json(toPublicUser(updated));
  } catch (e) {
    console.error("ME_PATCH_ERROR", e);
    res.status(500).json({ error: "Server error" });
  }
});

// Static frontend (place your HTML/CSS/JS under /public)
app.use(express.static(staticRoot));

/**
 * Start server with port auto‑fallback.
 * In CodeSandbox, 3000 is often used by a default server; this tries 3001, 3002, ... as needed.
 */
const START_PORT = Number(process.env.PORT) || 3001;

function startServer(port: number) {
  const server = app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
  });

  server.on("error", (err: any) => {
    if (err && err.code === "EADDRINUSE") {
      const nextPort = port + 1;
      console.warn(`Port ${port} in use, trying ${nextPort}...`);
      startServer(nextPort);
    } else {
      console.error("Server error:", err);
      process.exit(1);
    }
  });
}

startServer(START_PORT);
