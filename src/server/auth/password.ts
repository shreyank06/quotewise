import bcrypt from "bcryptjs";

const COST = 12;

export const hashPassword = (password: string) => bcrypt.hash(password, COST);
export const verifyPassword = (password: string, hash: string) => bcrypt.compare(password, hash);

// Compared against when the email doesn't exist, so response time doesn't reveal which emails are registered.
let dummyHash: Promise<string> | null = null;
export function verifyAgainstDummy(password: string): Promise<boolean> {
  dummyHash ??= bcrypt.hash("no-such-user", COST);
  return dummyHash.then((h) => bcrypt.compare(password, h));
}
