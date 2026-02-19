/**
 * Overview Tab Page (Server Component)
 *
 * This is the default dashboard tab that shows the dialer.
 * It renders the DialerTab client component with necessary providers.
 */

import DialerTab from '../DialerTab';

export const revalidate = 60;

export default function OverviewPage() {
  // The DialerTab is a client component that handles its own state
  // It will fetch any data it needs client-side
  return <DialerTab />;
}
