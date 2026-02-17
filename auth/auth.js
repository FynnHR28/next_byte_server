import bcrypt from 'bcrypt';
import jwt  from 'jsonwebtoken';
import dotenv from 'dotenv';
import crypto from 'crypto';

dotenv.config();

const APP_SECRET = process.env.SUPER_SECRET
const IS_PROD = process.env.NODE_ENV === "production";

export const ACCESS_TOKEN_TIME = "10m"; // 10 minutes
export const ACCESS_COOKIE_MAX_AGE_MS = 10 * 60 * 1000; // 10 minutes
export const REFRESH_COOKIE_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

const baseCookieOptions = {
  httpOnly: true,
  sameSite: "lax",
  secure: IS_PROD,
  path: "/",
};

export async function hashPassword(plainPassword) {
  const saltRounds = 10; // Recommended salt rounds (adjust based on your needs)
  const hashedPassword = await bcrypt.hash(plainPassword, saltRounds);
  return hashedPassword;
}

export async function checkPasswords(plainPassword, hashedPassword) {
  const isMatch = await bcrypt.compare(plainPassword, hashedPassword);
  return isMatch;
}

export const authMiddleware = (req, res, next) => {
  // Get the token from cookies
  const token = req.cookies?.access_token;

  if (!token) {
    req.userId = null;
    return next();
  }

  try {
    // Verify the token using secret key
    const user = jwt.verify(token, APP_SECRET); 
    req.userId = user.userId; // Attach the user ID to the request object
    req.userRole = user.userRole;
    console.log(`id of requester: ${req.userId}, role: ${req.userRole}`)
  } catch (err) {
    console.error("Token verification failed:", err.message);
    req.userId = null
    req.userRole = null
  }
  next();
}

// Sign a JWT access token using user ID and role
export const signAccessToken = (userId, userRole) => {
  return jwt.sign({ userId, userRole }, APP_SECRET, { expiresIn: ACCESS_TOKEN_TIME });
};

// Generate a random refresh token
export const generateRefreshToken = () => {
  return crypto.randomBytes(48).toString("base64url");
};

// Hash the refresh token before storing it in the db so a db leak doesn't let poeple access sessions
export const hashRefreshToken = (rawToken) => {
  return crypto.createHash("sha256").update(rawToken).digest("hex");
};

// Cookie options for access and refresh tokens. These are used when setting cookies in responses.
export const accessCookieOptions = {
  ...baseCookieOptions,
  maxAge: ACCESS_COOKIE_MAX_AGE_MS,
};

export const refreshCookieOptions = {
  ...baseCookieOptions,
  maxAge: REFRESH_COOKIE_MAX_AGE_MS,
};
