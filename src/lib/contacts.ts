import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { useData } from "@/lib/store";

export type CustomerContact = Database["public"]["Tables"]["customer_contacts"]["Row"];
export type ContactInput = Database["public"]["Tables"]["customer_contacts"]["Insert"];
export function useContacts() {
  const { currentUserId } = useData();
  const queryClient = useQueryClient();
  const key = ["customer-contacts", currentUserId];
  const query = useQuery({ queryKey: key, enabled: !!currentUserId, queryFn: async () => {
    const { data, error } = await supabase.from("customer_contacts").select("*").order("name");
    if (error) throw new Error(error.message);
    return data;
  } });
  const save = async (input: ContactInput) => {
    const { data, error } = await supabase.from("customer_contacts").upsert(input).select().single();
    if (error) throw new Error(error.message);
    await queryClient.invalidateQueries({ queryKey: key });
    return data;
  };
  const importContacts = async (inputs: ContactInput[]) => {
    if (!currentUserId) throw new Error("Sign in before importing contacts.");
    if (!inputs.length) return;
    // One insert statement: all selected records commit together, with existing RLS.
    const { error } = await supabase.from("customer_contacts").insert(inputs.map(input => ({ ...input, created_by: currentUserId })));
    if (error) throw new Error(error.message);
    await queryClient.invalidateQueries({ queryKey: key });
  };
  return { contacts: query.data ?? [], loading: query.isPending, error: query.error, retry: query.refetch, save, importContacts };
}