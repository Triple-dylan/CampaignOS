import { SignUp } from "@clerk/nextjs";
import { clerkAppearance } from "@/lib/clerk/appearance";

export default function SignUpPage() {
  return (
    <div className="flex flex-1 items-center justify-center px-6 py-12">
      <SignUp
        appearance={clerkAppearance}
        routing="path"
        path="/sign-up"
        signInUrl="/sign-in"
        forceRedirectUrl="/auth/after-sign-in"
      />
    </div>
  );
}
