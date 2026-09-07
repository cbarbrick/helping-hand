import { NextRequest, NextResponse } from "next/server";
import { PDFDocument, StandardFonts, rgb, PDFTextField, PDFCheckBox, PDFRadioGroup, PDFDropdown, PDFName, PDFDict, PDFArray, PDFRef } from "pdf-lib";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Fills official government forms from a Helping Hand document case.
 *
 *  POST /api/forms  { form: "ss5" | "dh726" | "cfes2337" | "letter", data: CaseData }  → PDF
 *  GET  /api/forms?form=ss5&inspect=1                                                  → JSON list of the PDF's field names
 *
 * The official PDFs are fetched from the agency website at request time (cached in memory),
 * so the app never ships a stale copy. Values are matched to fields by name pattern, so a
 * revision that renames a few fields degrades to "some fields blank", never to a wrong value.
 */

type CaseData = {
  legal_first?: string | null; legal_middle?: string | null; legal_last?: string | null; other_names?: string | null;
  dob?: string | null; birth_city?: string | null; birth_state?: string | null; birth_country?: string | null; sex?: string | null;
  mother_name?: string | null; mother_maiden?: string | null; father_name?: string | null;
  ssn_known?: boolean | null; ssn_last4?: string | null; us_citizen?: boolean | null; phone?: string | null;
  signature_name?: string | null; signed_at?: string | null; signature_data?: string | null;
  has_photo_id?: boolean | null; has_birth_cert?: boolean | null; has_ssn_card?: boolean | null;
  mailing_address?: string | null; org_name?: string | null; org_phone?: string | null; navigator_name?: string | null;
  kiosk_name?: string | null; kiosk_address?: string | null; sleep_area?: string | null; homeless_duration?: string | null;
};

const SOURCES: Record<string, { url: string; filename: string }> = {
  ss5: { url: "https://www.ssa.gov/forms/ss-5.pdf", filename: "SS-5-social-security-card.pdf" },
  dh726: { url: "https://www.floridahealth.gov/wp-content/uploads/2025/07/DH726-birth-app-6-30-2023.pdf", filename: "DH726-florida-birth-record.pdf" },
  cfes2337: { url: "https://flrules.org/gateway/readRefFile.asp?refId=11698&filename=CF-ES+2337+ACCESS+Florida+Application.pdf", filename: "CF-ES-2337-ACCESS-application.pdf" },
};

const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://fqfadlbdsvlhgictyjob.supabase.co";
const SB_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "sb_publishable_4ekH89HcPxt5ImsIZ6MSuw_DLsrc6ip";
const BROWSER_HEADERS = {
  "user-agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
  accept: "application/pdf,*/*;q=0.8",
  "accept-language": "en-US,en;q=0.9",
};

const cache = new Map<string, { at: number; bytes: Uint8Array; from: string }>();
/** Official PDF from the agency site; if the agency blocks server downloads (SSA does), use the copy stored in Supabase table form_files. */
async function fetchForm(key: string): Promise<{ bytes: Uint8Array; from: string }> {
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < 6 * 3600 * 1000) return hit;
  let bytes: Uint8Array | null = null, from = "";
  try {
    const res = await fetch(SOURCES[key].url, { headers: BROWSER_HEADERS });
    if (res.ok) { bytes = new Uint8Array(await res.arrayBuffer()); from = "agency"; }
    else from = `agency ${res.status}`;
  } catch (e) { from = `agency error ${String(e)}`; }
  if (!bytes || bytes.length < 1000 || !(bytes[0] === 0x25 && bytes[1] === 0x50)) {
    const res = await fetch(`${SB_URL}/rest/v1/form_files?name=eq.${key}&select=b64`, { headers: { apikey: SB_KEY, authorization: `Bearer ${SB_KEY}` } });
    const rows = res.ok ? ((await res.json()) as { b64: string }[]) : [];
    if (!rows[0]?.b64) throw new Error(`Could not download ${key} (${from}) and no stored copy in form_files`);
    bytes = new Uint8Array(Buffer.from(rows[0].b64, "base64"));
    from = `stored copy (${from})`;
  }
  const entry = { at: Date.now(), bytes, from };
  cache.set(key, entry);
  return entry;
}

/**
 * Some agency PDFs (the SS-5 among them) contain field entries pdf-lib cannot read: dangling
 * references or terminal fields with no /FT type anywhere in their ancestry. pdf-lib throws on
 * those, so drop them before touching the form. Everything else is left untouched.
 */
