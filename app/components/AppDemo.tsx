"use client";

import { useState } from "react";
import { Settings, FileText, Globe, FileStack, MessageSquare, StickyNote, ChevronDown, ChevronRight, User, LogOut, CheckCircle2, Database, Plus } from "lucide-react";
import PendingChanges from "./PendingChanges";

type DemoView = "config" | "text" | "website" | "docs" | "qa" | "notion" | "profile";

export default function AppDemo() {
  const [activeView, setActiveView] = useState<DemoView>("config");
  const [sourcesOpen, setSourcesOpen] = useState(true);

  const renderContent = () => {
    switch (activeView) {
      case "config":
        return (
          <div className="space-y-4">
            <div className="flex items-center gap-3 mb-4">
              <h2 className="text-base font-semibold text-gray-900">Configuration</h2>
              <div className="flex items-center gap-1.5 px-2 py-0.5 bg-green-50 border border-green-200 rounded text-xs">
                <CheckCircle2 className="w-3 h-3 text-green-600" />
                <span className="text-green-700 font-medium">Complete</span>
              </div>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-gray-600 mb-1">Connection String</label>
                <div className="h-7 bg-gray-100 rounded border border-gray-200"></div>
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">API Key</label>
                <div className="h-7 bg-gray-100 rounded border border-gray-200"></div>
              </div>
            </div>
          </div>
        );
      case "text":
        return (
          <div className="space-y-3">
            <h2 className="text-base font-semibold text-gray-900 mb-3">Text Source</h2>
            <div>
              <label className="block text-xs text-gray-600 mb-1">Title</label>
              <div className="h-7 bg-gray-100 rounded border border-gray-200"></div>
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">Content</label>
              <div className="h-20 bg-gray-100 rounded border border-gray-200"></div>
            </div>
            <button className="px-3 py-1.5 bg-black text-white text-xs rounded hover:bg-gray-800">
              Add to RAG
            </button>
          </div>
        );
      case "website":
        return (
          <div className="space-y-3">
            <h2 className="text-base font-semibold text-gray-900 mb-3">Website Source</h2>
            <div>
              <label className="block text-xs text-gray-600 mb-1">URL</label>
              <div className="h-7 bg-gray-100 rounded border border-gray-200"></div>
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">Crawl Depth</label>
              <div className="h-7 bg-gray-100 rounded border border-gray-200 w-32"></div>
            </div>
            <button className="px-3 py-1.5 bg-black text-white text-xs rounded hover:bg-gray-800">
              Start Crawling
            </button>
          </div>
        );
      case "docs":
        return (
          <div className="space-y-3">
            <h2 className="text-base font-semibold text-gray-900 mb-3">Documents Source</h2>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
              <div className="text-gray-400 text-xs">Upload documents (PDF, DOCX, TXT)</div>
            </div>
            <button className="px-3 py-1.5 bg-black text-white text-xs rounded hover:bg-gray-800">
              Process Documents
            </button>
          </div>
        );
      case "qa":
        return (
          <div className="space-y-3">
            <h2 className="text-base font-semibold text-gray-900 mb-3">Q&A Source</h2>
            <div className="border border-gray-200 rounded-lg p-3 space-y-2">
              <div>
                <label className="block text-xs text-gray-600 mb-1">Question</label>
                <div className="h-6 bg-gray-100 rounded border border-gray-200"></div>
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">Answer</label>
                <div className="h-12 bg-gray-100 rounded border border-gray-200"></div>
              </div>
            </div>
            <button className="px-3 py-1.5 bg-black text-white text-xs rounded hover:bg-gray-800">
              Save Q&A Pairs
            </button>
          </div>
        );
      case "notion":
        return (
          <div className="space-y-3">
            <h2 className="text-base font-semibold text-gray-900 mb-3">Notion Source</h2>
            <div>
              <label className="block text-xs text-gray-600 mb-1">Integration Token</label>
              <div className="h-7 bg-gray-100 rounded border border-gray-200"></div>
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">Database URL</label>
              <div className="h-7 bg-gray-100 rounded border border-gray-200"></div>
            </div>
            <button className="px-3 py-1.5 bg-black text-white text-xs rounded hover:bg-gray-800">
              Connect Notion
            </button>
          </div>
        );
      case "profile":
        return (
          <div className="space-y-4">
            <h2 className="text-base font-semibold text-gray-900 mb-3">Profile</h2>
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-gray-600 mb-1">Name</label>
                <div className="h-7 bg-gray-100 rounded border border-gray-200"></div>
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">Email</label>
                <div className="h-7 bg-gray-100 rounded border border-gray-200"></div>
              </div>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden shadow-lg bg-white relative">
      <div className="flex" style={{ height: "400px" }}>
        {/* Sidebar */}
        <div className="w-48 bg-gray-50 border-r border-gray-200 flex flex-col p-2">
          {/* RAG Selector */}
          <div className="mb-3">
            <select className="w-full px-2 py-1 text-xs text-gray-700 bg-white border border-gray-300 rounded">
              <option>Demo RAG</option>
            </select>
            <button className="mt-1 w-full flex items-center justify-center gap-1 px-2 py-1 text-xs text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50">
              <Plus className="w-3 h-3" />
              <span>new</span>
            </button>
          </div>

          {/* Nav */}
          <div className="flex-1 space-y-0.5">
            <button
              onClick={() => setActiveView("config")}
              className={`flex items-center gap-2 px-2 py-1 rounded text-xs w-full transition-colors ${
                activeView === "config" ? "bg-gray-200 text-gray-900" : "text-gray-700 hover:bg-gray-100"
              }`}
            >
              <Settings className="w-3 h-3" />
              <span className="flex-1 text-left">Config</span>
              <CheckCircle2 className="w-3 h-3 text-green-600" />
            </button>

            {/* Sources */}
            <div>
              <button
                onClick={() => setSourcesOpen(!sourcesOpen)}
                className="flex items-center gap-2 px-2 py-1 rounded text-xs w-full text-gray-700 hover:bg-gray-100"
              >
                {sourcesOpen ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                <span>Sources</span>
              </button>
              {sourcesOpen && (
                <div className="ml-3 mt-0.5 space-y-0.5">
                  {[
                    { icon: FileText, label: "Text", view: "text" as DemoView },
                    { icon: Globe, label: "Website", view: "website" as DemoView },
                    { icon: FileStack, label: "Docs", view: "docs" as DemoView },
                    { icon: MessageSquare, label: "Q&A", view: "qa" as DemoView },
                    { icon: StickyNote, label: "Notion", view: "notion" as DemoView },
                  ].map((item) => {
                    const Icon = item.icon;
                    return (
                      <button
                        key={item.view}
                        onClick={() => setActiveView(item.view)}
                        className={`flex items-center gap-2 px-2 py-1 rounded text-xs w-full transition-colors ${
                          activeView === item.view ? "bg-gray-200 text-gray-900" : "text-gray-700 hover:bg-gray-100"
                        }`}
                      >
                        <Icon className="w-3 h-3" />
                        <span>{item.label}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Bottom */}
          <div className="border-t border-gray-200 pt-2 space-y-0.5">
            <button
              onClick={() => setActiveView("profile")}
              className={`flex items-center gap-2 px-2 py-1 rounded text-xs w-full transition-colors ${
                activeView === "profile" ? "bg-gray-200 text-gray-900" : "text-gray-700 hover:bg-gray-100"
              }`}
            >
              <User className="w-3 h-3" />
              <span>Profile</span>
            </button>
            <button className="flex items-center gap-2 px-2 py-1 rounded text-xs w-full text-gray-700 hover:bg-gray-100">
              <LogOut className="w-3 h-3" />
              <span>Logout</span>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 p-4 overflow-y-auto bg-white">
          {renderContent()}
        </div>
      </div>
      
      {/* Show PendingChanges only on source pages */}
      {["text", "website", "docs", "qa", "notion"].includes(activeView) && (
        <div className="absolute top-4 right-4 w-80 scale-75 origin-top-right">
          <PendingChanges />
        </div>
      )}
    </div>
  );
}

