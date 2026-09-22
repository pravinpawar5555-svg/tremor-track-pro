import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/console/AppShell";
import { Button, PageHeader, Panel, SpecRow, Td, Th, Tr } from "@/components/console/ui";
import { customers, engineers, machines, sites } from "@/lib/data";

export const Route = createFileRoute("/administration")({
  head: () => ({
    meta: [
      { title: "Administration · Vibration Operations" },
      {
        name: "description",
        content: "User roles, customer and site masters, alarm limit configuration, monitoring frequency, notification triggers and data-quality rules.",
      },
      { property: "og:title", content: "Administration · Vibration Operations" },
      { property: "og:description", content: "Role permissions, masters, alarm limits and notification settings." },
    ],
  }),
  component: AdministrationPage,
});

const ROLE_MATRIX = [
  { capability: "Manage users and permissions", admin: true, analyst: false, manager: false },
  { capability: "Create customers, sites, machines", admin: true, analyst: false, manager: false },
  { capability: "Configure alarm and alert limits", admin: true, analyst: false, manager: false },
  { capability: "Review vibration data and spectra", admin: true, analyst: true, manager: true },
  { capability: "Record observations and classify condition", admin: false, analyst: true, manager: false },
  { capability: "Raise and close alerts", admin: false, analyst: true, manager: true },
  { capability: "Generate customer reports", admin: false, analyst: true, manager: true },
  { capability: "Approve and send reports", admin: false, analyst: false, manager: true },
  { capability: "View team accountability metrics", admin: true, analyst: false, manager: true },
  { capability: "View audit trail", admin: true, analyst: false, manager: true },
];

const NOTIFICATIONS = [
  { trigger: "Critical vibration exceedance", channel: "Email + in-app", recipients: "Analyst, Team Lead" },
  { trigger: "Significant vibration increase (>25% / 7 d)", channel: "In-app", recipients: "Assigned analyst" },
  { trigger: "New abnormality raised", channel: "Email + in-app", recipients: "Team Lead" },
  { trigger: "Machine not reviewed by 17:00", channel: "In-app", recipients: "Analyst, Team Lead" },
  { trigger: "Customer action overdue", channel: "Email", recipients: "Team Lead" },
  { trigger: "Report due / generated", channel: "Email", recipients: "Team Lead" },
  { trigger: "Sensor offline or invalid data", channel: "In-app", recipients: "Analyst" },
];

function AdministrationPage() {
  return (
    <AppShell crumbs={[{ label: "Administration" }]}>
      <PageHeader title="Administration" subtitle="Masters, role permissions, limits and notification configuration" />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Panel className="p-3">
          <div className="label-caps">Users</div>
          <div className="num mt-1 text-2xl font-semibold">{engineers.length}</div>
        </Panel>
        <Panel className="p-3">
          <div className="label-caps">Customers</div>
          <div className="num mt-1 text-2xl font-semibold">{customers.length}</div>
        </Panel>
        <Panel className="p-3">
          <div className="label-caps">Sites</div>
          <div className="num mt-1 text-2xl font-semibold">{sites.length}</div>
        </Panel>
        <Panel className="p-3">
          <div className="label-caps">Machines configured</div>
          <div className="num mt-1 text-2xl font-semibold">{machines.length}</div>
        </Panel>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-5">
        <Panel title="User Role Matrix" className="lg:col-span-3">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr>
                  <Th>Capability</Th>
                  <Th align="right">Administrator</Th>
                  <Th align="right">Analyst</Th>
                  <Th align="right">Manager</Th>
                </tr>
              </thead>
              <tbody>
                {ROLE_MATRIX.map((r) => (
                  <Tr key={r.capability}>
                    <Td className="text-xs">{r.capability}</Td>
                    <Td align="right" className={r.admin ? "text-sev-low" : "text-mute"}>
                      {r.admin ? "Yes" : "—"}
                    </Td>
                    <Td align="right" className={r.analyst ? "text-sev-low" : "text-mute"}>
                      {r.analyst ? "Yes" : "—"}
                    </Td>
                    <Td align="right" className={r.manager ? "text-sev-low" : "text-mute"}>
                      {r.manager ? "Yes" : "—"}
                    </Td>
                  </Tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>

        <div className="grid gap-4 lg:col-span-2">
          <Panel title="Users">
            <ul className="divide-y divide-line/60">
              {engineers.map((e) => (
                <li key={e.id} className="flex items-center gap-3 px-4 py-2.5 text-xs">
                  <span className="grid size-7 place-items-center rounded-full bg-base text-[10px] font-semibold text-mute ring-1 ring-line">{e.initials}</span>
                  <span className="font-medium">{e.name}</span>
                  <span className="ml-auto capitalize text-mute">{e.role}</span>
                </li>
              ))}
            </ul>
          </Panel>

          <Panel title="Data Quality Rules">
            <div className="px-4 py-2">
              <SpecRow label="No data received" value="> 4 h since last sample" />
              <SpecRow label="Sensor offline" value="No communication response" />
              <SpecRow label="Constant value" value="Zero variance across 10 samples" />
              <SpecRow label="Invalid RPM" value="Outside 60–120% of rated" />
              <SpecRow label="Saturated signal" value="Amplitude clipped at range limit" />
              <SpecRow label="Machine alarm" value="Suppressed while data invalid" />
            </div>
          </Panel>
        </div>
      </div>

      <Panel title="Notification Configuration" className="mt-4">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr>
                <Th>Trigger</Th>
                <Th>Channel</Th>
                <Th align="right">Recipients</Th>
              </tr>
            </thead>
            <tbody>
              {NOTIFICATIONS.map((n) => (
                <Tr key={n.trigger}>
                  <Td className="text-xs">{n.trigger}</Td>
                  <Td className="text-xs text-mute">{n.channel}</Td>
                  <Td align="right" className="text-xs text-mute">
                    {n.recipients}
                  </Td>
                </Tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex flex-wrap gap-2 border-t border-line/60 p-4">
          <Button>Edit alarm limits</Button>
          <Button>Configure report templates</Button>
          <Button>Manage measurement points</Button>
        </div>
      </Panel>
    </AppShell>
  );
}
