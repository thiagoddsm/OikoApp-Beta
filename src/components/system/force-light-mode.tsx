'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

export function ForceLightMode() {
  const pathname = usePathname();

  useEffect(() => {
    if (pathname && pathname.startsWith('/public')) {
      document.documentElement.classList.remove('dark');
    }
  }, [pathname]);

  return null;
}
