import { useEffect, useState } from "react";
import { ShieldCheck, LayoutDashboard, Grid2X2, BellRing, ArrowRightLeft, History, Search, Save, RotateCcw, Check, LockKeyhole, Eye, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { Button, Empty, Select, TextInput } from "@/components/console/ui";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import {
  ACTIONS, DASH_SECTIONS, MODULES, REMINDER_ACTIONS, ROLES, levelOf, loadAudit, loadRules, savePermissions, usePermissions,
  type Audit, type Level, type Perm, type PermRole, type Rule,
} from "@/lib/permissions";
import { engineerName, useData } from "@/lib/store";

type Sec = "dashboard" | "modules" | "reminders" | "handoffs" | "history";
const SECS = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "modules", label: "Module permissions", icon: Grid2X2 },
  { id: "reminders", label: "Reminders", icon: BellRing },
  { id: "handoffs", label: "Team handoffs", icon: ArrowRightLeft },
  { id: "history", label: "Audit history", icon: History },
] as const;
const LABEL: Record<Level, string> = { none: "Deny", own: "Own / default", all: "Allow all" };
const TONE: Record<Level, string> = { none: "text-sev-critical", own: "text-mute", all: "text-sev-low" };
const key = (r: string, m: string, a: string) => `${r}|${m}|${a}`;
const moduleLabel = (m: string) => m.startsWith("dash:") ? DASH_SECTIONS.find(([s]) => `dash:${s}` === m)?.[1] ?? m : MODULES.find(([s]) => s === m)?.[1] ?? m;
const roleLabel = (r: string) => ROLES.find(([s]) => s === r)?.[1] ?? r;

