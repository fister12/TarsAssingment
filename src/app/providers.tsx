"use client";

import { ClerkProvider, useAuth } from "@clerk/nextjs";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import { ConvexReactClient } from "convex/react";
import { ReactNode } from "react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "./theme-provider";

const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL!;
const convex = new ConvexReactClient(convexUrl);

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <ClerkProvider
        publishableKey={process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY as string}
        signInFallbackRedirectUrl="/"
        signUpFallbackRedirectUrl="/"
      >
        <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
          <TooltipProvider>{children}</TooltipProvider>
        </ConvexProviderWithClerk>
      </ClerkProvider>
    </ThemeProvider>
  );
}
