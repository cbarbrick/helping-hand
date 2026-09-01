import { supabase } from "./supabase";

export const MEMBER_DOMAIN = "members.helpinghand.app";

export const normalizeUsername = (u: string) => u.trim().toLowerCase().replace(/[^a-z0-9_]/g, "");
export const memberEmail = (username: string) => `${normalizeUsername(username)}@${MEMBER_DOMAIN}`;
// Must match the pin-signup edge function
export const derivePassword = (username: string, pin: string) => `${pin}-${normalizeUsername(username)}-hh`;

export async function pinSignUp(opts: { username: string; pin: string; display_name: string; role: string; language: string }) {
  const sb = supabase();
  const { data, error } = await sb.functions.invoke("pin-signup", {
    body: { ...opts, username: normalizeUsername(opts.username) },
  });
  if (error) {
    // functions.invoke hides the JSON body on non-2xx; try to read it
    let msg = error.message;
    try {
      const ctx = (error as { context?: Response }).context;
      if (ctx) {
        const j = await ctx.json();
        if (j?.error) msg = j.error;
      }
    } catch {}
    return { error: msg };
  }
  if (data?.error) return { error: data.error as string };
  const { error: signInError } = await sb.auth.signInWithPassword({
    email: memberEmail(opts.username),
    password: derivePassword(opts.username, opts.pin),
  });
  return { error: signInError?.message ?? null };
}

export async function pinSignIn(username: string, pin: string) {
  const { error } = await supabase().auth.signInWithPassword({
    email: memberEmail(username),
    password: derivePassword(username, pin),
  });
  return { error: error ? "bad_login" : null };
}
