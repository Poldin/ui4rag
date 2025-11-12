"use client";

import Link from "next/link";
import { usePathname, useParams, useRouter } from "next/navigation";
import { Settings, FileText, Globe, FileStack, MessageSquare, StickyNote, ChevronDown, ChevronRight, User, LogOut, CheckCircle2, AlertCircle, Search, BarChart3 } from "lucide-react";
import { SiSupabase, SiPostgresql, SiPlanetscale, SiCockroachlabs } from "react-icons/si";
import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";

// Database/Provider icons configuration
const dbIcons = [
  { Icon: SiSupabase, color: "#3ECF8E", name: "Supabase" },
  { Icon: SiPostgresql, color: "#336791", name: "PostgreSQL" },
  { Icon: SiPlanetscale, color: "#000000", name: "PlanetScale" },
  { Icon: SiCockroachlabs, color: "#6933FF", name: "CockroachDB" },
];

const sourceItems = [
  { name: "Text", icon: FileText, path: "text" },
  { name: "Website", icon: Globe, path: "website" },
  { name: "Docs", icon: FileStack, path: "docs" },
  { name: "Q&A", icon: MessageSquare, path: "qa" },
  { name: "Notion", icon: StickyNote, path: "notion" },
];

interface RagInstance {
  id: string;
  name: string;
  config: any;
}

