/**
 * Settings Tab Page (Client Component)
 *
 * Settings is a fully interactive client component with form state.
 * This page simply renders the SettingsTab component.
 */

import SettingsTab from '../SettingsTab';

export const revalidate = 60;

export default function SettingsPage() {
  return <SettingsTab />;
}
