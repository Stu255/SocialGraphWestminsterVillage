import { db } from "@db";
import { users } from "@db/schema";
import { scrypt, randomBytes } from "crypto";
import { promisify } from "util";

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function createTestUser() {
  const hashedPassword = await hashPassword("password123");
  
  await db.insert(users).values({
    username: "test@example.com",
    password: hashedPassword
  });
  
  console.log("Test user created successfully");
}

createTestUser().catch(console.error);
