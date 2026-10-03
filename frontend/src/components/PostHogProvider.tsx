'use client';

import { useEffect } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { initPostHog, posthog, POSTHOG_KEY } from '@/lib/posthog';

export default function PostHogProvider() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    initPostHog();
  }, []);

  useEffect(() => {
    if (!POSTHOG_KEY) return;
    const url = pathname + (searchParams?.toString() ? `?${searchParams.toString()}` : '');
    posthog.capture('$pageview', { '$current_url': url });
  }, [pathname, searchParams]);

  return null;
}
