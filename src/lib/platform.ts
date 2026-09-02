// Detects whether the app is running inside a native Capacitor shell (iOS app).
// When true, we hide cross-platform install instructions (Android/Chrome/PWA)
// so Apple App Review does not flag references to third-party platforms.
export function isNativeApp(): boolean {
  if (typeof window === "undefined") return false;
  const w = window as any;
  return !!(w.Capacitor && typeof w.Capacitor.isNativePlatform === "function"
    ? w.Capacitor.isNativePlatform()
    : w.Capacitor?.isNative);
}
