import type { SignIn } from "@clerk/nextjs";
import type { ComponentProps } from "react";

/**
 * Clerk components render in the regular DOM (not an iframe), so referencing our
 * theme CSS variables — both in `variables` and via element classes that use our
 * Tailwind tokens — lets the auth UI follow light/dark mode automatically and
 * pick up the CampaignOS red/white/blue + liquid-glass identity.
 */
export const clerkAppearance: NonNullable<
  ComponentProps<typeof SignIn>["appearance"]
> = {
  variables: {
    colorPrimary: "var(--primary)",
    colorBackground: "var(--card)",
    borderRadius: "var(--radius)",
  },
  elements: {
    rootBox: "w-full",
    cardBox: "shadow-none w-full",
    card: "glass-card border border-(--glass-border) bg-(--glass-bg-strong) text-foreground shadow-none",
    // The default "Sign in to My Application" header text comes from the Clerk
    // instance name, not code — we hide it and brand the auth pages ourselves.
    header: "hidden",
    headerTitle: "hidden",
    headerSubtitle: "hidden",
    socialButtonsBlockButton:
      "glass-hover border border-border bg-background/60 text-foreground backdrop-blur-sm hover:bg-muted",
    socialButtonsBlockButtonText: "font-medium",
    formFieldLabel: "text-foreground font-medium",
    formFieldInput:
      "border border-input bg-background/60 text-foreground backdrop-blur-sm focus:ring-2 focus:ring-ring/50",
    formButtonPrimary:
      "bg-primary text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 normal-case font-medium",
    footerActionLink: "text-primary font-medium hover:text-primary/90",
    footerActionText: "text-muted-foreground",
    dividerLine: "bg-border",
    dividerText: "text-muted-foreground",
    identityPreviewText: "text-foreground",
    identityPreviewEditButton: "text-primary hover:text-primary/90",
    formFieldInputShowPasswordButton:
      "text-muted-foreground hover:text-foreground",
    otpCodeFieldInput: "border-input bg-background/60 text-foreground",
    badge: "badge-red border",
    avatarBox: "ring-1 ring-border",
    userButtonPopoverCard:
      "glass-card border border-(--glass-border) bg-(--glass-bg-strong)",
    organizationSwitcherPopoverCard:
      "glass-card border border-(--glass-border) bg-(--glass-bg-strong)",
    organizationSwitcherTrigger:
      "glass-hover rounded-md text-foreground hover:bg-accent/60",
  },
};
