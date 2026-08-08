import { useEffect } from 'react';

import { isTauri } from '@/lib/tauri';

type PlatformName = 'macos' | 'windows' | 'linux' | 'web';

export function ChromePlatformSync() {
  useEffect(() => {
    document.documentElement.dataset.platform = resolvePlatform();
  }, []);

  return null;
}

function resolvePlatform(): PlatformName {
  if (!isTauri()) {
    return 'web';
  }

  const signature = `${navigator.userAgent} ${navigator.platform}`.toLowerCase();

  if (signature.includes('mac')) {
    return 'macos';
  }

  if (signature.includes('win')) {
    return 'windows';
  }

  return 'linux';
}
