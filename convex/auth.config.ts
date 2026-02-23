// Convex + Clerk auth configuration
// The CLERK_ISSUER_URL environment variable must be set in the Convex dashboard.

const authConfig = {
  providers: [
    {
      domain: process.env.CLERK_ISSUER_URL,
      applicationID: "convex",
    },
  ],
};

export default authConfig;
