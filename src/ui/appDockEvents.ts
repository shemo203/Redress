export type AppDockDestination = "account" | "feed" | "upload";

type DockRetapHandler = () => void;

const retapListeners = new Map<AppDockDestination, Set<DockRetapHandler>>([
  ["account", new Set<DockRetapHandler>()],
  ["feed", new Set<DockRetapHandler>()],
  ["upload", new Set<DockRetapHandler>()],
]);

export function emitAppDockRetap(destination: AppDockDestination) {
  const listeners = retapListeners.get(destination);
  if (!listeners) {
    return;
  }

  listeners.forEach((listener) => {
    listener();
  });
}

export function subscribeToAppDockRetap(
  destination: AppDockDestination,
  listener: DockRetapHandler
) {
  const listeners = retapListeners.get(destination);
  if (!listeners) {
    return () => {};
  }

  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
