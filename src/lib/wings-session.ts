"use client";

import { useEffect, useState } from "react";

export type WingsSession = { id: string; storeName: string; contactName: string };

const KEY = "wings_online_session";
const ONBOARDED_KEY = "wings_online_onboarded";
const EVENT = "wings-session-change";

export function getSession(): WingsSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as WingsSession) : null;
  } catch {
    return null;
  }
}

export function setSession(session: WingsSession | null) {
  if (typeof window === "undefined") return;
  if (session) window.localStorage.setItem(KEY, JSON.stringify(session));
  else window.localStorage.removeItem(KEY);
  window.dispatchEvent(new Event(EVENT));
}

export function hasOnboarded() {
  if (typeof window === "undefined") return true;
  return window.localStorage.getItem(ONBOARDED_KEY) === "1";
}

export function markOnboarded() {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(ONBOARDED_KEY, "1");
}

export function useSession() {
  const [session, setSessionState] = useState<WingsSession | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setSessionState(getSession());
    setReady(true);
    const onChange = () => setSessionState(getSession());
    window.addEventListener(EVENT, onChange);
    return () => window.removeEventListener(EVENT, onChange);
  }, []);

  return { session, ready };
}