function sanitizeForm(pdf: PDFDocument): number {
  let dropped = 0;
  const ctx = pdf.context;
  const acro = pdf.catalog.lookupMaybe(PDFName.of("AcroForm"), PDFDict);
  if (!acro) return 0;
  const hasFT = (d: PDFDict, depth = 0): boolean => {
    if (d.has(PDFName.of("FT"))) return true;
    const parent = depth < 32 ? d.lookupMaybe(PDFName.of("Parent"), PDFDict) : undefined;
    return parent ? hasFT(parent, depth + 1) : false;
  };
  const clean = (arr: PDFArray, depth = 0): PDFArray => {
    const keep: (PDFRef | PDFDict)[] = [];
    for (const item of arr.asArray()) {
      const d = ctx.lookup(item);
      if (!(d instanceof PDFDict)) { dropped++; continue; }
      const kids = d.lookupMaybe(PDFName.of("Kids"), PDFArray);
      if (kids && depth < 32) {
        const k2 = clean(kids, depth + 1);
        if (k2.size() === 0 && !hasFT(d)) { dropped++; continue; }
        d.set(PDFName.of("Kids"), k2);
      } else if (!hasFT(d)) { dropped++; continue; }
      keep.push(item as PDFRef | PDFDict);
    }
    return ctx.obj(keep);
  };
  const fields = acro.lookupMaybe(PDFName.of("Fields"), PDFArray);
  if (fields) acro.set(PDFName.of("Fields"), clean(fields));
  return dropped;
}

const fmtDate = (iso?: string | null) => {
  if (!iso) return "";
  const d = new Date(iso.length === 10 ? iso + "T00:00:00" : iso);
  return isNaN(d.getTime()) ? "" : `${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")}/${d.getFullYear()}`;
};
const today = () => fmtDate(new Date().toISOString());
const full = (d: CaseData) => [d.legal_first, d.legal_middle, d.legal_last].filter(Boolean).join(" ");
const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

/** Each rule: patterns tested against the normalized field name; first match wins. */
type Rule = { match: RegExp[]; value: string | boolean; exclude?: RegExp[] };

