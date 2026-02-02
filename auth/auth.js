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
  const authHeader = req.headers.authorization;
  if (authHeader) {
    const token = authHeader.split(' ')[1]; // Get the token part (Bearer <token>)
    try {
      // Verify the token using your secret key
      const user = jwt.verify(token, APP_SECRET); 
      req.userId = user.userId; // Attach the user ID to the request object
      console.log(`id of requester: ${req.userId}`)
    } catch (err) {
      console.error("Token verification failed:", err.message);
      // Optionally handle errors, e.g., by setting req.userId to null/undefined
      req.userId = null
    }
  }
  else {
    req.userId = null
  }
  next();
}
