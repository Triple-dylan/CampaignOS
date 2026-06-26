import { SignUp } from "@clerk/nextjs";
import { clerkAppearance } from "@/lib/clerk/appearance";

export default function SignUpPage() {
  return (
    <div className="flex flex-1 items-center justify-center px-6 py-12">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">
            Start your CampaignOS workspace
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Create an account to organize strategy, field, and fundraising in
            one place.
          </p>
        </div>
        <SignUp
          appearance={clerkAppearance}
          signInUrl="/sign-in"
          forceRedirectUrl="/auth/after-sign-in"
        />
      </div>
    </div>
  );
}
