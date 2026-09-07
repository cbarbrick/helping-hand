// Document Center: shared types and helpers
export const DOC_TYPES = ["ssn_card", "birth_cert", "fl_id", "benefits"] as const;
export type DocType = (typeof DOC_TYPES)[number];

export const DOC_ICONS: Record<DocType, string> = { ssn_card: "🪪", birth_cert: "📜", fl_id: "🆔", benefits: "🥗" };

export const STEP_STATUSES = ["collecting", "ready", "submitted", "appointment", "mailed", "at_warehouse", "at_kiosk", "picked_up", "issue"] as const;
export type StepStatus = (typeof STEP_STATUSES)[number];

// Where each status sits on the person's timeline (issue is shown separately)
export const STATUS_ORDER: StepStatus[] = ["collecting", "ready", "submitted", "appointment", "mailed", "at_warehouse", "at_kiosk", "picked_up"];

export type DocumentCase = {
  id: string;
  user_id: string;
  intake_id: string | null;
  status: string;
  wants_ssn_card: boolean;
  wants_birth_cert: boolean;
  wants_fl_id: boolean;
  wants_benefits: boolean;
  legal_first: string | null;
  legal_middle: string | null;
  legal_last: string | null;
  other_names: string | null;
  dob: string | null;
  birth_city: string | null;
  birth_state: string | null;
  birth_country: string | null;
  sex: string | null;
  mother_name: string | null;
  mother_maiden: string | null;
  father_name: string | null;
  ssn_known: boolean | null;
  ssn_last4: string | null;
  us_citizen: boolean | null;
  phone: string | null;
  best_way_to_reach: string | null;
  has_photo_id: boolean | null;
  has_birth_cert: boolean | null;
  has_ssn_card: boolean | null;
  has_other_doc: string | null;
  pickup_kiosk_id: string | null;
  mail_authorized: boolean;
  representative_authorized: boolean;
  signature_name: string | null;
  signature_data: string | null;
  signed_at: string | null;
  navigator_id: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type DocumentStep = {
  id: string;
  case_id: string;
  user_id: string;
  doc_type: DocType;
  status: StepStatus;
  kiosk_id: string | null;
  pickup_code: string | null;
  appointment_at: string | null;
  detail: string | null;
  updated_at: string;
  created_at: string;
};

export type DocumentFile = { id: string; case_id: string; user_id: string; label: string | null; storage_path: string; created_at: string };

export type KioskLite = { id: string; name: string; code: string; address: string | null; area: string | null };

export const caseNumber = (id: string) => `DC-${id.slice(0, 6).toUpperCase()}`;

export const fullName = (c: Pick<DocumentCase, "legal_first" | "legal_middle" | "legal_last">) =>
  [c.legal_first, c.legal_middle, c.legal_last].filter(Boolean).join(" ");

export const wantedDocs = (c: DocumentCase): DocType[] =>
  DOC_TYPES.filter((d) => (c as unknown as Record<string, boolean>)[`wants_${d}`]);

export const makePickupCode = () => {
  const letters = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const l = () => letters[Math.floor(Math.random() * letters.length)];
  return `${l()}${l()}${Math.floor(100 + Math.random() * 900)}`;
};
