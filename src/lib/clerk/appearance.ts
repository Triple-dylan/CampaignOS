import type { SignIn } from "@clerk/nextjs";
import type { ComponentProps } from "react";

export const clerkAppearance: NonNullable<
  ComponentProps<typeof SignIn>["appearance"]
> = {
  variables: {
    colorPrimary: "oklch(0.205 0 0)",
    colorBackground: "oklch(1 0 0)",
    borderRadius: "0.625rem",
  },
  elements: {
    card: "shadow-sm border border-border",
    headerTitle: "text-foreground font-semibold",
    headerSubtitle: "text-muted-foreground",
    socialButtonsBlockButton:
      "border border-border bg-background text-foreground hover:bg-muted",
    formButtonPrimary:
      "bg-primary text-primary-foreground hover:bg-primary/90",
    footerActionLink: "text-primary hover:text-primary/90",
  },
};
