import { SignIn } from "@clerk/nextjs";
import { clerkAppearance } from "@/lib/clerk/appearance";

export default function SignInPage() {
  return (
    <div className="flex flex-1 items-center justify-center px-6 py-12">
      <SignIn
        appearance={clerkAppearance}
        routing="path"
        path="/sign-in"
        signUpUrl="/sign-up"
        forceRedirectUrl="/auth/after-sign-in"
      />
    </div>
  );
}
