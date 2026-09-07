import { createClient, SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://fqfadlbdsvlhgictyjob.supabase.co";
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "sb_publishable_4ekH89HcPxt5ImsIZ6MSuw_DLsrc6ip";

let client: SupabaseClient | null = null;

export function supabase(): SupabaseClient {
  if (!client) client = createClient(url, key);
  return client;
}

export type Profile = {
  id: string;
  username: string | null;
  display_name: string | null;
  role: "seeker" | "helper" | "employer" | "driver" | "admin";
  phone: string | null;
  language: string;
  area: string | null;
  can_meet_in_person: boolean;
  helper_skills: string[] | null;
  bio: string | null;
};

export type Resource = {
  id: string;
  name: string;
  need: string;
  phone: string | null;
  hours: string | null;
  address: string | null;
  website: string | null;
  description: string | null;
  description_es: string | null;
  description_ht: string | null;
  script: string | null;
  priority: number;
};

export type Job = {
  id: string;
  title: string;
  company: string;
  area: string | null;
  pay: string | null;
  job_type: string;
  description: string | null;
  requirements: string | null;
  no_id_ok: boolean;
  no_address_ok: boolean;
  same_day_pay: boolean;
  contact_phone: string | null;
  contact_email: string | null;
  how_to_apply: string | null;
  created_at: string;
};

export type Intake = {
  id: string;
  first_name: string | null;
  on_behalf_of: boolean;
  has_id: boolean | null;
  has_phone: boolean | null;
  has_place_to_sleep: boolean | null;
  sleep_area: string | null;
  area: string | null;
  needs: string[];
  contact: string | null;
  notes: string | null;
  status: string;
  created_at: string;
  household_type?: string | null;
  adults?: number | null;
  children?: number | null;
  children_ages?: string | null;
  pregnant?: boolean | null;
  veteran?: boolean | null;
  in_danger?: boolean | null;
  registrant_name?: string | null;
  registrant_relationship?: string | null;
  homeless_duration?: string | null;
};

export function pickupCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let s = "";
  for (let i = 0; i < 5; i++) s += alphabet[Math.floor(Math.random() * alphabet.length)];
  return s;
}
