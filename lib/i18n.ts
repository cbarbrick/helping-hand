export type Lang = string;
export type FullLang = "en" | "es" | "ht";

export const LANGS: { code: FullLang; label: string }[] = [
  { code: "en", label: "English" },
  { code: "es", label: "Español" },
  { code: "ht", label: "Kreyòl Ayisyen" },
];

export const NEEDS = [
  "housing",
  "id",
  "ssn",
  "food",
  "clothes",
  "job",
  "healthcare",
  "benefits",
  "disability",
  "documents",
  "addiction",
  "phone",
] as const;
export type Need = (typeof NEEDS)[number];

export const AREAS = [
  "North Miami",
  "North Miami Beach",
  "Miami Shores",
  "Little Haiti",
  "Liberty City",
  "Downtown Miami",
  "Overtown",
  "Little Havana",
  "Hialeah",
  "Miami Gardens",
  "Opa-locka",
  "Aventura",
  "Miami Beach",
  "Coral Gables",
  "Homestead",
  "Other",
];

export type Dict = Record<string, string>;

import { en as enBase } from "./dict.en";
import { es as esBase } from "./dict.es";
import { ht as htBase } from "./dict.ht";
import { docsEn } from "./dict.docs.en";
import { docsEs } from "./dict.docs.es";
import { docsHt } from "./dict.docs.ht";

export const DICTS: Record<FullLang, Dict> = {
  en: { ...enBase, ...docsEn },
  es: { ...esBase, ...docsEs },
  ht: { ...htBase, ...docsHt },
};

export function translate(lang: Lang, key: string, vars?: Record<string, string | number>) {
  const dict = DICTS[lang as FullLang] ?? DICTS.en;
  let s = dict[key] ?? DICTS.en[key] ?? key;
  if (vars) for (const [k, v] of Object.entries(vars)) s = s.replace(`{${k}}`, String(v));
  return s;
}
