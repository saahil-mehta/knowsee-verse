"use client";

import { BadgeCheck, Loader2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { authClient, useSession } from "@/lib/auth-client";
import { GradientAvatar } from "./gradient-avatar";

function SettingsRow({
  label,
  description,
  children,
}: {
  label: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-6 py-4">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-foreground">{label}</p>
        {description && (
          <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
        )}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

function PillButton({
  children,
  onClick,
}: {
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      className="rounded-full border border-border/50 bg-accent/60 px-5 py-2 text-sm font-medium text-muted-foreground transition-all duration-150 hover:bg-accent hover:text-foreground"
      onClick={onClick}
      type="button"
    >
      {children}
    </button>
  );
}

function ChangePasswordDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resetForm = () => {
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);

    try {
      await authClient.changePassword({
        currentPassword,
        newPassword,
        revokeOtherSessions: false,
      });
      resetForm();
      onOpenChange(false);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to change password"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog
      onOpenChange={(isOpen) => {
        if (!isOpen) {
          resetForm();
        }
        onOpenChange(isOpen);
      }}
      open={open}
    >
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-base font-medium">
            Change password
          </DialogTitle>
          <DialogDescription>
            Enter your current password and choose a new one.
          </DialogDescription>
        </DialogHeader>

        <form className="space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            {error && (
              <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </div>
            )}
            <Input
              aria-label="Current password"
              className="h-12 rounded-full px-5 transition-shadow duration-200"
              disabled={loading}
              id="current-password"
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="Current password"
              required
              type="password"
              value={currentPassword}
            />
            <Input
              aria-label="New password"
              className="h-12 rounded-full px-5 transition-shadow duration-200"
              disabled={loading}
              id="new-password"
              minLength={8}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="New password"
              required
              type="password"
              value={newPassword}
            />
            <Input
              aria-label="Confirm new password"
              className="h-12 rounded-full px-5 transition-shadow duration-200"
              disabled={loading}
              id="confirm-password"
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm new password"
              required
              type="password"
              value={confirmPassword}
            />
          </div>

          <div className="space-y-3">
            <Button
              className="h-12 w-full rounded-full bg-foreground text-background hover:bg-foreground/90"
              disabled={loading}
              type="submit"
            >
              {loading && <Loader2 className="animate-spin" />}
              Update password
            </Button>
            <button
              className="w-full text-center text-sm text-muted-foreground transition-colors hover:text-foreground"
              disabled={loading}
              onClick={() => onOpenChange(false)}
              type="button"
            >
              Cancel
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function AccountSettings() {
  const { data: session, refetch } = useSession();
  const user = session?.user;

  const [name, setName] = useState(user?.name || "");
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileSuccess, setProfileSuccess] = useState(false);

  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);

  const handleProfileSubmit = async () => {
    setProfileLoading(true);
    setProfileError(null);
    setProfileSuccess(false);

    try {
      await authClient.updateUser({ name });
      await refetch();
      setProfileSuccess(true);
      setTimeout(() => setProfileSuccess(false), 3000);
    } catch (err) {
      setProfileError(
        err instanceof Error ? err.message : "Failed to update profile"
      );
    } finally {
      setProfileLoading(false);
    }
  };

  const handleImageChange = (file: File) => {
    console.log("Image upload not yet implemented:", file.name);
  };

  if (!user) {
    return null;
  }

  return (
    <div className="space-y-0">
      {/* Profile Header */}
      <div className="flex flex-col items-center py-6">
        <GradientAvatar
          editable
          image={user.image}
          name={user.name || user.email}
          onImageChange={handleImageChange}
          size="lg"
        />
        <div className="mt-3 text-center">
          <p className="text-lg font-medium">{user.name || "User"}</p>
          <p className="text-sm text-muted-foreground">{user.email}</p>
        </div>
      </div>

      <div className="border-b border-border/40" />

      {/* Display Name */}
      <SettingsRow
        description="Knowsee will know you by this name"
        label="Display name"
      >
        <div className="flex items-center">
          <Input
            className="h-9 w-44 rounded-r-none border-r-0 text-sm focus-visible:z-10"
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
            value={name}
          />
          <Button
            className="h-9 rounded-l-none px-4"
            disabled={profileLoading || name === user.name}
            onClick={handleProfileSubmit}
            size="sm"
          >
            {profileLoading ? (
              <Loader2 className="size-4 animate-spin" />
            ) : profileSuccess ? (
              "Saved"
            ) : (
              "Save"
            )}
          </Button>
        </div>
      </SettingsRow>
      {profileError && (
        <p className="-mt-3 pb-2 text-sm text-destructive">{profileError}</p>
      )}

      <div className="border-b border-border/40" />

      {/* Email */}
      <SettingsRow
        description="Your account identifier. Cannot be changed."
        label="Email"
      >
        <div className="text-right">
          <p className="text-sm text-muted-foreground">{user.email}</p>
          {user.emailVerified && (
            <p className="mt-0.5 flex items-center justify-end gap-1 text-xs text-green-500">
              <BadgeCheck className="size-3" />
              Verified
            </p>
          )}
        </div>
      </SettingsRow>

      <div className="border-b border-border/40" />

      {/* Password */}
      <SettingsRow description="Secure your account" label="Password">
        <PillButton onClick={() => setPasswordDialogOpen(true)}>
          Manage
        </PillButton>
      </SettingsRow>

      <ChangePasswordDialog
        onOpenChange={setPasswordDialogOpen}
        open={passwordDialogOpen}
      />
    </div>
  );
}
