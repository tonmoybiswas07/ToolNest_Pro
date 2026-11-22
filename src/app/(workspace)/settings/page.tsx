import { personalAnalytics } from "@/features/analytics/personal";
import { PrivacyControls } from "@/features/analytics/privacy-controls";
import { categories, findTool, type CategoryId } from "@/features/tools/registry";
import type { Metadata } from "next";
import { headers } from "next/headers";
import { getAuth } from "@/lib/auth";
import { SecuritySettings } from "@/features/auth/security-settings";
import { verificationEmailEnabled } from "@/features/auth/verification-mail";
import { LogoutButton } from "@/features/auth/logout-button";
import { requireSession } from "@/lib/session";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { user } = await requireSession();
  const [data, auth, requestHeaders, params] = await Promise.all([
    personalAnalytics(user.id).catch(() => null),
    getAuth(),
    headers(),
    searchParams,
  ]);
  const accounts = await auth?.api.listUserAccounts({ headers: requestHeaders }).catch(() => null);

  return (
    <div className="max-w-4xl">
      <h1 className="page-title">Settings</h1>
      <section
        className="surface mt-8 p-5 sm:p-8"
        aria-labelledby="session-heading"
      >
        <h2 id="session-heading" className="text-xl font-semibold">
          Current session
        </h2>
        <p className="mt-1 text-muted-foreground">
          Sign out of ToolNest Pro on this device.
        </p>
        <LogoutButton className="mt-5" />
      </section>
      <SecuritySettings
        isAdmin={user.role === "admin"}
        email={user.email}
        emailVerified={user.emailVerified}
        verificationEnabled={verificationEmailEnabled()}
        hasPassword={accounts?.some(account => account.providerId === "credential") ?? null}
        verificationError={Boolean(params.error)}
      />
      <section
        id="privacy"
        className="surface mt-5 p-5 sm:p-8"
        aria-labelledby="privacy-heading"
      >
        <h2 id="privacy-heading" className="text-xl font-semibold">
          Search privacy
        </h2>
        <p className="mt-2 text-muted-foreground">
          Directory searches contribute to aggregate statistics. Opt in to
          associate recognized catalog terms with your account. Free-form search
          text is never stored.
        </p>
        {data && (
          <>
            <p className="mt-2 text-sm font-medium">
              Personal search history is {data.consent ? "on" : "off"}.
            </p>
            <PrivacyControls consent={data.consent} />
            {data.searches.length > 0 && (
              <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
                {data.searches.map((row) => (
                  <li key={String(row._id)}>
                    {findTool(String(row.keyword))?.name ??
                      categories[row.keyword as CategoryId]?.name}
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </section>
    </div>
  );
}
