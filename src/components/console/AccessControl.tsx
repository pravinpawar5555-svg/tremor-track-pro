import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Button, Empty, Panel, Select, TextInput } from "@/components/console/ui";
import {
  ACTIONS, DASH_SECTIONS, MODULES, REMINDER_ACTIONS, ROLES, levelOf, loadAudit, loadRules, savePermissions, usePermissions,
  type Audit, type Level, type Perm, type PermRole, type Rule,
} from "@/lib/permissions";

type Sec = "dashboard" | "modules" | "reminders" | "handoffs" | "history";
const SECS: [Sec, string][] = [["dashboard", "Dashboard Access"], ["modules", "Module Permissions"], ["reminders", "Reminder Rules"], ["handoffs", "Handoffs"], ["history", "Change history"]];
const LEVEL_LABEL: Record<Level, string> = { none: "Deny", own: "Own / default", all: "Allow all" };
const levelTone: Record<Level, string> = { none: "text-sev-high ring-sev-high/40", own: "text-ink ring-line", all: "text-sev-low ring-sev-low/40" };
const key = (r: string, m: string, a: string) => `${r}|${m}|${a}`;

export function AccessControl() {
  const perms = usePermissions();
  const [draft, setDraft] = useState<Record<string, Level>>({});
  const [rules, setRules] = useState<Rule[]>([]);
  const [ruleDraft, setRuleDraft] = useState<Record<string, boolean>>({});
  const [audit, setAudit] = useState<Audit[]>([]);
  const [sec, setSec] = useState<Sec>("dashboard");
  const [q, setQ] = useState("");
  const [roleF, setRoleF] = useState<"" | PermRole>("");
  const [preview, setPreview] = useState<PermRole>("customer_success");
  const [saving, setSaving] = useState(false);

  const refresh = () => { loadRules().then(setRules); loadAudit().then(setAudit); };
  useEffect(refresh, []);

  const lv = (r: string, m: string, a: string): Level => draft[key(r, m, a)] ?? levelOf(perms, r, m, a);
  const set = (r: string, m: string, a: string, v: Level) => {
    const k = key(r, m, a);
    const orig = levelOf(perms, r, m, a);
    setDraft((d) => { const n = { ...d }; if (v === orig) delete n[k]; else n[k] = v; return n; });
  };
  const ruleOn = (f: string, t: string) => ruleDraft[`${f}|${t}`] ?? rules.find((x) => x.from_domain === f && x.to_domain === t)?.allowed ?? true;
  const dirty = Object.keys(draft).length + Object.keys(ruleDraft).length;
  const t = q.trim().toLowerCase();
  const roles = ROLES.filter(([r]) => !roleF || r === roleF);

  const save = async () => {
    setSaving(true);
    try {
      const changed: Perm[] = Object.entries(draft).map(([k, level]) => { const [role, module, action] = k.split("|"); return { role: role as PermRole, module: module!, action: action!, level }; });
      const rs: Rule[] = Object.entries(ruleDraft).map(([k, allowed]) => { const [f, to] = k.split("|"); return { from_domain: f as PermRole, to_domain: to as PermRole, allowed }; });
      await savePermissions(changed, rs);
      setDraft({}); setRuleDraft({}); refresh();
      toast.success("Access settings saved");
    } catch (e: any) { toast.error(e.message ?? "Could not save"); } finally { setSaving(false); }
  };

  const LevelSelect = ({ r, m, a, binary }: { r: string; m: string; a: string; binary?: boolean }) => {
    const v = lv(r, m, a);
    const changed = key(r, m, a) in draft;
    return (
      <Select aria-label={`${r} ${m} ${a}`} value={v} onChange={(e) => set(r, m, a, e.target.value as Level)}
        className={`w-auto py-0.5 text-[11px] ring-1 ${levelTone[v]} ${changed ? "outline outline-2 outline-signal/60" : ""}`}>
        {binary ? (<><option value="own">Visible</option><option value="none">Hidden</option></>) :
          (["none", "own", "all"] as Level[]).map((l) => <option key={l} value={l}>{LEVEL_LABEL[l]}</option>)}
      </Select>
    );
  };

  const modules = MODULES.filter(([m, l]) => !t || l.toLowerCase().includes(t) || m.includes(t));
  const sections = DASH_SECTIONS.filter(([, l]) => !t || l.toLowerCase().includes(t));

  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap items-center gap-2">
        {SECS.map(([s, l]) => (
          <button key={s} onClick={() => setSec(s)} className={`rounded-md px-3 py-1.5 text-xs ring-1 ${sec === s ? "bg-signal/10 font-medium text-signal ring-signal/40" : "text-mute ring-line/80 hover:bg-black/5"}`}>{l}</button>
        ))}
        <TextInput className="min-w-0 flex-1" placeholder="Search any setting…" value={q} onChange={(e) => setQ(e.target.value)} />
        <Select value={roleF} onChange={(e) => setRoleF(e.target.value as any)} className="w-auto">
          <option value="">All roles</option>
          {ROLES.map(([r, l]) => <option key={r} value={r}>{l}</option>)}
        </Select>
      </div>
      <div className="flex flex-wrap items-center gap-2 rounded-md border border-line/70 px-3 py-2 text-xs text-mute">
        <span>Admin (Manager) always has full access. <b>Deny</b> blocks the data itself, <b>Own / default</b> keeps today's rules, <b>Allow all</b> opens every record.</span>
        <span className="ml-auto">{dirty ? `${dirty} unsaved change${dirty > 1 ? "s" : ""}` : "No unsaved changes"}</span>
        <Button variant="ghost" disabled={!dirty || saving} onClick={() => { setDraft({}); setRuleDraft({}); }}>Discard</Button>
        <Button variant="solid" disabled={!dirty || saving} onClick={save}>{saving ? "Saving…" : "Save"}</Button>
      </div>

      {sec === "dashboard" && (
        <div className="grid gap-3 lg:grid-cols-[2fr_1fr]">
          <Panel title="Dashboard sections">
            <table className="w-full text-sm">
              <thead><tr className="text-left text-xs text-mute"><th className="px-4 py-2">Section</th><th>Admin</th>{roles.map(([r, l]) => <th key={r}>{l}</th>)}</tr></thead>
              <tbody className="divide-y divide-line/60">
                {sections.map(([s, l]) => (
                  <tr key={s}><td className="px-4 py-2">{l}</td><td className="text-xs text-mute">Visible</td>{roles.map(([r]) => <td key={r}><LevelSelect r={r} m={`dash:${s}`} a="view" binary /></td>)}</tr>
                ))}
              </tbody>
            </table>
            {!sections.length && <Empty>No match.</Empty>}
          </Panel>
          <Panel title="Preview" meta={<Select value={preview} onChange={(e) => setPreview(e.target.value as PermRole)} className="w-auto">{ROLES.map(([r, l]) => <option key={r} value={r}>{l}</option>)}</Select>}>
            <div className="grid gap-2 p-3">
              <div className="label-caps">Menu</div>
              <div className="flex flex-wrap gap-1">
                <span className="rounded bg-signal/10 px-2 py-0.5 text-[11px] text-signal">Dashboard</span>
                {MODULES.filter(([m]) => m !== "reminders" && m !== "settings" && lv(preview, m, "view") !== "none").map(([m, l]) => <span key={m} className="rounded bg-signal/10 px-2 py-0.5 text-[11px] text-signal">{l}</span>)}
              </div>
              <div className="label-caps mt-2">Dashboard</div>
              <div className="grid grid-cols-2 gap-1.5">
                {DASH_SECTIONS.filter(([s]) => lv(preview, `dash:${s}`, "view") !== "none").map(([s, l]) => <div key={s} className="panel-inset p-2 text-[11px]">{l}</div>)}
              </div>
            </div>
          </Panel>
        </div>
      )}

      {sec === "modules" && (
        <Panel title="Module permissions">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="text-left text-xs text-mute"><th className="px-4 py-2">Module</th><th>Role</th>{ACTIONS.map((a) => <th key={a} className="capitalize">{a}</th>)}</tr></thead>
              <tbody className="divide-y divide-line/60">
                {modules.filter(([m]) => m !== "reminders").flatMap(([m, l]) => roles.map(([r, rl], i) => (
                  <tr key={m + r}><td className="px-4 py-1.5 font-medium">{i === 0 ? l : ""}</td><td className="text-xs text-mute">{rl}</td>{ACTIONS.map((a) => <td key={a} className="py-1 pr-1"><LevelSelect r={r} m={m} a={a} /></td>)}</tr>
                )))}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-2 text-[11px] text-mute">View, create and edit are enforced in the database. Assign, approve, close and export control the screen actions.</div>
        </Panel>
      )}

      {sec === "reminders" && (
        <Panel title="Who can work with reminders">
          <table className="w-full text-sm">
            <thead><tr className="text-left text-xs text-mute"><th className="px-4 py-2">Role</th>{REMINDER_ACTIONS.map((a) => <th key={a} className="capitalize">{a}</th>)}</tr></thead>
            <tbody className="divide-y divide-line/60">
              {roles.map(([r, l]) => <tr key={r}><td className="px-4 py-2">{l}</td>{REMINDER_ACTIONS.map((a) => <td key={a}><LevelSelect r={r} m="reminders" a={a} /></td>)}</tr>)}
            </tbody>
          </table>
        </Panel>
      )}

      {sec === "handoffs" && (
        <Panel title="Reminder handoffs — who can send to whom">
          <ul className="divide-y divide-line/60">
            {ROLES.flatMap(([f, fl]) => ROLES.map(([to, tl]) => ({ f, fl, to, tl })))
              .filter((x) => (!roleF || x.f === roleF || x.to === roleF) && (!t || `${x.fl} ${x.tl}`.toLowerCase().includes(t)))
              .map(({ f, fl, to, tl }) => {
                const on = ruleOn(f, to);
                return (
                  <li key={f + to} className="flex items-center gap-3 px-4 py-2.5 text-sm">
                    <span>{fl} → {tl}</span>
                    <button type="button" onClick={() => setRuleDraft({ ...ruleDraft, [`${f}|${to}`]: !on })}
                      className={`ml-auto rounded-full px-3 py-1 text-xs ring-1 ${on ? "text-sev-low ring-sev-low/40" : "text-sev-high ring-sev-high/40"} ${`${f}|${to}` in ruleDraft ? "outline outline-2 outline-signal/60" : ""}`}>
                      {on ? "Allowed" : "Blocked"}
                    </button>
                  </li>
                );
              })}
          </ul>
          <div className="px-4 py-2 text-[11px] text-mute">The receiver always sees reminders sent to them. Blocked handoffs are refused when saving the reminder.</div>
        </Panel>
      )}

      {sec === "history" && (
        <Panel title="Permission change history">
          {audit.filter((a) => !t || a.setting.toLowerCase().includes(t)).length ? (
            <ul className="divide-y divide-line/60">
              {audit.filter((a) => !t || a.setting.toLowerCase().includes(t)).map((a) => (
                <li key={a.id} className="px-4 py-2 text-sm">
                  <span className="num text-xs text-mute">{new Date(a.changed_at).toLocaleString("en-IN")}</span>{" "}
                  <span className="font-medium">{a.setting}</span>: <span className="text-mute">{a.old_value}</span> → {a.new_value}
                  <span className="text-xs text-mute"> · by {a.changed_by}</span>
                </li>
              ))}
            </ul>
          ) : <Empty>No permission changes yet.</Empty>}
        </Panel>
      )}
    </div>
  );
}
