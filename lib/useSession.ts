"use client";

import { useEffect, useState } from "react";
import { supabase, Profile } from "./supabase";
import type { User } from "@supabase/supabase-js";

export function useSession() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  async function loadProfile(u: User | null) {
    if (!u) {
      setProfile(null);
      return;
    }
    const { data } = await supabase().from("profiles").select("*").eq("id", u.id).maybeSingle();
    setProfile((data as Profile) ?? null);
  }

  useEffect(() => {
    const sb = supabase();
    sb.auth.getUser().then(async ({ data }) => {
      setUser(data.user ?? null);
      await loadProfile(data.user ?? null);
      setLoading(false);
    });
    const { data: sub } = sb.auth.onAuthStateChange(async (_e, session) => {
      setUser(session?.user ?? null);
      await loadProfile(session?.user ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  return { user, profile, loading, refresh: () => loadProfile(user) };
}
