import { PageHeader } from "@/components/layout/page-header";
import { NotificationSettings } from "./notification-settings";
import { SettingsRow } from "./settings-row";
import { DELETE_AFTER_DAYS } from "@/lib/account-deletion";

/** Settings: notification switches, then menus that open their own pages. */
export function SettingsView() {
  return (
    <>
      <PageHeader title="Settings" />
      <NotificationSettings />
      <div className="py-2">
        <SettingsRow
          href="/settings/privacy"
          label="Privacy and safety"
          hint="Manage the accounts you've muted or blocked."
        />
        <SettingsRow
          href="/settings/delete-account"
          label="Delete account"
          hint={`Deactivate your account. It's deleted for good after ${DELETE_AFTER_DAYS} days.`}
        />
      </div>
    </>
  );
}