function rulesFor(form: string, d: CaseData): Rule[] {
  // "Helping Hand, c/o 1290 NE 108th St, North Miami, FL 33161" → street "Helping Hand, c/o 1290 NE 108th St", city, state, zip.
  const addr = d.mailing_address ?? "";
  const parts = addr.split(",").map((s) => s.trim()).filter(Boolean);
  let addrLine = addr, city = "", state = "", zip = "";
  if (parts.length >= 3) {
    const stZip = parts[parts.length - 1].split(/\s+/).filter(Boolean);
    state = stZip[0] ?? ""; zip = stZip.slice(1).join(" ");
    city = parts[parts.length - 2]; addrLine = parts.slice(0, -2).join(", ");
  } else if (parts.length === 2) { addrLine = parts[0]; city = parts[1]; }
  const phone = d.phone || d.org_phone || "";
  const common: Rule[] = [
    { match: [/firstname/, /first$/, /^first/, /givenname/], value: d.legal_first ?? "", exclude: [/mother/, /father/, /parent/, /applicant.*(mother|father)/] },
    { match: [/middlename/, /middle/], value: d.legal_middle ?? "", exclude: [/mother/, /father/] },
    { match: [/lastname/, /surname/, /last$/], value: d.legal_last ?? "", exclude: [/mother/, /father/, /maiden/] },
    { match: [/fullname/, /^name$/, /applicantname/, /nameofapplicant/, /printname/], value: full(d), exclude: [/mother/, /father/] },
    { match: [/othername/, /aka/, /alsoknown/, /namesused/], value: d.other_names ?? "" },
    { match: [/dateofbirth/, /birthdate/, /dob/], value: fmtDate(d.dob), exclude: [/mother/, /father/] },
    { match: [/cityofbirth/, /birthcity/, /placeofbirth/, /birthplace/], value: [d.birth_city, d.birth_state, d.birth_country].filter(Boolean).join(", ") },
    { match: [/stateofbirth/, /birthstate/], value: d.birth_state ?? "" },
    { match: [/countryofbirth/, /birthcountry/], value: d.birth_country ?? "" },
    { match: [/mothermaiden/, /maidenname/, /mothersnameatbirth/, /motherbirthname/], value: d.mother_maiden || d.mother_name || "" },
    { match: [/mother/], value: d.mother_maiden || d.mother_name || "" },
    { match: [/father/], value: d.father_name ?? "" },
    { match: [/daytimephone/, /phone/, /telephone/], value: phone },
    { match: [/mailingaddress/, /streetaddress/, /address1/, /^address$/, /addressline/], value: addrLine },
    { match: [/city/], value: city, exclude: [/birth/] },
    { match: [/^state$/, /statecode/, /state$/], value: state, exclude: [/birth/, /citizen/] },
    { match: [/zip/, /postal/], value: zip },
    { match: [/todaysdate/, /datesigned/, /signaturedate/, /^date$/, /dateofapplication/], value: today() },
    { match: [/relationship/], value: "Self" },
    { match: [/emailaddress/, /^email$/], value: "" },
  ];
  const sexM = (d.sex ?? "").toUpperCase().startsWith("M"), sexF = (d.sex ?? "").toUpperCase().startsWith("F");
  const boxes: Rule[] = [
    { match: [/male/], value: sexM, exclude: [/female/] },
    { match: [/female/], value: sexF },
    { match: [/uscitizen/, /citizen/], value: d.us_citizen === true, exclude: [/non/, /not/, /legalalien/, /alien/] },
    { match: [/self/], value: true, exclude: [/selfemploy/] },
  ];
  const phoneDigits = (phone).replace(/\D/g, "");
  const area = phoneDigits.length >= 10 ? phoneDigits.slice(-10, -7) : "";
  const local = phoneDigits.length >= 10 ? `${phoneDigits.slice(-7, -4)}-${phoneDigits.slice(-4)}` : (phone);
  const mother = splitName(d.mother_maiden || d.mother_name || "");
  const father = splitName(d.father_name ?? "");
  const knowsSsn = d.ssn_known === true || d.has_ssn_card === true;

  if (form === "ss5") {
    // Verified against the real SS-5 field names (Sept 4, 2026). Page 5 is the form itself.
    const exact: Rule[] = [
      { match: [/p5firstnamefld/], value: d.legal_first ?? "" },
      { match: [/p5middlenamefld/], value: d.legal_middle ?? "" },
      { match: [/p5lastnamefld/], value: d.legal_last ?? "" },
      { match: [/p5othernamefld/], value: d.other_names ?? "" },
      { match: [/p5oldssnxxxxfld/], value: knowsSsn && d.ssn_last4 ? d.ssn_last4 : "" },
      { match: [/p5cityofbirthfld/], value: d.birth_city ?? "" },
      { match: [/p5stateatbirthfld/], value: d.birth_state || d.birth_country || "" },
      { match: [/p54dateofbirthdate/], value: fmtDate(d.dob) },
      { match: [/p5uscitcb1/], value: d.us_citizen === true },
      { match: [/p5gendermcb14/], value: sexM },
      { match: [/p5genderfcb15/], value: sexF },
      { match: [/p5mothersfirstnamefld/], value: mother.first },
      { match: [/p5mothersmiddlename9fld/], value: mother.middle },
      { match: [/p5motherslastnamefld/], value: mother.last },
      { match: [/p5fathersfirstnamefld/], value: father.first },
      { match: [/p5fathersmiddlenamefld/], value: father.middle },
      { match: [/p5fatherslastnamefld/], value: father.last },
      { match: [/p511yescb18/], value: knowsSsn },
      { match: [/p511nocb19/], value: d.ssn_known === false && d.has_ssn_card !== true },
      { match: [/p5firstnameonrecentcardfld/], value: knowsSsn ? d.legal_first ?? "" : "" },
      { match: [/p5middlenameonrecentcardfld/], value: knowsSsn ? d.legal_middle ?? "" : "" },
      { match: [/p5lastnameonrecentcardfld/], value: knowsSsn ? d.legal_last ?? "" : "" },
      { match: [/p514datedate/], value: today() },
      { match: [/p5areacodefld/], value: area },
      { match: [/p5phonenumberfld/], value: local },
      { match: [/p5streetaddressfld/], value: addrLine },
      { match: [/p5mailingcityfld/], value: city },
      { match: [/p5statefld/], value: state },
      { match: [/p5zipcodefld/], value: zip },
      { match: [/p5selfcb21/], value: true },
      // Anything else on the SS-5 (race/ethnicity, parents' SSNs, page 1-4 markers) is left blank on purpose.
    ];
    return exact;
  }
  if (form === "dh726") {
    // Florida DH 726 uses generic names (Text Field0..35); mapped by position, checked against the printed form (Sept 4, 2026).
    const exact: Rule[] = [
      { match: [/^textfield1$/], value: full(d) },
      { match: [/^textfield2$/], value: addrLine },
      { match: [/^textfield0$/], value: city },
      { match: [/^textfield4$/], value: state },
      { match: [/^textfield5$/], value: zip },
      { match: [/^textfield6$/], value: phone },
      { match: [/^textfield8$/], value: "Self" },
      { match: [/^textfield12$/], value: full(d) },
      { match: [/^textfield13$/], value: sexM ? "M" : sexF ? "F" : "" },
      { match: [/^textfield14$/], value: fmtDate(d.dob) },
      { match: [/^textfield15$/], value: d.birth_city ?? "" },
      { match: [/^textfield16$/], value: d.mother_maiden || d.mother_name || "" },
      { match: [/^textfield17$/], value: d.father_name ?? "" },
      { match: [/^textfield33$/], value: "1" },
    ];
    return exact;
  }
  if (form === "cfes2337") {
    common.push({ match: [/homeless/, /livingsituation/, /wheredoyoulive/], value: "Experiencing homelessness" });
    boxes.push({ match: [/foodassistance/, /snap/], value: true }, { match: [/medicaid/, /medical/], value: true }, { match: [/homeless/], value: true });
  }
  return [...common, ...boxes];
}

