import bcrypt from "bcrypt";
import { connectDb, disconnectDb } from "../src/config/db.js";
import { User } from "../src/models/User.js";
import { createOwnerPermissions } from "../src/types/permissions.js";

const SEED_EMAIL = process.env.SEED_ADMIN_EMAIL || "admin@divniq.com";
const SEED_PASSWORD = process.env.SEED_ADMIN_PASSWORD || "admin123";
const SEED_NAME = process.env.SEED_ADMIN_NAME || "System Admin";

async function seedAdmin(): Promise<void> {
  if (
    process.env.NODE_ENV === "production" &&
    (!process.env.SEED_ADMIN_PASSWORD ||
      process.env.SEED_ADMIN_PASSWORD === "admin123")
  ) {
    throw new Error(
      "Refuse to seed in production with default password. Set a strong SEED_ADMIN_PASSWORD."
    );
  }

  await connectDb();

  // Remove legacy documents from the previous schema (email/passwordHash)
  await User.deleteMany({
    $or: [{ work_email: { $exists: false } }, { work_email: null }],
  });

  const password_hash = await bcrypt.hash(SEED_PASSWORD, 12);
  const email = SEED_EMAIL.toLowerCase();
  const [first_name, ...rest] = SEED_NAME.trim().split(/\s+/);
  const last_name = rest.join(" ") || "Admin";

  const user = await User.findOneAndUpdate(
    { work_email: email },
    {
      $set: {
        first_name: first_name || "System",
        last_name,
        work_email: email,
        password_hash,
        role: "Owner",
        status: "Active",
        employee_id: "OWN0001",
        permissions: createOwnerPermissions(),
        must_change_password: false,
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  )
    .select("_id first_name last_name work_email role status permissions")
    .lean()
    .exec();

  if (!user) {
    throw new Error("Seed returned no user document");
  }

  console.log("Owner user ready:");
  console.log(`  id:    ${String(user._id)}`);
  console.log(`  email: ${user.work_email}`);
  console.log(`  role:  ${user.role}`);
  console.log(
    `  login password: (value from SEED_ADMIN_PASSWORD / default demo)`
  );
}

seedAdmin()
  .catch((err: unknown) => {
    const message = err instanceof Error ? err.message : String(err);
    console.error("Seed failed:", message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await disconnectDb();
  });
