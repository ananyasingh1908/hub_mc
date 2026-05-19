function isDev(): boolean {
  try {
    return import.meta.env.DEV;
  } catch {
    return process.env.NODE_ENV !== "production";
  }
}

export function devlog(...args: unknown[]) {
  if (isDev()) {
    console.log(...args);
  }
}

export function devwarn(...args: unknown[]) {
  if (isDev()) {
    console.warn(...args);
  }
}
