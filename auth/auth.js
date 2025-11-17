import bcrypt from 'bcrypt';



export async function hashPassword(plainPassword) {
  const saltRounds = 10; // Recommended salt rounds (adjust based on your needs)
  const hashedPassword = await bcrypt.hash(plainPassword, saltRounds);
  return hashedPassword;
}

export async function checkPasswords(plainPassword, hashedPassword) {
  const isMatch = await bcrypt.compare(plainPassword, hashedPassword);
  return isMatch;
}
