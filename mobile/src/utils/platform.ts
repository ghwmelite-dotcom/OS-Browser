export function isNativePlatform(): boolean {
  try {
    // @ts-ignore — Capacitor may not be loaded in web context
    return typeof (window as any).Capacitor !== 'undefined' && (window as any).Capacitor.isNativePlatform();
  } catch {
    return false;
  }
}

export function getPlatform(): 'web' | 'android' | 'ios' {
  try {
    // @ts-ignore
    return (window as any).Capacitor?.getPlatform?.() || 'web';
  } catch {
    return 'web';
  }
}
