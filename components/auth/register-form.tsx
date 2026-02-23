"use client";

import { Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import { TypewriterText } from "@/components/typewriter-text";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { signUp } from "@/lib/auth-client";

export function RegisterForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    setIsLoading(true);

    try {
      await signUp.email(
        { email, password, name },
        {
          onSuccess: () => {
            sessionStorage.setItem("knowsee_otp_sent", "true");
            router.push("/verify-email");
          },
          onError: (ctx) => {
            setError(ctx.error.message || "Failed to create account");
          },
        }
      );
    } catch {
      setError("An unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-sm">
      <div className="mb-6">
        <h1 className="font-serif text-3xl text-foreground">
          <TypewriterText
            speed={40}
            startDelay={200}
            text={"Knowsee.\nCreate your account"}
          />
        </h1>
      </div>
      <form className="space-y-6" onSubmit={handleSubmit}>
        <div className="space-y-4">
          {error && (
            <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </div>
          )}
          <Input
            aria-label="Name"
            className="h-12 rounded-full px-5"
            disabled={isLoading}
            id="name"
            onChange={(e) => setName(e.target.value)}
            placeholder="Name"
            required
            type="text"
            value={name}
          />
          <Input
            aria-label="Email address"
            className="h-12 rounded-full px-5"
            disabled={isLoading}
            id="email"
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email address"
            required
            type="email"
            value={email}
          />
          <Input
            aria-label="Password"
            className="h-12 rounded-full px-5"
            disabled={isLoading}
            id="password"
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            required
            type="password"
            value={password}
          />
          <Input
            aria-label="Confirm password"
            className="h-12 rounded-full px-5"
            disabled={isLoading}
            id="confirmPassword"
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Confirm password"
            required
            type="password"
            value={confirmPassword}
          />
        </div>
        <div className="space-y-4">
          <Button
            className="h-12 w-full rounded-full bg-foreground text-background hover:bg-foreground/90"
            disabled={isLoading}
            type="submit"
          >
            {isLoading && <Loader2 className="animate-spin" />}
            Create account
          </Button>
          <p className="text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link
              className="font-medium text-foreground hover:underline"
              href="/login"
            >
              Sign in
            </Link>
          </p>
        </div>
      </form>
    </div>
  );
}
