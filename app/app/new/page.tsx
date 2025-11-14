"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase";

export default function NewRagPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [userId, setUserId] = useState<string | null>(null);

  // Ottieni l'utente corrente
  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
      }
      // Se non c'è utente, il middleware gestirà il redirect
      // Non facciamo redirect qui per evitare loop
    };
    getUser();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) return;

    setLoading(true);
    setError("");

    try {
      // Crea una nuova RAG nel database
      const { data, error: insertError } = await supabase
        .from("rags")
        .insert({
          name: name.trim(),
          user_id: userId,
          config: {
            // Configurazione di default della UI
            provider: "openai",
            apiKey: "",
            embeddingModel: "text-embedding-3-small",
            embeddingDimensions: 1536,
            vectorDb: "postgresql",
            connectionString: "",
            tableName: "gimme_rag_documents",
          },
          pending_changes: null,
        })
        .select()
        .single();

      if (insertError) throw insertError;

      // Redirect alla pagina di configurazione della nuova RAG
      // Usiamo window.location.href per assicurarci che i cookie siano inclusi nella richiesta
      window.location.href = `/app/${data.id}/config`;
    } catch (err: any) {
      console.error("Error creating RAG:", err);
      setError(err.message || "Failed to create RAG");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header */}
      <div className="border-b border-gray-200 px-6 py-4">
        <Link
          href="/app"
          className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </Link>
      </div>

      {/* Content */}
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">
          <h1 className="text-2xl font-semibold text-gray-900 mb-2">
            Create a New RAG
          </h1>
          <p className="text-sm text-gray-600 mb-8">
            Create a new RAG instance to manage your content sources. Each RAG can have
            its own configuration, vector database connection, and content sources.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-md p-3">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                RAG Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value.slice(0, 80))}
                placeholder="e.g., Customer Support Knowledge Base"
                maxLength={80}
                required
                disabled={loading}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-700 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
              />
              <p className="text-xs text-gray-500 mt-1.5">
                {name.length}/80 characters
              </p>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="submit"
                disabled={!name.trim() || loading}
                className="px-4 py-2 bg-black text-white text-sm rounded-md hover:bg-gray-800 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                {loading ? "Creating..." : "Create RAG"}
              </button>
              <Link
                href="/app"
                className="px-4 py-2 border border-gray-300 text-sm rounded-md hover:bg-gray-50 transition-colors"
              >
                Cancel
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

