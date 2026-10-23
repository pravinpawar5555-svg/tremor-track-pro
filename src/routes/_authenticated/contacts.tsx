import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/console/AppShell";
import { CustomerContacts } from "@/components/console/CustomerContacts";

export const Route = createFileRoute("/_authenticated/contacts")({
  validateSearch: (search: Record<string, unknown>) => ({ plant: typeof search.plant === "string" ? search.plant : undefined }),
  head: () => ({ meta: [
    { title: "Customer Phonebook — Forbes Marshall CM Portal" },
    { name: "description", content: "Plant customer contacts organized by area, department and position with phone and email details." },
    { property: "og:title", content: "Customer Phonebook — Forbes Marshall CM Portal" },
    { property: "og:description", content: "Find customer contacts across plants, areas and departments." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
  ] }),
  component: ContactsPage,
});
function ContactsPage() { const { plant } = Route.useSearch(); return <AppShell><CustomerContacts key={plant ?? "all"} plantId={plant} /></AppShell>; }