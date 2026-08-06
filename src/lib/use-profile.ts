"use client";

import { useEffect, useState } from "react";

export type Profile = { id: string; storeName: string; contactName: string };

const KEY = "wings_customer_profile";

export function readProfile(): Profile | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Profile) : null;
  } catch {
    return null;
  }
}

export function writeProfile(profile: Profile | null) {
  if (typeof window === "undefined") return;
  if (profile) window.localStorage.setItem(KEY, JSON.stringify(profile));
  else window.localStorage.removeItem(KEY);
  window.dispatchEvent(new Event("wings-profile-change"));
}

export function useProfile() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setProfile(readProfile());
    setReady(true);

    const onChange = () => setProfile(readProfile());
    window.addEventListener("wings-profile-change", onChange);
    return () => window.removeEventListener("wings-profile-change", onChange);
  }, []);

  return { profile, ready, setProfile: writeProfile };
}