/** "Maria Elena Garcia" → first Maria, middle Elena, last Garcia. */
function splitName(s: string) {
  const parts = s.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { first: "", middle: "", last: "" };
  if (parts.length === 1) return { first: parts[0], middle: "", last: "" };
  return { first: parts[0], middle: parts.slice(1, -1).join(" "), last: parts[parts.length - 1] };
}

/**
 * The paper ACCESS application (CF-ES 2337) has no fillable fields, so we put a one-page
 * answer sheet in front of it with everything the navigator needs to type into the ACCESS
 * portal (or copy onto the paper form) in the order the application asks for it.
 */
async function answersPage(pdf: PDFDocument, d: CaseData) {
  const page = pdf.insertPage(0, [612, 792]);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const green = rgb(0.18, 0.42, 0.31);
  let y = 740;
  const line = (label: string, value: string) => {
    page.drawText(label, { x: 60, y, size: 10.5, font: bold, color: rgb(0.12, 0.18, 0.15) });
    page.drawText(value || "—", { x: 250, y, size: 10.5, font, color: rgb(0.12, 0.18, 0.15) });
    y -= 17;
  };
  const head = (s: string) => { y -= 6; page.drawText(s, { x: 60, y, size: 12, font: bold, color: green }); y -= 18; };
  page.drawText(d.org_name || "Helping Hand", { x: 60, y, size: 18, font: bold, color: green }); y -= 20;
  page.drawText("ACCESS Florida application — prepared answers (attach to CF-ES 2337 or enter in the ACCESS portal)", { x: 60, y, size: 10, font, color: rgb(0.37, 0.45, 0.41) }); y -= 10;
  page.drawLine({ start: { x: 60, y }, end: { x: 552, y }, thickness: 1.2, color: green }); y -= 14;
  head("Applicant");
  line("Full legal name", full(d));
  line("Other names used", d.other_names ?? "");
  line("Date of birth", fmtDate(d.dob));
  line("Sex", d.sex ?? "");
  line("Place of birth", [d.birth_city, d.birth_state, d.birth_country].filter(Boolean).join(", "));
  line("U.S. citizen", d.us_citizen === true ? "Yes" : d.us_citizen === false ? "No" : "");
  line("Social Security number", d.ssn_known === true ? `Known (last 4: ${d.ssn_last4 ?? "—"})` : d.ssn_known === false ? "Does not know / never had one" : "");
  line("Phone", d.phone || "None — contact through Helping Hand " + (d.org_phone ?? ""));
  head("Where to send mail");
  line("Mailing address", d.mailing_address ?? "");
  line("Living situation", ["Experiencing homelessness", d.sleep_area, d.homeless_duration ? `for about ${d.homeless_duration}` : ""].filter(Boolean).join(" — "));
  line("Shelter / housing costs", "None");
  head("Programs requested");
  line("Food Assistance (SNAP)", "Yes — expedited review requested (no income, no shelter)");
  line("Medicaid", "Yes");
  line("Temporary Cash Assistance", "Ask applicant");
  head("Household & income");
  line("Household size", "1 (applicant only)");
  line("Earned income", "Ask applicant (default: none)");
  line("Unearned income / benefits", "Ask applicant (default: none)");
  line("Resources (cash, bank)", "Ask applicant (default: none)");
  head("Documents on file with Helping Hand");
  line("Photo ID", d.has_photo_id ? "Yes" : "No — being requested");
  line("Birth certificate", d.has_birth_cert ? "Yes" : "No — being requested");
  line("Social Security card", d.has_ssn_card ? "Yes" : "No — being requested");
  line("Homeless verification letter", "Attached (Helping Hand)");
  head("Authorization");
  line("Signed by", `${d.signature_name || full(d)}${d.signed_at ? " on " + fmtDate(d.signed_at) : ""}`);
  line("Prepared by", `${d.navigator_name || "Navigator"}, ${d.org_name || "Helping Hand"}${d.org_phone ? " · " + d.org_phone : ""}`);
  if (d.signature_data && d.signature_data.startsWith("data:image/png;base64,")) {
    try {
      const img = await pdf.embedPng(Buffer.from(d.signature_data.split(",")[1], "base64"));
      const w = 150, h = (img.height / img.width) * w;
      page.drawImage(img, { x: 400, y: 60, width: w, height: h });
    } catch {}
  }
}

