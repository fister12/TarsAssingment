# Vercel Environment Variables Setup

## Add these environment variables to your Vercel project:

### From `.env.local`:

1. **NEXT_PUBLIC_CONVEX_URL**
   - Value: `https://kindly-cricket-117.eu-west-1.convex.cloud`
   - (This is your production Convex deployment URL)

2. **NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY**
   - Value: `pk_test_cXVpZXQtcGxhdHlwdXMtODUuY2xlcmsuYWNjb3VudHMuZGV2JA`
   - (This is from your `.env.local`)

3. **CLERK_SECRET_KEY** ⚠️ IMPORTANT
   - Value: `sk_test_Q0m9YIZO8MxIRPukfzCqWXJ7XX6ccl5LjYecFRJr7Q`
   - (This is from your `.env.local` - make sure it's marked as Secret)

4. **CONVEX_DEPLOYMENT** (optional for build, but good to have)
   - Value: `kindly-cricket-117`
   - (Your production Convex deployment ID)

## Steps to add in Vercel:

1. Go to your Vercel project dashboard
2. Click Settings → Environment Variables
3. Add each variable above
4. Mark `CLERK_SECRET_KEY` as encrypted/secret
5. Redeploy your application (push to GitHub or manually redeploy)

## Variables breakdown:

- **PUBLIC** variables (NEXT_PUBLIC_*): Visible in browser, safe to expose
- **SECRET** variables (CLERK_SECRET_KEY): DO NOT expose, kept on server only

Once these are set in Vercel, redeploy your app and the middleware errors should be resolved.
