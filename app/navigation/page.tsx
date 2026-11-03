import { redirect } from 'next/navigation';

// A stable browser URL for the existing, battle-tested multi-pin navigation UI.
// Preserve the original hash router and map state instead of rendering a duplicate engine.
export default function NavigationPage() {
  redirect('/#map');
}