function applyRules(pdf: PDFDocument, rules: Rule[]) {
  const form = pdf.getForm();
  const filled: string[] = [];
  for (const f of form.getFields()) {
    const n = norm(f.getName());
    const rule = rules.find((r) => r.match.some((m) => m.test(n)) && !(r.exclude ?? []).some((x) => x.test(n)));
    if (!rule) continue;
    try {
      if (f instanceof PDFTextField && typeof rule.value === "string" && rule.value) { f.setText(rule.value); filled.push(f.getName()); }
      else if (f instanceof PDFCheckBox && rule.value === true) { f.check(); filled.push(f.getName()); }
      else if (f instanceof PDFDropdown && typeof rule.value === "string" && rule.value) { try { f.select(rule.value); filled.push(f.getName()); } catch {} }
      else if (f instanceof PDFRadioGroup && typeof rule.value === "string" && rule.value) { try { f.select(rule.value); filled.push(f.getName()); } catch {} }
    } catch { /* skip fields that refuse the value */ }
  }
  try { form.updateFieldAppearances(); } catch {}
  return filled;
}

/** Homeless verification letter on Helping Hand letterhead (generated, not an agency form). */
async function letterPdf(d: CaseData): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([612, 792]);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const green = rgb(0.18, 0.42, 0.31);
  const org = d.org_name || "Helping Hand";
  let y = 730;
  const text = (s: string, opts: { size?: number; b?: boolean; color?: ReturnType<typeof rgb>; x?: number } = {}) => {
    page.drawText(s, { x: opts.x ?? 72, y, size: opts.size ?? 11, font: opts.b ? bold : font, color: opts.color ?? rgb(0.12, 0.18, 0.15) });
    y -= (opts.size ?? 11) * 1.55;
  };
  const wrap = (s: string, size = 11, width = 468) => {
    const words = s.split(" "); let line = "";
    for (const w of words) {
      const t = line ? line + " " + w : w;
      if (font.widthOfTextAtSize(t, size) > width) { text(line, { size }); line = w; } else line = t;
    }
    if (line) text(line, { size });
    y -= 6;
  };
  text(org, { size: 22, b: true, color: green });
  text([d.mailing_address, d.org_phone].filter(Boolean).join("   |   "), { size: 10, color: rgb(0.37, 0.45, 0.41) });
  page.drawLine({ start: { x: 72, y: y + 4 }, end: { x: 540, y: y + 4 }, thickness: 1.5, color: green });
  y -= 22;
  text(today());
  y -= 8;
  text("To whom it may concern (Florida Department of Highway Safety and Motor Vehicles, Social Security Administration, Florida Department of Health, Florida Department of Children and Families):", { size: 10.5 });
  y -= 6;
  text("Re: Verification of homelessness for " + full(d), { b: true });
  y -= 4;
  wrap(`${org} is a community program serving people experiencing homelessness in North Miami and northeast Miami-Dade County, Florida. This letter certifies that ${full(d)}${d.dob ? ", date of birth " + fmtDate(d.dob) + "," : ""} is known to our program and is currently experiencing homelessness${d.sleep_area ? ", most recently staying " + d.sleep_area : ""}${d.homeless_duration ? " for approximately " + d.homeless_duration : ""}.`);
  wrap(`${full(d)} has no fixed residential address. ${org} agrees to receive mail on this person's behalf at the address above and to deliver it to them in person. Please accept this letter as verification of homelessness for the purpose of fee exemptions and identification requirements under Florida law (including section 322.21(1)(a) and section 382.025, Florida Statutes) and for the Social Security Administration's evidence requirements for a replacement card.`);
  wrap(`If you have any questions about this verification, please contact me directly at the number below.`);
  y -= 18;
  text("Sincerely,");
  y -= 30;
  text(d.navigator_name || "Navigator", { b: true });
  text(`${org}${d.org_phone ? "  |  " + d.org_phone : ""}`, { size: 10 });
  y -= 24;
  text("Applicant acknowledgment", { b: true, size: 10.5 });
  wrap(`I, ${full(d)}, confirm that the information above is true and that I authorize ${org} to receive and hold mail for me.`, 10.5);
  if (d.signature_data && d.signature_data.startsWith("data:image/png;base64,")) {
    try {
      const img = await pdf.embedPng(Buffer.from(d.signature_data.split(",")[1], "base64"));
      const w = 180, h = (img.height / img.width) * w;
      page.drawImage(img, { x: 72, y: y - h + 6, width: w, height: h });
      y -= h + 4;
    } catch {}
  } else { y -= 36; }
  page.drawLine({ start: { x: 72, y: y + 2 }, end: { x: 300, y: y + 2 }, thickness: 0.8, color: rgb(0.4, 0.4, 0.4) });
  y -= 14;
  text(`${d.signature_name || full(d)}   ${d.signed_at ? fmtDate(d.signed_at) : ""}`, { size: 10 });
  return pdf.save();
}

