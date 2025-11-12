import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "../../lib/supabase-server";

export default async function AppPage() {
  // Ottieni l'utente corrente
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/signin");
  }

  // Ottieni le RAG dell'utente dal database
  const { data: ragInstances, error } = await supabase
    .from("rags")
    .select("id, name, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching RAGs:", error);
    redirect("/app/new");
  }

  // Se non ci sono RAG, redirect per crearne una nuova
  if (!ragInstances || ragInstances.length === 0) {
    redirect("/app/new");
  }

  // Se ci sono RAG, redirect alla prima (più recente)
  redirect(`/app/${ragInstances[0].id}/config`);
}
