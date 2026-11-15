export const VAPID_PUBLIC_KEY = "BDlgMlxE2HlljiT1RwuhP7PuaMxa5buSwd7ElHq6k-BNu4iiOyw9GsQ-Ya6kbz7Xh2yyWdy61mMsj977ktC_ofQ";

export type PushPerson = { id: string; personIds: string[]; domain: string; approved: boolean; view: string };
export function pushRecipients(people: PushPerson[], sender: string, targets: string[], plantChat = false) {
  return people.filter((p) => p.approved && p.id !== sender && p.view !== "none" &&
    (plantChat || targets.some((id) => p.personIds.includes(id)))).map((p) => p.id);
}
export function shouldReconnectPush(permission: string, optedOut: boolean) {
  return permission === "granted" && !optedOut;
}