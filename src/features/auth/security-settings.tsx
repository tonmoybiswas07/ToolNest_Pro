"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { authClient } from "@/lib/auth-client";

type Action = "password" | "delete" | "verify";

export function SecuritySettings({
  isAdmin,
  email,
  emailVerified,
  verificationEnabled,
  hasPassword,
  verificationError,
}: {
  isAdmin: boolean;
  email: string;
  emailVerified: boolean;
  verificationEnabled: boolean;
  hasPassword: boolean | null;
  verificationError: boolean;
}) {
  const [pending, setPending] = useState<Action>();
  const [notice, setNotice] = useState<{ action: Action; message: string; error?: boolean }>();
  const [confirmDelete, setConfirmDelete] = useState(false);

  async function perform(action: Action, request: () => Promise<void>) {
    setPending(action);
    setNotice(undefined);
    try {
      await request();
    } catch (error) {
      setNotice({ action, message: error instanceof Error ? error.message : "Please try again.", error: true });
    } finally {
      setPending(undefined);
    }
  }

  function feedback(action: Action) {
    const message = notice?.action === action ? notice : undefined;
    if (!message) return null;
    return <p className={message.error ? "mt-3 text-sm text-destructive" : "mt-3 text-sm"} role={message.error ? "alert" : "status"}>{message.message}</p>;
  }

  function verifyEmail() {
    return perform("verify", async () => {
      const { error } = await authClient.sendVerificationEmail({ email, callbackURL: "/settings" });
      if (error) throw new Error("Could not send the verification link. Try again shortly.");
      setNotice({ action: "verify", message: "Check your inbox for the verification link." });
    });
  }

  function changePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    return perform("password", async () => {
      const newPassword = String(data.get("newPassword"));
      if (newPassword !== data.get("confirmPassword")) throw new Error("The new passwords must match.");
      const { error } = await authClient.changePassword({
        currentPassword: String(data.get("currentPassword")),
        newPassword,
        revokeOtherSessions: true,
      });
      if (error) throw new Error(error.code === "INVALID_PASSWORD" ? "The current password is incorrect." : error.message ?? "Could not change your password.");
      form.reset();
      setNotice({ action: "password", message: "Password changed. Other sessions have been signed out." });
    });
  }

  function deleteAccount(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    return perform("delete", async () => {
      if (data.get("confirmation") !== "DELETE") throw new Error("Enter DELETE to confirm.");
      const password = String(data.get("password") ?? "");
      const { error } = await authClient.deleteUser({ ...(hasPassword && { password }) });
      if (error) throw new Error(
        error.code === "SESSION_EXPIRED" || error.code === "SESSION_NOT_FRESH"
          ? "Sign out and sign in again to confirm this request."
          : error.code === "INVALID_PASSWORD"
            ? "The current password is incorrect."
            : error.message ?? "Could not delete your account.",
      );
      window.location.replace("/");
    });
  }

  return (
    <>
      <section className="surface mt-5 p-5 sm:p-8" aria-labelledby="email-heading">
        <h2 id="email-heading" className="text-xl font-semibold">Email verification</h2>
        <p className="mt-2 break-all text-muted-foreground">{email} · {emailVerified ? "Verified" : "Unverified"}</p>
        {!emailVerified && verificationEnabled && (
          <Button className="mt-4" type="button" variant="outline" disabled={Boolean(pending)} onClick={verifyEmail}>
            {pending === "verify" ? "Sending…" : "Send verification link"}
          </Button>
        )}
        {!emailVerified && !verificationEnabled && <p className="mt-2 text-sm text-muted-foreground">Verification email delivery is currently unavailable.</p>}
        {!emailVerified && verificationError && !notice && <p className="mt-3 text-sm text-destructive" role="alert">This verification link is invalid or expired. Request a fresh link.</p>}
        {feedback("verify")}
      </section>
      <section className="surface mt-5 p-5 sm:p-8" aria-labelledby="password-heading">
        <h2 id="password-heading" className="text-xl font-semibold">Change password</h2>
        {hasPassword ? (
          <form className="mt-4 max-w-md" method="post" onSubmit={changePassword}>
            <fieldset disabled={Boolean(pending)} className="grid gap-4">
              <label className="grid gap-2 text-sm font-medium">
                Current password
                <Input name="currentPassword" autoComplete="current-password" type="password" maxLength={128} required />
              </label>
              <label className="grid gap-2 text-sm font-medium">
                New password
                <Input name="newPassword" autoComplete="new-password" type="password" minLength={8} maxLength={128} required />
              </label>
              <label className="grid gap-2 text-sm font-medium">
                Confirm new password
                <Input name="confirmPassword" autoComplete="new-password" type="password" minLength={8} maxLength={128} required />
              </label>
              <Button className="justify-self-start" type="submit">{pending === "password" ? "Changing…" : "Change password"}</Button>
            </fieldset>
            {feedback("password")}
          </form>
        ) : <p className="mt-2 text-muted-foreground">{hasPassword === null ? "Could not load sign-in methods. Reload this page to retry." : "Manage your password with your sign-in provider."}</p>}
      </section>
      <section className="surface mt-5 p-5 sm:p-8" aria-labelledby="delete-heading">
        <h2 id="delete-heading" className="text-xl font-semibold">Delete account</h2>
        <p className="mt-2 text-muted-foreground">Permanently delete your account, saved preferences, and synced Student Hub workspace.</p>
        {isAdmin ? (
          <p className="mt-2 text-sm text-muted-foreground">Remove the administrator role before deleting this account.</p>
        ) : !confirmDelete ? (
          <Button className="mt-4" type="button" variant="outline" disabled={Boolean(pending) || hasPassword === null} onClick={() => setConfirmDelete(true)}>Delete account</Button>
        ) : (
          <form className="mt-4 max-w-md" method="post" onSubmit={deleteAccount}>
            <fieldset disabled={Boolean(pending)} className="grid gap-4">
              {hasPassword && <label className="grid gap-2 text-sm font-medium">
                Current password
                <Input name="password" autoComplete="current-password" type="password" maxLength={128} required />
              </label>}
              <label className="grid gap-2 text-sm font-medium">
                Type DELETE to confirm
                <Input name="confirmation" autoComplete="off" required />
              </label>
              <div className="flex flex-wrap gap-2">
                <Button type="submit" variant="destructive">{pending === "delete" ? "Deleting…" : "Permanently delete account"}</Button>
                <Button type="button" variant="outline" onClick={() => { setConfirmDelete(false); setNotice(undefined); }}>Cancel</Button>
              </div>
            </fieldset>
            {feedback("delete")}
          </form>
        )}
      </section>
    </>
  );
}
