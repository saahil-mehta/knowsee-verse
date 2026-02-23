"use client";

import { CircleAlert, Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import { toast } from "sonner";
import { TypewriterText } from "@/components/typewriter-text";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { signIn } from "@/lib/auth-client";

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      await signIn.email(
        { email, password },
        {
          onSuccess: () => {
            toast.success("Signed in successfully");
            router.push("/");
          },
          onError: (ctx) => {
            setError(ctx.error.message || "Failed to sign in");
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
            text={"Knowsee.\nPlease sign in to continue"}
          />
        </h1>
      </div>
      <form className="space-y-6" onSubmit={handleSubmit}>
        <div className="space-y-4">
          {error && (
            <div className="flex items-center justify-center gap-2 text-sm text-destructive">
              <CircleAlert className="size-4 shrink-0" />
              {error}
            </div>
          )}
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
        </div>
        <div className="space-y-4">
          <Button
            className="h-12 w-full rounded-full bg-foreground text-background hover:bg-foreground/90"
            disabled={isLoading}
            type="submit"
          >
            {isLoading && <Loader2 className="animate-spin" />}
            Sign in
          </Button>
          <p className="text-center text-sm text-muted-foreground">
            Don&apos;t have an account?{" "}
            <Link
              className="font-medium text-foreground hover:underline"
              href="/register"
            >
              Create account
            </Link>
          </p>
        </div>
      </form>
    </div>
  );
}
