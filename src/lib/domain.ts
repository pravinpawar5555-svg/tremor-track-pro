import { useSyncExternalStore } from "react";

export type Domain = "manager" | "customer_success" | "execution" | "none";

let current: Domain | null = null;
const listeners = new Set<() => void>();

export function setDomain(d: Domain | null) {
  current = d;
  listeners.forEach((l) => l());
}

export function peekDomain(): Domain | null {
  return current;
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
}

export function useDomain(): Domain | null {
  return useSyncExternalStore(subscribe, () => current, () => current);
}
