"use client";

import { OrganizationSwitcher, UserButton } from "@clerk/nextjs";
import { clerkAppearance } from "@/lib/clerk/appearance";

export function ClerkAuthControls() {
  return (
    <div className="flex flex-col gap-3 px-2 py-2 group-data-[collapsible=icon]:items-center">
      <OrganizationSwitcher
        appearance={clerkAppearance}
        hidePersonal
        afterCreateOrganizationUrl="/onboarding"
        afterSelectOrganizationUrl="/dashboard"
      />
      <div className="flex items-center gap-2 group-data-[collapsible=icon]:justify-center">
        <UserButton appearance={clerkAppearance} />
      </div>
    </div>
  );
}
