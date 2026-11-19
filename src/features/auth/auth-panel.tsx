import Link from "next/link";
import { KeyRound, LockKeyhole, UserRoundPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function AuthPanel({ mode }: { mode: "login" | "register" }) {
  const isRegister = mode === "register";
  const Icon = isRegister ? UserRoundPlus : KeyRound;

  return (
    <section className="auth-stage px-4 py-12 sm:py-20" aria-labelledby="auth-title">
      <div className="surface mx-auto w-full max-w-md p-6 sm:p-9">
        <span className="tile-icon"><Icon size={22} aria-hidden /></span>
        <h1 id="auth-title" className="mt-5 text-3xl font-semibold tracking-tight">{isRegister ? "Create your account" : "Sign in to ToolNest Pro"}</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">Preview the account experience.</p>
        <fieldset disabled aria-describedby="auth-availability" className="mt-6 grid min-w-0 gap-4">
          <legend className="sr-only">{isRegister ? "Registration preview" : "Sign-in preview"}</legend>
          {isRegister && (
            <label className="grid gap-2 text-sm font-medium">
              Full name
              <Input type="text" autoComplete="name" placeholder="Your name" />
            </label>
          )}
          <label className="grid gap-2 text-sm font-medium">
            Email address
            <Input type="email" autoComplete="email" placeholder="you@example.com" />
          </label>
          <label className="grid gap-2 text-sm font-medium">
            Password
            <Input type="password" autoComplete={isRegister ? "new-password" : "current-password"} placeholder="Enter your password" />
          </label>
          <Button className="mt-1 w-full" type="button">{isRegister ? "Create account" : "Sign in"}</Button>
        </fieldset>
        <p id="auth-availability" className="mt-4 flex items-center gap-2 text-sm text-muted-foreground"><LockKeyhole size={15} className="shrink-0" aria-hidden /> Account access is coming soon.</p>
        <div className="mt-6 border-t border-border pt-5 text-sm text-muted-foreground">
          <Link className="font-semibold text-highlight hover:underline" href={isRegister ? "/login" : "/register"}>{isRegister ? "View sign-in page" : "View registration page"}</Link>
        </div>
      </div>
    </section>
  );
}
