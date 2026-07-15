import { db } from './src/db/index.ts';
import { users } from './src/db/schema.ts';
async function run() {
  console.log(await db.select().from(users).limit(1));
}
run();