export default function Sidebar() {
  const pathname = usePathname();
  const params = useParams();
  const router = useRouter();
  const ragId = params.id as string;
  
  const [isSourcesOpen, setIsSourcesOpen] = useState(true);
  const [ragInstances, setRagInstances] = useState<RagInstance[]>([]);
  const [isConfigComplete, setIsConfigComplete] = useState(false);
  const [loading, setLoading] = useState(true);
  const [currentIconIndex, setCurrentIconIndex] = useState(0);

  // Carica le RAG dell'utente dal database
  useEffect(() => {
    const fetchRags = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        // Se non c'è utente, il middleware gestirà il redirect
        // Non facciamo redirect qui per evitare loop
        if (!user) {
          setLoading(false);
          return;
        }

        const { data, error } = await supabase
          .from("rags")
          .select("id, name, config")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false });

        if (error) throw error;

        setRagInstances(data || []);

        // Controlla se la config della RAG corrente è completa
        const currentRag = data?.find((rag) => rag.id === ragId);
        if (currentRag?.config) {
          const config = currentRag.config as any;
          // Controlla che i campi essenziali siano compilati
          setIsConfigComplete(
            !!config.connectionString &&
            !!config.apiKey &&
            !!config.embeddingModel &&
            !!config.tableName
          );
        } else {
          setIsConfigComplete(false);
        }
      } catch (error) {
        console.error("Error fetching RAGs:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchRags();

    // Sottoscrivi ai cambiamenti nella tabella rags
    const channel = supabase
      .channel('rags_changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'rags',
          filter: `id=eq.${ragId}`,
        },
        (payload) => {
          // Quando la RAG viene aggiornata, ricarica i dati
          fetchRags();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [ragId]);

  // Cicla tra le icone database/provider ogni 5 secondi
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIconIndex(prev => (prev + 1) % dbIcons.length);
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  return (
    <aside className="w-60 h-screen bg-gray-50 border-r border-gray-200 flex flex-col">
      {/* RAG Selector */}
      <div className="px-3 py-3 border-b border-gray-200">
        {loading ? (
          <div className="w-full px-2 py-1.5 text-sm text-gray-400">
            Loading...
          </div>
        ) : (
          <select
            value={ragId}
            onChange={(e) => {
              if (e.target.value === "new") {
                window.location.href = "/app/new";
              } else {
                window.location.href = `/app/${e.target.value}/config`;
              }
            }}
            className="w-full px-2 py-1.5 text-sm text-gray-700 bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            {ragInstances.map((rag) => (
              <option key={rag.id} value={rag.id}>
                {rag.name}
              </option>
            ))}
            <option value="new">+ new</option>
          </select>
        )}
      </div>

      {/* Main navigation */}
      <nav className="flex-1 px-3 py-4">
        {/* Config */}
        <Link
          href={`/app/${ragId}/config`}
          className={`flex items-center gap-2 px-2 py-1.5 rounded-md text-sm transition-colors ${
            pathname === `/app/${ragId}/config`
              ? "bg-gray-200 text-gray-900"
              : "text-gray-700 hover:bg-gray-100"
          }`}
        >
          <Settings className="w-4 h-4" />
          <span className="flex-1">Config</span>
          {isConfigComplete ? (
            <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />
          ) : (
            <AlertCircle className="w-3.5 h-3.5 text-gray-400" />
          )}
        </Link>

        {/* Testing */}
        <Link
          href={`/app/${ragId}/testing`}
          className={`flex items-center gap-2 px-2 py-1.5 rounded-md text-sm transition-colors ${
            pathname === `/app/${ragId}/testing`
              ? "bg-gray-200 text-gray-900"
              : "text-gray-700 hover:bg-gray-100"
          }`}
        >
          <Search className="w-4 h-4" />
          <span>Testing</span>
        </Link>

        {/* Trainings */}
        <Link
          href={`/app/${ragId}/trainings`}
          className={`flex items-center gap-2 px-2 py-1.5 rounded-md text-sm transition-colors ${
            pathname === `/app/${ragId}/trainings`
              ? "bg-gray-200 text-gray-900"
              : "text-gray-700 hover:bg-gray-100"
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          <span>Trainings</span>
        </Link>

        {/* Sources accordion */}
        <div className="mt-1">
          <button
            onClick={() => setIsSourcesOpen(!isSourcesOpen)}
            className="flex items-center gap-2 px-2 py-1.5 rounded-md text-sm w-full text-gray-700 hover:bg-gray-100 transition-colors"
          >
            {isSourcesOpen ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronRight className="w-4 h-4" />
            )}
            <span>Sources</span>
          </button>

          {isSourcesOpen && (
            <div className="ml-4 mt-1 space-y-0.5">
              {/* Manage - Special item */}
              <Link
                href={`/app/${ragId}/sources/manage`}
                className={`flex items-center gap-2 px-2 py-1.5 rounded-md text-sm transition-all ${
                  pathname === `/app/${ragId}/sources/manage`
                    ? "bg-gradient-to-r from-gray-200 to-gray-100 text-gray-900 font-medium"
                    : "text-gray-700 hover:bg-gray-100"
                }`}
              >
                <div className="relative w-4 h-4">
                  {dbIcons.map((iconConfig, index) => {
                    const IconComponent = iconConfig.Icon;
                    return (
                      <div
                        key={iconConfig.name}
                        className={`absolute inset-0 transition-opacity duration-500 ${
                          currentIconIndex === index ? 'opacity-100' : 'opacity-0'
                        }`}
                      >
                        <IconComponent className="w-4 h-4" style={{ color: iconConfig.color }} />
                      </div>
                    );
                  })}
                </div>
                <span className="flex-1">Manage</span>
              </Link>

              {/* Separator */}
              <div className="h-px bg-gray-200 my-1"></div>

              {/* Regular source items */}
              {sourceItems.map((item) => {
                const Icon = item.icon;
                const itemPath = `/app/${ragId}/sources/${item.path}`;
                const isNotion = item.path === "notion";
                return (
                  <Link
                    key={item.path}
                    href={itemPath}
                    className={`flex items-center gap-2 px-2 py-1.5 rounded-md text-sm transition-colors ${
                      pathname === itemPath
                        ? "bg-gray-200 text-gray-900"
                        : "text-gray-700 hover:bg-gray-100"
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="flex-1">{item.name}</span>
                    {isNotion && (
                      <span className="text-xs text-gray-500">coming soon</span>
                    )}
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </nav>

      {/* Bottom actions */}
      <div className="border-t border-gray-200 p-3 space-y-0.5">
        <Link
          href={`/app/${ragId}/profile`}
          className={`flex items-center gap-2 px-2 py-1.5 rounded-md text-sm transition-colors ${
            pathname === `/app/${ragId}/profile`
              ? "bg-gray-200 text-gray-900"
              : "text-gray-700 hover:bg-gray-100"
          }`}
        >
          <User className="w-4 h-4" />
          <span>Profile</span>
        </Link>
        <button
          onClick={async () => {
            try {
              await supabase.auth.signOut();
              router.push("/");
            } catch (error) {
              console.error("Error signing out:", error);
            }
          }}
          className="flex items-center gap-2 px-2 py-1.5 rounded-md text-sm w-full text-gray-700 hover:bg-gray-100 transition-colors"
        >
          <LogOut className="w-4 h-4" />
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
}
