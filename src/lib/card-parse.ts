// Pure rules that turn visiting-card OCR text into contact fields (no network, no AI).
export interface CardFields { name: string; position: string; company: string; phone: string; altPhone: string; email: string; website: string; address: string }

const TITLE = /\b(manager|engineer|director|head|officer|executive|president|ceo|cto|cfo|coo|gm|agm|dgm|vp|lead|supervisor|incharge|in-charge|consultant|chairman|founder|partner|owner|proprietor|specialist|analyst|superintendent|sr\.?|jr\.?)\b/i;
const COMPANY = /\b(ltd|limited|pvt|private|inc|llp|llc|corp|corporation|industries|enterprises|company|co\.|group|solutions|technologies|systems|engineering|works|mills|chemicals|steel|power|pharma|plant)\b/i;
const ADDRESS = /\b(road|rd\.?|street|st\.|nagar|floor|plot|sector|midc|phase|near|opp\.?|dist|district|pin|india|maharashtra|gujarat|karnataka|tamil|block|lane|park|estate|area)\b|\b\d{6}\b/i;

export function parseCard(raw: string): CardFields {
  const lines = raw.split(/\r?\n/).map((l) => l.replace(/[|_~]+/g, " ").replace(/\s+/g, " ").trim()).filter((l) => l.length > 1);
  const all = lines.join("\n");
  const email = (all.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0] ?? "").toLowerCase();
  const website = (all.match(/\b(?:https?:\/\/)?(?:www\.)[a-z0-9-]+(?:\.[a-z0-9-]+)+\b/i)?.[0] ?? "").toLowerCase();
  const phones = [...all.matchAll(/(?:\+?\d[\d\s\-().]{8,}\d)/g)]
    .map((m) => m[0].replace(/[^\d+]/g, ""))
    .filter((p) => p.replace(/\D/g, "").length >= 10 && p.replace(/\D/g, "").length <= 13 && !/^\d{6}$/.test(p));
  const uniqPhones = [...new Set(phones)];
  const used = (l: string) => /@|www\.|https?:/i.test(l) || /\d{5,}/.test(l.replace(/[\s\-()]/g, "")) || /^(tel|ph|mob|m|t|fax|e|email)\b/i.test(l);
  const text = lines.filter((l) => !used(l));
  const position = text.find((l) => TITLE.test(l)) ?? "";
  const company = text.find((l) => l !== position && COMPANY.test(l)) ?? "";
  const address = text.filter((l) => l !== position && l !== company && ADDRESS.test(l)).join(", ");
  const name = text.find((l) => l !== position && l !== company && !ADDRESS.test(l) && /^[A-Za-z.\s']{3,40}$/.test(l) && l.split(" ").length <= 4) ?? "";
  return { name, position, company, phone: uniqPhones[0] ?? "", altPhone: uniqPhones[1] ?? "", email, website, address };
}
