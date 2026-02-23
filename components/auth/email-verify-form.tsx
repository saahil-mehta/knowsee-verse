"use client";

import { Loader2, Mail } from "lucide-react";
import { useRouter } from "next/navigation";
import { type FormEvent, useEffect, useState } from "react";
import { toast } from "sonner";
import { TypewriterText } from "@/components/typewriter-text";
import { Button } from "@/components/ui/button";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { authClient, useSession } from "@/lib/auth-client";

export function EmailVerifyForm() {
  const router = useRouter();
  const { data: session } = useSession();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [needsResend, setNeedsResend] = useState(false);

  useEffect(() => {
    const isReturningUser =
      sessionStorage.getItem("knowsee_otp_sent") !== "true";
    if (isReturningUser && session?.user?.email) {
      setNeedsResend(true);
    }
  }, [session?.user?.email]);

  const handleResendOTP = async () => {
    if (!session?.user?.email) {
      return;
    }

    setIsResending(true);
    setError(null);
    setSuccess(null);

    try {
      const { error: sendError } =
        await authClient.emailOtp.sendVerificationOtp({
          email: session.user.email,
          type: "email-verification",
        });

      if (sendError) {
        setError(sendError.message || "Failed to send verification code");
      } else {
        setSuccess("Verification code sent to your email");
        setNeedsResend(false);
        sessionStorage.setItem("knowsee_otp_sent", "true");
      }
    } catch {
      setError("An unexpected error occurred");
    } finally {
      setIsResending(false);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!session?.user?.email) {
      setError("Session not found. Please log in again.");
      return;
    }

    if (code.length !== 6) {
      setError("Please enter the 6-digit code");
      return;
    }

    setIsLoading(true);

    try {
      const { error: verifyError } = await authClient.emailOtp.verifyEmail({
        email: session.user.email,
        otp: code,
      });

      if (verifyError) {
        if (verifyError.code === "TOO_MANY_ATTEMPTS") {
          setError("Too many attempts. Please request a new code.");
          setNeedsResend(true);
        } else {
          setError(verifyError.message || "Invalid code");
        }
        setCode("");
      } else {
        sessionStorage.removeItem("knowsee_otp_sent");
        toast.success("Email verified successfully");
        router.push("/");
        router.refresh();
      }
    } catch {
      setError("An unexpected error occurred");
      setCode("");
    } finally {
      setIsLoading(false);
    }
  };

  // Auto-submit when 6 digits are entered
  // biome-ignore lint/correctness/useExhaustiveDependencies: intentional
  useEffect(() => {
    if (code.length === 6 && !isLoading && !needsResend) {
      handleSubmit(new Event("submit") as unknown as FormEvent);
    }
  }, [code]);

  const userEmail = session?.user?.email || "your email";

  return (
    <div className="w-full max-w-sm">
      <div className="mb-6">
        <h1 className="font-serif text-3xl text-foreground">
          <TypewriterText
            speed={40}
            startDelay={200}
            text={"Knowsee.\nVerify your email"}
          />
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {needsResend
            ? "Request a new verification code to continue"
            : `Enter the 6-digit code sent to ${userEmail}`}
        </p>
      </div>

      <form className="space-y-6" onSubmit={handleSubmit}>
        <div className="space-y-4">
          {error && (
            <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </div>
          )}
          {success && (
            <div className="rounded-md bg-green-500/10 px-3 py-2 text-sm text-green-600 dark:text-green-400">
              {success}
            </div>
          )}

          {needsResend ? (
            <div className="flex flex-col items-center gap-4 py-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                <Mail className="h-8 w-8 text-muted-foreground" />
              </div>
              <p className="text-center text-sm text-muted-foreground">
                Your previous verification code has expired.
                <br />
                Request a new one to continue.
              </p>
              <Button
                className="h-12 w-full rounded-full bg-foreground text-background hover:bg-foreground/90"
                disabled={isResending}
                onClick={handleResendOTP}
                type="button"
              >
                {isResending && <Loader2 className="animate-spin" />}
                Send verification code
              </Button>
            </div>
          ) : (
            <>
              <div className="flex justify-center">
                <InputOTP
                  disabled={isLoading}
                  maxLength={6}
                  onChange={setCode}
                  value={code}
                >
                  <InputOTPGroup>
                    <InputOTPSlot index={0} />
                    <InputOTPSlot index={1} />
                    <InputOTPSlot index={2} />
                    <InputOTPSlot index={3} />
                    <InputOTPSlot index={4} />
                    <InputOTPSlot index={5} />
                  </InputOTPGroup>
                </InputOTP>
              </div>

              <Button
                className="h-12 w-full rounded-full bg-foreground text-background hover:bg-foreground/90"
                disabled={isLoading}
                type="submit"
              >
                {isLoading && <Loader2 className="animate-spin" />}
                Verify email
              </Button>

              <div className="text-center">
                <button
                  className="text-sm text-muted-foreground hover:text-foreground hover:underline disabled:opacity-50"
                  disabled={isResending}
                  onClick={handleResendOTP}
                  type="button"
                >
                  {isResending
                    ? "Sending..."
                    : "Didn't receive the code? Resend"}
                </button>
              </div>
            </>
          )}
        </div>
      </form>
    </div>
  );
}
