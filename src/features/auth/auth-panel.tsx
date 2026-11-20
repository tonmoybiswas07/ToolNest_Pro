"use client";

import { authHref } from "./tool-return";

import Link from "next/link";
import {
  ArrowRight,
  FileText,
  GraduationCap,
  Image,
  Layers3,
  Eye,
  EyeOff,
  KeyRound,
  LoaderCircle,
  UserRoundPlus,
} from "lucide-react";
import { useState, type FormEvent, type ReactNode } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { findTool } from "@/features/tools/registry";
import { authClient } from "@/lib/auth-client";
import { loginSchema, registrationSchema } from "./validation";

type Field = "name" | "email" | "password" | "confirmPassword";

function AuthField({
  name,
  label,
  error,
  children,
}: {
  name: Field;
  label: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div className="grid gap-2 text-sm font-medium">
      <label htmlFor={name}>{label}</label>
      {children}
      {error && (
        <p id={`${name}-error`} className="text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}

const workspaceLinks = [
  {
    href: "/tools?category=document",
    title: "PDF & documents",
    icon: FileText,
  },
  { href: "/tools?category=image", title: "Image tools", icon: Image },
  { href: "/student", title: "Student Hub", icon: GraduationCap },
];

function AuthWorkspace() {
  return (
    <aside className="auth-workspace relative hidden min-w-0 flex-col justify-between gap-12 overflow-hidden p-9 lg:flex xl:p-12">
      <div className="relative z-10">
        <span className="grid size-12 place-items-center rounded-xl border border-current/25 text-[#e3c37c]">
          <Layers3 size={24} aria-hidden />
        </span>
        <h2 className="mt-8 max-w-[13ch] font-serif text-5xl leading-[1.03] tracking-tight">
          Your ToolNest workspace
        </h2>
        <p className="mt-4 max-w-[34ch] text-sm leading-relaxed text-[#c3d9ce]">
          Return to your favorite tools, saved presets, and study plans from
          your dashboard.
        </p>
      </div>
      <nav aria-label="Explore ToolNest" className="relative z-10">
        <ul className="divide-y divide-white/15 border-y border-white/15">
          {workspaceLinks.map(({ href, title, icon: Icon }) => (
            <li key={href}>
              <Link
                href={href}
                className="flex items-center gap-3 rounded-sm px-2 py-3 text-sm font-medium hover:bg-white/10 focus-visible:outline-[#e3c37c]"
              >
                <Icon
                  size={17}
                  className="shrink-0 text-[#e3c37c]"
                  aria-hidden
                />
                {title}
                <ArrowRight
                  size={16}
                  className="ml-auto shrink-0"
                  aria-hidden
                />
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  );
}

export function AuthPanel({
  mode,
  googleEnabled,
  oauthError,
  returnTo,
}: {
  mode: "login" | "register";
  googleEnabled: boolean;
  oauthError?: boolean;
  returnTo?: string;
}) {
  const isRegister = mode === "register";
  const Icon = isRegister ? UserRoundPlus : KeyRound;
  const destination =
    returnTo && findTool(returnTo.split("?")[0].split("/").at(-1) ?? "");
  const [visible, setVisible] = useState(false);
  const [pending, setPending] = useState<"email" | "google" | null>(null);
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({});
  const [formError, setFormError] = useState(
    oauthError
      ? "Google sign-in could not be completed. Try again or use your email."
      : "",
  );

  function fieldProps(name: Field) {
    return {
      id: name,
      name,
      "aria-invalid": Boolean(errors[name]),
      "aria-describedby": errors[name] ? `${name}-error` : undefined,
    };
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;

    setFormError("");
    const fields = Object.fromEntries(new FormData(event.currentTarget));
    const result = (isRegister ? registrationSchema : loginSchema).safeParse(
      fields,
    );
    if (!result.success) {
      const nextErrors: Partial<Record<Field, string>> = {};
      for (const issue of result.error.issues) {
        const field = issue.path[0] as Field;
        nextErrors[field] ??= issue.message;
      }
      setErrors(nextErrors);
      return;
    }

    setErrors({});
    setPending("email");
    try {
      const { email, password } = result.data;
      const response =
        "name" in result.data && typeof result.data.name === "string"
          ? await authClient.signUp.email({
              name: result.data.name,
              email,
              password,
            })
          : await authClient.signIn.email({
              email,
              password,
              rememberMe: true,
            });

      if (response.error) {
        switch (response.error.code) {
          case "USER_ALREADY_EXISTS":
          case "USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL":
            setErrors({
              email:
                "An account with this email already exists. Sign in instead.",
            });
            break;
          case "BANNED_USER":
            setFormError("This account is suspended.");
            break;
          case "INVALID_EMAIL_OR_PASSWORD":
          case "INVALID_PASSWORD":
            setFormError("The email or password is incorrect.");
            break;
          default:
            setFormError(
              response.error.status === 429
                ? "Too many attempts. Try again shortly."
                : "Authentication is temporarily unavailable. Try again shortly.",
            );
        }
        return;
      }

      window.location.replace(returnTo ?? "/dashboard");
    } catch {
      setFormError(
        "Couldn’t reach ToolNest Pro. Check your connection and try again.",
      );
    } finally {
      setPending(null);
    }
  }

  async function signInWithGoogle() {
    if (pending) return;
    setFormError("");
    setPending("google");

    try {
      const { error } = await authClient.signIn.social({
        provider: "google",
        callbackURL: returnTo ?? "/dashboard",
        errorCallbackURL: authHref(
          isRegister ? "/register" : "/login",
          returnTo,
        ),
      });
      if (!error) return;
      toast.error(
        error.status === 429
          ? "Too many attempts. Try again shortly."
          : "Google sign-in is temporarily unavailable.",
      );
    } catch {
      toast.error("Couldn’t start Google sign-in. Try again shortly.");
    }

    setPending(null);
  }

  return (
    <section
      className="auth-stage px-4 py-8 sm:px-6 sm:py-12 lg:py-16"
      aria-labelledby="auth-title"
    >
      <div className="surface mx-auto grid w-full max-w-[32rem] overflow-hidden lg:max-w-[64rem] lg:grid-cols-[.95fr_1.05fr]">
        <AuthWorkspace />
        <div className="min-w-0 self-center px-5 py-7 sm:p-9 lg:px-11 lg:py-10">
          <span className="tile-icon">
            <Icon size={22} aria-hidden />
          </span>
          <h1
            id="auth-title"
            className="mt-5 text-3xl font-semibold tracking-tight"
          >
            {isRegister ? "Create your account" : "Sign in to ToolNest Pro"}
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            {destination
              ? `Continue to ${destination.name} after ${isRegister ? "creating your account" : "signing in"}.`
              : isRegister
                ? "Create an account to save your favorites and study plans."
                : "Open your dashboard and pick up where you left off."}
          </p>
          {formError && (
            <p role="alert" className="mt-4 text-sm text-destructive">
              {formError}
            </p>
          )}
          {googleEnabled && (
            <div className="mt-5 space-y-4">
              <Button
                variant="outline"
                type="button"
                disabled={pending !== null}
                onClick={signInWithGoogle}
                className="w-full"
              >
                {pending === "google" && (
                  <LoaderCircle
                    className="size-4 motion-safe:animate-spin"
                    aria-hidden
                  />
                )}
                Continue with Google
              </Button>
              <div className="flex items-center gap-3 text-xs font-medium text-muted-foreground">
                <span className="h-px flex-1 bg-border" aria-hidden />
                Or use email
                <span className="h-px flex-1 bg-border" aria-hidden />
              </div>
            </div>
          )}
          <form method="post" onSubmit={submit} noValidate className="mt-6">
            <fieldset
              disabled={pending !== null}
              className="grid min-w-0 gap-4"
            >
              <legend className="sr-only">
                {isRegister ? "Registration" : "Sign in"}
              </legend>
              {isRegister && (
                <AuthField name="name" label="Full name" error={errors.name}>
                  <Input
                    {...fieldProps("name")}
                    autoComplete="name"
                    maxLength={100}
                    placeholder="Your name"
                  />
                </AuthField>
              )}
              <AuthField
                name="email"
                label="Email address"
                error={errors.email}
              >
                <Input
                  {...fieldProps("email")}
                  type="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                />
              </AuthField>
              <AuthField
                name="password"
                label="Password"
                error={errors.password}
              >
                <div className="relative">
                  <Input
                    {...fieldProps("password")}
                    type={visible ? "text" : "password"}
                    autoComplete={
                      isRegister ? "new-password" : "current-password"
                    }
                    placeholder={
                      isRegister
                        ? "At least 8 characters"
                        : "Enter your password"
                    }
                    className="pr-12"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => setVisible(!visible)}
                    aria-label={visible ? "Hide password" : "Show password"}
                    className="absolute top-0.5 right-0.5"
                  >
                    {visible ? (
                      <EyeOff size={18} aria-hidden />
                    ) : (
                      <Eye size={18} aria-hidden />
                    )}
                  </Button>
                </div>
              </AuthField>
              {isRegister && (
                <AuthField
                  name="confirmPassword"
                  label="Confirm password"
                  error={errors.confirmPassword}
                >
                  <Input
                    {...fieldProps("confirmPassword")}
                    type={visible ? "text" : "password"}
                    autoComplete="new-password"
                    placeholder="Re-enter your password"
                  />
                </AuthField>
              )}
              <Button className="mt-1 w-full" type="submit">
                {pending === "email" && (
                  <LoaderCircle
                    className="size-4 motion-safe:animate-spin"
                    aria-hidden
                  />
                )}
                {isRegister ? "Create account" : "Sign in"}
              </Button>
            </fieldset>
          </form>
          <div className="mt-6 border-t border-border pt-5 text-sm text-muted-foreground">
            <Link
              className="font-semibold text-highlight hover:underline"
              href={authHref(isRegister ? "/login" : "/register", returnTo)}
            >
              {isRegister
                ? "Already have an account? Sign in"
                : "New to ToolNest Pro? Create an account"}
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