export async function GET(req: NextRequest) {
  const form = req.nextUrl.searchParams.get("form") ?? "";
  if (!SOURCES[form]) return NextResponse.json({ error: "unknown form", forms: Object.keys(SOURCES) }, { status: 400 });
  if (req.nextUrl.searchParams.get("fresh")) cache.delete(form);
  try {
    const { bytes, from } = await fetchForm(form);
    const pdf = await PDFDocument.load(bytes, { ignoreEncryption: true });
    const dropped = sanitizeForm(pdf);
    const pages = pdf.getPages();
    const fields = pdf.getForm().getFields().map((f) => {
      const w = f.acroField.getWidgets()[0];
      let page = -1, rect: number[] = [];
      try {
        const r = w.getRectangle(); rect = [Math.round(r.x), Math.round(r.y), Math.round(r.width), Math.round(r.height)];
        const pref = w.P(); page = pages.findIndex((p) => p.ref === pref);
      } catch {}
      return { name: f.getName(), type: f.constructor.name, page, rect, widgets: f.acroField.getWidgets().length };
    });
    return NextResponse.json({ form, from, dropped, pages: pages.length, size: pages.map((p) => [Math.round(p.getWidth()), Math.round(p.getHeight())]), fieldCount: fields.length, fields });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 502 });
  }
}

export async function POST(req: NextRequest) {
  const { form, data } = (await req.json()) as { form: string; data: CaseData };
  try {
    if (form === "letter") {
      const out = await letterPdf(data);
      return new NextResponse(Buffer.from(out), { headers: { "content-type": "application/pdf", "content-disposition": `attachment; filename="homeless-verification-letter.pdf"` } });
    }
    if (!SOURCES[form]) return NextResponse.json({ error: "unknown form" }, { status: 400 });
    const { bytes } = await fetchForm(form);
    const pdf = await PDFDocument.load(bytes, { ignoreEncryption: true });
    sanitizeForm(pdf);
    const filled = applyRules(pdf, rulesFor(form, data));
    if (form === "cfes2337") await answersPage(pdf, data);
    const out = await pdf.save();
    return new NextResponse(Buffer.from(out), {
      headers: { "content-type": "application/pdf", "content-disposition": `attachment; filename="${SOURCES[form].filename}"`, "x-filled-fields": String(filled.length) },
    });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 502 });
  }
}
