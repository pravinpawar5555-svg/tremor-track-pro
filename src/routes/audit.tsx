import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/console/AppShell";
import { PageHeader, Panel, Td, Th, Tr } from "@/components/console/ui";
import { auditLog, engineerById } from "@/lib/data";

export const Route = createFileRoute("/audit")({
  head: () => ({
    meta: [
      { title: "Audit Trail · Vibration Operations" },
      {
        name: "description",
        content: "Immutable record of condition changes, alerts raised, report approvals and action updates across the vibration monitoring platform.",
      },
      { property: "og:title", content: "Audit Trail · Vibration Operations" },
      { property: "og:description", content: "Who changed what, when, and from which value to which value." },
    ],
  }),
  component: AuditPage,
});

function AuditPage() {
  return (
    <AppShell crumbs={[{ label: "Administration" }, { label: "Audit trail" }]}>
      <PageHeader title="Audit Trail" subtitle="Read-only record — not editable by analysts or managers" />

      <Panel title="Recent activity" meta={`${auditLog.length} entries`}>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr>
                <Th>Entry</Th>
                <Th>Date / time</Th>
                <Th>User</Th>
                <Th>Action</Th>
                <Th>Entity</Th>
                <Th>Previous value</Th>
                <Th align="right">New value</Th>
              </tr>
            </thead>
            <tbody className="num">
              {auditLog.map((a) => (
                <Tr key={a.id}>
                  <Td className="text-xs">{a.id}</Td>
                  <Td className="text-xs">{a.at}</Td>
                  <Td className="font-sans text-xs">{engineerById(a.userId).name}</Td>
                  <Td className="font-sans text-xs font-medium">{a.action}</Td>
                  <Td className="font-sans text-xs">{a.entity}</Td>
                  <Td className="text-xs text-mute">{a.previousValue}</Td>
                  <Td align="right" className="text-xs">
                    {a.newValue}
                  </Td>
                </Tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </AppShell>
  );
}
