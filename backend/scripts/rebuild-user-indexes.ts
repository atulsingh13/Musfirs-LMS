/**
 * Drop legacy / corrupt indexes on the users collection and rebuild
 * from the current Mongoose schema.
 *
 * Also clears empty-string values on optional unique fields so sparse
 * indexes work correctly (sparse skips null/missing, NOT "").
 *
 * Run: npm run db:rebuild-user-indexes
 */
import { connectDb, disconnectDb } from "../src/config/db.js";
import { syncUserIndexes, User } from "../src/models/User.js";

async function main() {
  await connectDb();

  const cleaned = await User.updateMany(
    {
      $or: [
        { employee_id: "" },
        { personal_email: "" },
        { personal_email: null },
      ],
    },
    {
      $unset: {
        employee_id: "",
        personal_email: "",
      },
    }
  );
  console.log(
    `Cleaned empty unique fields on ${cleaned.modifiedCount} document(s)`
  );

  const before = await User.collection.indexes();
  console.log(
    "Indexes before:",
    before.map((index) => ({ name: index.name, key: index.key, sparse: index.sparse }))
  );

  await syncUserIndexes();

  const after = await User.collection.indexes();
  console.log(
    "Indexes after:",
    after.map((index) => ({ name: index.name, key: index.key, sparse: index.sparse }))
  );
}

main()
  .catch((err: unknown) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await disconnectDb();
  });
