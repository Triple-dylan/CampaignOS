import type { SignIn } from "@clerk/nextjs";
import type { ComponentProps } from "react";

/**
 * Clerk components render in the regular DOM (not an iframe), so referencing our
 * theme CSS variables and Tailwind tokens lets the auth UI follow light/dark
 * mode automatically and match the neutral, flat CampaignOS theme.
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
    card: "border border-border bg-card text-foreground shadow-[var(--shadow-panel)]",
    // The default "Sign in to <App>" header comes from the Clerk instance name;
    // we hide it and brand the auth pages ourselves.
    header: "hidden",
    headerTitle: "hidden",
    headerSubtitle: "hidden",
    socialButtonsBlockButton:
      "border border-border bg-card text-foreground hover:bg-accent",
    socialButtonsBlockButtonText: "font-medium",
    formFieldLabel: "text-foreground font-medium",
    formFieldInput:
      "border border-input bg-card text-foreground focus:ring-2 focus:ring-ring/50",
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
    otpCodeFieldInput: "border-input bg-card text-foreground",
    badge: "badge-blue border",
    avatarBox: "ring-1 ring-border",
    userButtonPopoverCard:
      "border border-border bg-popover shadow-[var(--shadow-pop)]",
    organizationSwitcherPopoverCard:
      "border border-border bg-popover shadow-[var(--shadow-pop)]",
    organizationSwitcherTrigger:
      "rounded-md text-foreground hover:bg-accent",
  },
};
