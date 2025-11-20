"use client";

import { useState } from "react";
import { Database, Sparkles, Zap, Globe, Code2, RefreshCw, CheckCircle, Clock, Rocket, StickyNote, Workflow } from "lucide-react";
import { SiPostgresql, SiSupabase, SiOpenai, SiVercel, SiDiscord } from "react-icons/si";

type FeatureStatus = "live" | "in-progress" | "planned";
type FeatureCategory = "database" | "ai" | "integrations" | "platform";

interface Feature {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
  status: FeatureStatus;
  category: FeatureCategory;
  providers?: {
    name: string;
    icon: React.ElementType;
    available: boolean;
  }[];
}

const features: Feature[] = [
  // Database
  {
    id: "postgresql",
    title: "PostgreSQL + pgvector",
    description: "Native vector search with PostgreSQL",
    icon: SiPostgresql,
    status: "live",
    category: "database",
    providers: [
      { name: "PostgreSQL", icon: SiPostgresql, available: true },
      { name: "Supabase", icon: SiSupabase, available: true }
    ]
  },
  {
    id: "vector-dbs",
    title: "Cloud Vector Databases",
    description: "Pinecone, Qdrant, Weaviate, Milvus",
    icon: Database,
    status: "in-progress",
    category: "database",
    providers: [
      { name: "Pinecone", icon: Zap, available: false },
      { name: "Qdrant", icon: Database, available: false },
      { name: "Weaviate", icon: Globe, available: false }
    ]
  },

  // AI
  {
    id: "openai",
    title: "OpenAI Embeddings",
    description: "text-embedding-3-small/large, ada-002",
    icon: SiOpenai,
    status: "live",
    category: "ai",
    providers: [
      { name: "OpenAI", icon: SiOpenai, available: true }
    ]
  },
  {
    id: "multi-provider-ai",
    title: "Multi-Provider AI",
    description: "Anthropic, Cohere, HuggingFace, local models",
    icon: Sparkles,
    status: "in-progress",
    category: "ai",
    providers: [
      { name: "Anthropic", icon: Sparkles, available: false },
      { name: "Cohere", icon: Sparkles, available: false },
      { name: "Local", icon: Sparkles, available: false }
    ]
  },

  // Integrations
  {
    id: "current-sources",
    title: "Content Sources",
    description: "Text, Website, Documents, Q&A",
    icon: Globe,
    status: "live",
    category: "integrations"
  },
  {
    id: "notion",
    title: "Notion Integration",
    description: "Import directly from Notion workspaces",
    icon: StickyNote,
    status: "planned",
    category: "integrations"
  },
  {
    id: "remote-api",
    title: "Remote Source API",
    description: "Load sources via API from anywhere",
    icon: Code2,
    status: "planned",
    category: "integrations"
  },
  {
    id: "sync",
    title: "Recurring Sync",
    description: "Auto-update sources on schedule",
    icon: RefreshCw,
    status: "planned",
    category: "integrations"
  },

  // Platform
  {
    id: "vercel",
    title: "Built on Vercel",
    description: "Fast, scalable, global edge network",
    icon: SiVercel,
    status: "live",
    category: "platform"
  },
  {
    id: "performance",
    title: "Performance & UX",
    description: "Continuous speed and usability improvements",
    icon: Zap,
    status: "in-progress",
    category: "platform"
  }
];

const categories = [
  { id: "all", label: "All", icon: Rocket },
  { id: "database", label: "Databases", icon: Database },
  { id: "ai", label: "AI & Embeddings", icon: Sparkles },
  { id: "integrations", label: "Integrations", icon: Workflow },
  { id: "platform", label: "Platform", icon: Zap }
];

const statusConfig = {
  live: {
    label: "Live",
    color: "bg-green-500",
    textColor: "text-green-700",
    bgColor: "bg-green-50",
    borderColor: "border-green-200",
    icon: CheckCircle
  },
  "in-progress": {
    label: "In Progress",
    color: "bg-blue-500",
    textColor: "text-blue-700",
    bgColor: "bg-blue-50",
    borderColor: "border-blue-200",
    icon: Rocket
  },
  planned: {
    label: "Planned",
    color: "bg-gray-400",
    textColor: "text-gray-700",
    bgColor: "bg-gray-50",
    borderColor: "border-gray-200",
    icon: Clock
  }
};

