import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Clean up expired ephemeral messages every hour
crons.interval(
  "cleanup expired messages",
  { hours: 1 },
  internal.messages.cleanupExpiredMessages
);

export default crons;
