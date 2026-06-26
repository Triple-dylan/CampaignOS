import { SignIn } from "@clerk/nextjs";
import { clerkAppearance } from "@/lib/clerk/appearance";

export default function SignInPage() {
  return (
    <div className="flex flex-1 items-center justify-center px-6 py-12">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">
            Welcome back to CampaignOS
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Sign in to your campaign workspace.
          </p>
        </div>
        <SignIn
          appearance={clerkAppearance}
          signUpUrl="/sign-up"
          forceRedirectUrl="/auth/after-sign-in"
        />
      </div>
    </div>
  );
}
