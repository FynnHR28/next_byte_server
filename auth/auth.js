import bcrypt from 'bcrypt';
import jwt  from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

const APP_SECRET = process.env.SUPER_SECRET


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
  }
  next();
}
