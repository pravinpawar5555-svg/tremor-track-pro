import { describe, expect, it } from "vitest";
import { pushRecipients, shouldReconnectPush, type PushPerson } from "../push-rules";

const people: PushPerson[] = [
  { id: "manager", personIds: ["mgr-1"], domain: "manager", approved: true, view: "all" },
  { id: "cs", personIds: ["eng-1"], domain: "customer_success", approved: true, view: "own" },
  { id: "exec", personIds: ["exec-1"], domain: "execution", approved: true, view: "own" },
  { id: "pending", personIds: ["pending"], domain: "none", approved: false, view: "own" },
];
describe("device notifications", () => {
  it("reconnects automatically only after permission is granted", () => {
    expect(shouldReconnectPush("granted", false)).toBe(true);
    expect(shouldReconnectPush("default", false)).toBe(false);
    expect(shouldReconnectPush("denied", false)).toBe(false);
  });
  it("respects turning this device off", () => expect(shouldReconnectPush("granted", true)).toBe(false));
  it("shared plant messages reach all approved readers except the sender", () => expect(pushRecipients(people, "manager", [], true)).toEqual(["cs", "exec"]));
  it("ticket messages reach only named participants, not other engineers", () => expect(pushRecipients(people, "manager", ["eng-1"])).toEqual(["cs"]));
  it("denied readers do not receive message content", () => expect(pushRecipients(people.map((p) => ({ ...p, view: "none" })), "manager", [], true)).toEqual([]));
});