export default function RoadmapSection() {
  const [activeCategory, setActiveCategory] = useState<string>("all");

  const filteredFeatures = activeCategory === "all" 
    ? features 
    : features.filter(f => f.category === activeCategory);

  const liveCount = features.filter(f => f.status === "live").length;
  const inProgressCount = features.filter(f => f.status === "in-progress").length;
  const plannedCount = features.filter(f => f.status === "planned").length;

  return (
    <div className="relative">
      {/* Header */}
      <div className="text-center mb-6 sm:mb-8">
        <div className="inline-flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1 sm:py-1.5 bg-purple-100 text-purple-700 rounded-full text-[10px] sm:text-xs font-medium mb-3 sm:mb-4">
          <Rocket className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
          We're building this for you
        </div>
        <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2 sm:mb-3 px-2">
          Always improving. Always listening.
        </h2>
        <p className="text-sm sm:text-base md:text-lg text-gray-700 max-w-2xl mx-auto mb-4 sm:mb-6 px-2">
          We know what you need. Here's what we have today and what's coming next.
        </p>

        {/* Stats */}
        <div className="flex items-center justify-center gap-3 sm:gap-4 md:gap-6 text-xs sm:text-sm px-2">
          <div className="flex items-center gap-1.5 sm:gap-2">
            <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-green-500"></div>
            <span className="text-gray-700"><strong className="text-gray-900">{liveCount}</strong> Live</span>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2">
            <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-blue-500"></div>
            <span className="text-gray-700"><strong className="text-gray-900">{inProgressCount}</strong> In Progress</span>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2">
            <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-gray-400"></div>
            <span className="text-gray-700"><strong className="text-gray-900">{plannedCount}</strong> Planned</span>
          </div>
        </div>
      </div>

      {/* Category Filter */}
      <div className="flex items-center justify-center gap-1.5 sm:gap-2 mb-6 sm:mb-8 flex-wrap px-2">
        {categories.map((cat) => {
          const Icon = cat.icon;
          const isActive = activeCategory === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`inline-flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-all ${
                isActive
                  ? 'bg-gray-900 text-white shadow-lg'
                  : 'bg-white text-gray-700 border border-gray-200 hover:border-gray-300 hover:shadow-sm'
              }`}
            >
              <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              {cat.label}
            </button>
          );
        })}
      </div>

      {/* Features Grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        {filteredFeatures.map((feature) => {
          const Icon = feature.icon;
          const status = statusConfig[feature.status];
          const StatusIcon = status.icon;

          return (
            <div
              key={feature.id}
              className={`group relative bg-white border rounded-lg sm:rounded-xl p-3 sm:p-4 md:p-5 transition-all hover:shadow-lg ${
                feature.status === "live" 
                  ? "border-gray-200 hover:border-gray-300" 
                  : "border-gray-200 hover:border-gray-300"
              }`}
            >
              {/* Status Badge */}
              <div className="absolute top-2 right-2 sm:top-3 sm:right-3 md:top-4 md:right-4">
                <div className={`inline-flex items-center gap-1 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-medium ${status.bgColor} ${status.textColor} border ${status.borderColor}`}>
                  <StatusIcon className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                  <span className="hidden sm:inline">{status.label}</span>
                </div>
              </div>

              {/* Icon */}
              <div className={`w-8 h-8 sm:w-9 sm:h-9 md:w-10 md:h-10 rounded-lg flex items-center justify-center mb-3 sm:mb-4 ${
                feature.status === "live" 
                  ? "bg-gray-900" 
                  : feature.status === "in-progress"
                  ? "bg-blue-100"
                  : "bg-gray-100"
              }`}>
                <Icon className={`w-4 h-4 sm:w-4.5 sm:h-4.5 md:w-5 md:h-5 ${
                  feature.status === "live" 
                    ? "text-white" 
                    : feature.status === "in-progress"
                    ? "text-blue-600"
                    : "text-gray-400"
                }`} />
              </div>

              {/* Content */}
              <h3 className="text-xs sm:text-sm font-semibold text-gray-900 mb-1 sm:mb-1.5 pr-16 sm:pr-20 md:pr-24">
                {feature.title}
              </h3>
              <p className="text-[11px] sm:text-xs text-gray-600 leading-relaxed mb-3 sm:mb-4">
                {feature.description}
              </p>

              {/* Providers */}
              {feature.providers && feature.providers.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                  {feature.providers.map((provider, idx) => {
                    const ProviderIcon = provider.icon;
                    return (
                      <div
                        key={idx}
                        className={`inline-flex items-center gap-1 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded border text-[10px] sm:text-xs ${
                          provider.available
                            ? "bg-green-50 text-green-700 border-green-200"
                            : "bg-gray-50 text-gray-500 border-gray-200"
                        }`}
                      >
                        <ProviderIcon className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                        <span className="font-medium">{provider.name}</span>
                        {provider.available && (
                          <CheckCircle className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Bottom Message */}
      <div className="mt-8 sm:mt-10 md:mt-12 text-center px-2">
        <div className="inline-block bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-lg sm:rounded-xl p-4 sm:p-5 md:p-6 max-w-2xl w-full">
          <p className="text-xs sm:text-sm text-gray-700 leading-relaxed mb-3 sm:mb-4">
            <strong className="text-gray-900">Got a feature request?</strong> We're constantly evolving based on user feedback. 
            Your needs drive our roadmap. Let us know what you'd like to see next.
          </p>
          <a
            href="https://discord.gg/2UY3dXtg"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 sm:gap-2 px-4 sm:px-5 py-2 sm:py-2.5 bg-[#5865F2] hover:bg-[#4752C4] text-white rounded-lg font-semibold text-xs sm:text-sm transition-all shadow-md hover:shadow-lg"
          >
            <SiDiscord className="w-4 h-4 sm:w-5 sm:h-5" />
            <span>Join our Discord Community</span>
          </a>
        </div>
      </div>
    </div>
  );
}