export function AccessControl() {
  const perms = usePermissions();
  const data = useData();
  const [draft, setDraft] = useState<Record<string, Level>>({});
  const [rules, setRules] = useState<Rule[]>([]);
  const [ruleDraft, setRuleDraft] = useState<Record<string, boolean>>({});
  const [audit, setAudit] = useState<Audit[]>([]);
  const [sec, setSec] = useState<Sec>("modules");
  const [q, setQ] = useState("");
  const [role, setRole] = useState<PermRole>("customer_success");
  const [filter, setFilter] = useState<"any" | Level | "changed">("any");
  const [saving, setSaving] = useState(false);
  const [review, setReview] = useState(false);
  const [loadError, setLoadError] = useState(false);

  const refresh = () => {
    setLoadError(false);
    Promise.all([loadRules(), loadAudit()]).then(([r, a]) => { setRules(r); setAudit(a); }).catch(() => setLoadError(true));
  };
  useEffect(refresh, []);
  const lv = (r: string, m: string, a: string): Level => draft[key(r, m, a)] ?? levelOf(perms, r, m, a);
  const set = (r: string, m: string, a: string, value: Level) => {
    const k = key(r, m, a);
    setDraft((d) => { const n = { ...d }; if (value === levelOf(perms, r, m, a)) delete n[k]; else n[k] = value; return n; });
  };
  const originalRule = (f: string, t: string) => rules.find((r) => r.from_domain === f && r.to_domain === t)?.allowed ?? true;
  const ruleOn = (f: string, t: string) => ruleDraft[`${f}|${t}`] ?? originalRule(f, t);
  const changeRule = (f: string, t: string, allowed: boolean) => setRuleDraft((d) => {
    const n = { ...d }; const k = `${f}|${t}`; if (allowed === originalRule(f, t)) delete n[k]; else n[k] = allowed; return n;
  });
  const changes: Perm[] = Object.entries(draft).flatMap(([k, level]) => {
    const [r, module, action] = k.split("|");
    return r && module && action ? [{ role: r as PermRole, module, action, level }] : [];
  });
  const ruleChanges: Rule[] = Object.entries(ruleDraft).flatMap(([k, allowed]) => {
    const [from, to] = k.split("|"); return from && to ? [{ from_domain: from as PermRole, to_domain: to as PermRole, allowed }] : [];
  });
  const dirty = changes.length + ruleChanges.length;
  const discard = () => { setDraft({}); setRuleDraft({}); setReview(false); };
  const save = async () => {
    setSaving(true);
    try { await savePermissions(changes, ruleChanges); discard(); refresh(); toast.success("Access settings saved"); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Could not save"); }
    finally { setSaving(false); }
  };
  const search = q.trim().toLowerCase();
  const matches = (m: string, a: string) => filter === "any" || (filter === "changed" ? key(role, m, a) in draft : lv(role, m, a) === filter);
  const modules = MODULES.filter(([m, l]) => m !== "reminders" && (!search || `${m} ${l}`.toLowerCase().includes(search)) && ACTIONS.some((a) => matches(m, a)));
  const sections = DASH_SECTIONS.filter(([m, l]) => (!search || l.toLowerCase().includes(search)) && matches(`dash:${m}`, "view"));
  const counts = { none: 0, own: 0, all: 0 };
  for (const [m] of MODULES) for (const a of m === "reminders" ? REMINDER_ACTIONS : ACTIONS) counts[lv(role, m, a)]++;
  const LevelControl = ({ m, a }: { m: string; a: string }) => {
    const value = lv(role, m, a), changed = key(role, m, a) in draft;
    return <div className={cn("relative", changed && "rounded-md outline-2 outline-signal/50")}>
      <Select aria-label={`${roleLabel(role)} ${moduleLabel(m)} ${a}`} value={value} onChange={(e) => set(role, m, a, e.target.value as Level)} className={cn("min-h-9 min-w-28 text-xs", TONE[value])}>
        {(["none", "own", "all"] as Level[]).map((l) => <option key={l} value={l}>{LABEL[l]}</option>)}
      </Select>
    </div>;
  };
  const history = audit.filter((a) => !search || `${a.setting} ${a.old_value} ${a.new_value}`.toLowerCase().includes(search));

  return <div className="min-w-0 space-y-5">
    <header className="flex flex-wrap items-center justify-between gap-4 border-b border-line pb-4">
      <div className="flex items-center gap-3"><ShieldCheck className="size-8 text-signal" /><div><h2 className="text-xl font-semibold">Access Control</h2><p className="text-xs text-mute">Roles, permissions & team boundaries</p></div></div>
      <span className="flex items-center gap-2 text-xs text-mute"><LockKeyhole className="size-4" />Manager · Full access</span>
    </header>
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex flex-wrap gap-2" aria-label="Permission role">
        {ROLES.map(([r, label]) => <Button key={r} variant={role === r ? "solid" : "outline"} onClick={() => setRole(r)}>{role === r && <Check className="size-3" />}{label}</Button>)}
      </div>
      <div className="flex flex-wrap items-center gap-4 text-xs">
        <span className="flex items-center gap-1.5 text-sev-critical"><LockKeyhole className="size-3" /><b className="num">{counts.none}</b> denied</span>
        <span className="text-mute"><b className="num">{counts.own}</b> own / default</span>
        <span className="flex items-center gap-1.5 text-sev-low"><Eye className="size-3" /><b className="num">{counts.all}</b> allow all</span>
      </div>
    </div>
    <div className="flex gap-1 overflow-x-auto border-b border-line pb-3" aria-label="Access categories">
      {SECS.map(({ id, label, icon: Icon }) => <Button key={id} variant={sec === id ? "solid" : "ghost"} className="shrink-0" onClick={() => { setSec(id); setQ(""); setFilter("any"); }}><Icon className="size-4" />{label}</Button>)}
    </div>
    <div className="flex flex-wrap items-center gap-3">
      <div className="relative min-w-44 flex-1"><Search className="pointer-events-none absolute top-2.5 left-2.5 size-4 text-mute" /><TextInput aria-label="Search access settings" placeholder={sec === "history" ? "Search audit history…" : "Find a setting…"} className="min-h-9 pl-9" value={q} onChange={(e) => setQ(e.target.value)} /></div>
      {(sec === "modules" || sec === "dashboard") && <Select aria-label="Permission filter" className="min-h-9 w-auto" value={filter} onChange={(e) => setFilter(e.target.value as typeof filter)}><option value="any">All permissions</option><option value="none">Denied</option><option value="own">Own / default</option><option value="all">Allow all</option><option value="changed">Unsaved changes</option></Select>}
    </div>
    {loadError && <div className="flex items-center gap-3 text-xs text-sev-critical">Could not load handoffs or audit history.<Button onClick={refresh}>Retry</Button></div>}
    {perms === null ? <Empty>Loading permissions…</Empty> : <>
      {sec === "modules" && <section>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2"><h3 className="font-semibold">Module permissions <span className="num text-xs font-normal text-mute">{modules.length}</span></h3><span className="text-xs text-mute">{roleLabel(role)}</span></div>
        <div className="hidden overflow-x-auto rounded-md border border-line bg-panel md:block"><table className="w-full text-sm"><thead className="bg-base text-left text-xs text-mute"><tr><th className="min-w-44 px-4 py-3">Module</th>{ACTIONS.map((a) => <th className="px-2 py-3 capitalize" key={a}>{a}</th>)}</tr></thead><tbody className="divide-y divide-line">{modules.map(([m, label]) => <tr key={m}><th className="px-4 py-3 text-left text-sm font-medium">{label}</th>{ACTIONS.map((a) => <td className="px-2 py-3" key={a}><LevelControl m={m} a={a} /></td>)}</tr>)}</tbody></table></div>
        <div className="grid gap-3 md:hidden">{modules.map(([m, label]) => <article key={m} className="rounded-md border border-line bg-panel p-3"><h4 className="mb-3 font-semibold">{label}</h4><div className="grid grid-cols-2 gap-3">{ACTIONS.map((a) => <label key={a} className="min-w-0"><span className="mb-1 block text-xs text-mute capitalize">{a}</span><LevelControl m={m} a={a} /></label>)}</div></article>)}</div>
        {!modules.length && <Empty>No settings match these filters.</Empty>}
      </section>}
      {sec === "dashboard" && <section className="grid gap-6 lg:grid-cols-[3fr_2fr]">
        <div><h3 className="mb-3 font-semibold">Dashboard visibility</h3><ul className="divide-y divide-line border-y border-line">{sections.map(([m, label]) => <li key={m} className="flex items-center gap-3 py-3"><span className="flex-1 text-sm">{label}</span><span className="text-xs text-mute">{lv(role, `dash:${m}`, "view") === "none" ? "Hidden" : "Visible"}</span><Switch aria-label={`${label} visibility`} checked={lv(role, `dash:${m}`, "view") !== "none"} onCheckedChange={(on) => set(role, `dash:${m}`, "view", on ? "own" : "none")} /></li>)}</ul>{!sections.length && <Empty>No settings match.</Empty>}</div>
        <aside className="border-l border-line pl-4"><h3 className="mb-3 flex items-center gap-2 font-semibold"><Eye className="size-4 text-signal" />{roleLabel(role)} preview</h3><ul className="space-y-2">{DASH_SECTIONS.map(([m, label]) => <li key={m} className={cn("flex items-center justify-between gap-3 text-sm", lv(role, `dash:${m}`, "view") === "none" ? "text-mute" : "text-ink")}><span>{label}</span>{lv(role, `dash:${m}`, "view") === "none" ? <LockKeyhole className="size-3" /> : <Check className="size-3 text-sev-low" />}</li>)}</ul></aside>
      </section>}
      {sec === "reminders" && <section><h3 className="mb-3 font-semibold">Reminder permissions · {roleLabel(role)}</h3><div className="divide-y divide-line border-y border-line">{REMINDER_ACTIONS.filter((a) => !search || a.includes(search)).map((a) => <div key={a} className="flex items-center justify-between gap-3 py-3"><span className="text-sm capitalize">{a}</span><LevelControl m="reminders" a={a} /></div>)}</div></section>}
      {sec === "handoffs" && <section><h3 className="mb-3 font-semibold">Reminder assignment routes</h3><ul className="divide-y divide-line border-y border-line">{ROLES.flatMap(([f, fl]) => ROLES.map(([to, tl]) => ({ f, fl, to, tl }))).filter((x) => !search || `${x.fl} ${x.tl}`.toLowerCase().includes(search)).map(({ f, fl, to, tl }) => <li key={`${f}|${to}`} className="flex flex-wrap items-center gap-3 py-4"><div className="flex min-w-0 flex-1 flex-wrap items-center gap-2 text-sm"><span>{fl}</span><ArrowRightLeft className="size-4 text-mute" /><span>{tl}</span></div><span className={cn("text-xs", ruleOn(f, to) ? "text-sev-low" : "text-sev-critical")}>{ruleOn(f, to) ? "Allowed" : "Blocked"}</span><Switch aria-label={`${fl} to ${tl}`} checked={ruleOn(f, to)} onCheckedChange={(on) => changeRule(f, to, on)} /></li>)}</ul></section>}
      {sec === "history" && <section><h3 className="mb-3 font-semibold">Recent permission changes</h3>{history.length ? <ol className="divide-y divide-line border-y border-line">{history.map((a) => <li key={a.id} className="flex gap-3 py-4"><History className="mt-1 size-4 shrink-0 text-mute" /><div className="min-w-0 flex-1"><div className="break-words text-sm font-medium">{a.setting}</div><div className="mt-1 flex flex-wrap items-center gap-2 text-xs"><span className="text-mute">{a.old_value || "Default"}</span><span>→</span><span>{a.new_value}</span></div><div className="mt-2 text-xs text-mute">{new Date(a.changed_at).toLocaleString("en-IN")} · {engineerName(data, data.profiles.find((p) => p.id === a.changed_by)?.engineerId ?? a.changed_by)}</div></div></li>)}</ol> : <Empty>No permission changes match.</Empty>}</section>}
    </>}
    <footer className="relative z-20 flex flex-wrap items-center justify-between gap-3 rounded-md border border-line bg-panel p-3 md:sticky md:bottom-3">
      <span className="flex items-center gap-2 text-xs">{dirty ? <><AlertTriangle className="size-4 text-sev-medium" /><b className="num">{dirty}</b> unsaved changes</> : <><ShieldCheck className="size-4 text-sev-low" />All changes saved</>}</span><div className="flex gap-2"><Button variant="ghost" disabled={!dirty || saving} onClick={discard}><RotateCcw className="size-3" />Discard</Button><Button variant="solid" disabled={!dirty || saving} onClick={() => setReview(true)}><Save className="size-3" />Review & save</Button></div>
    </footer>
    <Dialog open={review} onOpenChange={setReview}><DialogContent><DialogHeader><DialogTitle>Review access changes</DialogTitle><DialogDescription>{dirty} changes awaiting your confirmation.</DialogDescription></DialogHeader><ul className="max-h-80 divide-y divide-line overflow-y-auto">{changes.map((c) => <li key={key(c.role, c.module, c.action)} className="py-3 text-xs"><div className="font-medium">{roleLabel(c.role)} · {moduleLabel(c.module)} · {c.action}</div><div className="mt-1 text-mute">{LABEL[levelOf(perms, c.role, c.module, c.action)]} → <span className={TONE[c.level]}>{LABEL[c.level]}</span></div></li>)}{ruleChanges.map((r) => <li key={`${r.from_domain}|${r.to_domain}`} className="py-3 text-xs">{roleLabel(r.from_domain)} → {roleLabel(r.to_domain)}<div className="mt-1 text-mute">{originalRule(r.from_domain, r.to_domain) ? "Allowed" : "Blocked"} → {r.allowed ? "Allowed" : "Blocked"}</div></li>)}</ul>{changes.some((c) => c.level === "all") && <p className="flex items-start gap-2 text-xs text-sev-critical"><AlertTriangle className="size-4 shrink-0" />Allow all widens access beyond existing ownership rules.</p>}<div className="flex justify-end gap-2"><Button onClick={() => setReview(false)} disabled={saving}>Keep editing</Button><Button variant="solid" onClick={() => void save()} disabled={saving || !dirty}>{saving ? "Saving…" : "Confirm changes"}</Button></div></DialogContent></Dialog>
  </div>;
}
