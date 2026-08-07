import { createApp } from "./app.js";
import { env } from "./config/env.js";
import { disconnectDb } from "./shared/db/prisma.js";

const app = createApp();
const server = app.listen(env.PORT, () => {
  console.log(`API listening on http://localhost:${env.PORT}`);
});

// Close the DB pool on shutdown so containers stop cleanly instead of
// hanging on an open connection.
for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, () => {
    server.close(async () => {
      await disconnectDb();
      process.exit(0);
    });
  });
}
