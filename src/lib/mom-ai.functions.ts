import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const Input = z.object({
  notes: z.string().min(10).max(20000),
  today: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  people: z.array(z.object({ id: z.string(), name: z.string() })).max(100),
});

const MomSchema = z.object({
  purpose: z.string(),
  discussionPoints: z.array(z.string()),
  observations: z.string(),
  actions: z.array(
    z.object({
      action: z.string(),
      responsibleId: z.string().describe("An id from the people list, 'customer', or empty string if unknown"),
      dueDate: z.string().describe("YYYY-MM-DD, or empty string if not stated"),
      remarks: z.string(),
    }),
  ),
});

export type AiMom = z.infer<typeof MomSchema>;

/** Turns rough visit notes into structured MOM fields. Engineer reviews before saving. */
export const generateMomFromNotes = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => Input.parse(d))
  .handler(async ({ data }): Promise<{ ok: true; mom: AiMom } | { ok: false; error: string }> => {
    const apiKey = process.env["LOVABLE_API_KEY"];
    if (!apiKey) return { ok: false, error: "AI is not configured." };
    const { createOpenAI } = await import("@ai-sdk/openai");
    const { streamText, Output } = await import("ai");
    const provider = createOpenAI({
      baseURL: "https://ai.gateway.lovable.dev/v1",
      apiKey,
      headers: { "Lovable-API-Key": apiKey, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
    });
    const people = data.people.map((p) => `${p.id} = ${p.name}`).join("\n");
    try {
      const result = streamText({
        model: provider.responses("openai/gpt-6-astra"),
        instructions:
          "You write formal Minutes of Meeting for Forbes Marshall condition-monitoring customer visits. " +
          "From the engineer's rough notes, extract: a one-line purpose, concise discussion points, customer observations/findings (plain prose), and action items. " +
          `Today is ${data.today}; convert relative dates (e.g. 'next Friday', 'in 2 weeks') to YYYY-MM-DD. ` +
          "For responsibleId use the matching id from this people list, 'customer' for customer-side owners, or '' if unclear:\n" +
          people +
          "\nDo not invent facts not in the notes. Keep the language professional English.",
        messages: [{ role: "user", content: data.notes }],
        output: Output.object({ schema: MomSchema }),
        providerOptions: {
          openai: {
            forceReasoning: true,
            reasoningEffort: "low",
            reasoningSummary: "auto",
            store: false,
            include: ["reasoning.encrypted_content"],
          },
        },
      });
      const mom = (await result.output) as AiMom;
      return { ok: true, mom };
    } catch (e: any) {
      const status = e?.statusCode ?? e?.cause?.statusCode;
      console.error("MOM AI failed", status, e?.message);
      if (status === 429) return { ok: false, error: "AI is busy right now. Please try again in a minute." };
      if (status === 402) return { ok: false, error: "AI credits are used up. Add credits in Settings → Plans & credits." };
      if (status === 403) return { ok: false, error: "AI access is blocked for this workspace." };
      return { ok: false, error: "AI could not structure these notes. Please fill the MOM manually." };
    }
  });
