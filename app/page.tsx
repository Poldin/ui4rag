import Link from "next/link";
import { ArrowRight, Terminal } from "lucide-react";
import { SiSupabase, SiNextdotjs, SiOpenai } from "react-icons/si";
import Header from "./components/Header";
import Footer from "./components/Footer";
import AgentRagDiagram from "./components/AgentRagDiagram";
import SourcesShowcase from "./components/SourcesShowcase";
import SearchCarousel from "./components/SearchCarousel";
import TrainingDemo from "./components/TrainingDemo";
import RoadmapSection from "./components/RoadmapSection";
import MCPToolsDemo from "./components/MCPToolsDemo";

// LangChain Icon Component (parrot + chain logo)
function LangChainIcon({ className }: { className?: string }) {
  return (
    <svg 
      viewBox="0 0 24 24" 
      fill="currentColor" 
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M12 2C10.9 2 10 2.9 10 4V6.17C8.83 6.58 8 7.69 8 9V11.17C6.83 11.58 6 12.69 6 14V16.17C4.83 16.58 4 17.69 4 19C4 20.66 5.34 22 7 22C8.31 22 9.42 21.17 9.83 20H14.17C14.58 21.17 15.69 22 17 22C18.66 22 20 20.66 20 19C20 17.69 19.17 16.58 18 16.17V14C18 12.69 17.17 11.58 16 11.17V9C16 7.69 15.17 6.58 14 6.17V4C14 2.9 13.1 2 12 2ZM12 4C12.55 4 13 4.45 13 5V6C13 6.55 12.55 7 12 7C11.45 7 11 6.55 11 6V5C11 4.45 11.45 4 12 4ZM12 8.5C13.38 8.5 14.5 9.62 14.5 11V13C14.5 14.38 13.38 15.5 12 15.5C10.62 15.5 9.5 14.38 9.5 13V11C9.5 9.62 10.62 8.5 12 8.5ZM7 17.5C7.83 17.5 8.5 18.17 8.5 19C8.5 19.83 7.83 20.5 7 20.5C6.17 20.5 5.5 19.83 5.5 19C5.5 18.17 6.17 17.5 7 17.5ZM17 17.5C17.83 17.5 18.5 18.17 18.5 19C18.5 19.83 17.83 20.5 17 20.5C16.17 20.5 15.5 19.83 15.5 19C15.5 18.17 16.17 17.5 17 17.5Z" />
    </svg>
  );
}

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      <Header />

      {/* Hero Section */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 sm:pt-16 md:pt-20 pb-12 sm:pb-16">
        <div className="text-center max-w-3xl mx-auto">
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-gray-900 mb-4 sm:mb-6">
            Create and manage RAGs.<br className="hidden sm:block" /> <br className="hidden sm:block" />Easy and cheap.
          </h1>
          <p className="text-base sm:text-lg md:text-xl text-gray-700 mb-6 sm:mb-8 px-2">
            Connect your vector database, configure AI embeddings, and manage all your content sources in one beautiful interface.
          </p>
          
          {/* Tech Stack Logos */}
          <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4 md:gap-6 mb-6 sm:mb-8 opacity-70 px-2">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <SiNextdotjs className="w-4 h-4 sm:w-5 sm:h-5 text-gray-700" />
              <span className="text-xs sm:text-sm text-gray-700">Next.js</span>
            </div>
            <div className="flex items-center gap-1.5 sm:gap-2">
              <SiSupabase className="w-4 h-4 sm:w-5 sm:h-5 text-gray-700" />
              <span className="text-xs sm:text-sm text-gray-700">Supabase</span>
            </div>
            <div className="flex items-center gap-1.5 sm:gap-2">
              <SiOpenai className="w-4 h-4 sm:w-5 sm:h-5 text-gray-700" />
              <span className="text-xs sm:text-sm text-gray-700">OpenAI</span>
            </div>
            <div className="flex items-center gap-1.5 sm:gap-2">
              <LangChainIcon className="w-4 h-4 sm:w-5 sm:h-5 text-gray-700" />
              <span className="text-xs sm:text-sm text-gray-700">LangChain</span>
            </div>
            <div className="flex items-center gap-1.5 sm:gap-2">
              <Terminal className="w-4 h-4 sm:w-5 sm:h-5 text-gray-700" />
              <span className="text-xs sm:text-sm text-gray-700">MCP Server</span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center px-2">
            <Link
              href="/signin"
              className="px-5 sm:px-6 py-2.5 sm:py-3 bg-black text-white rounded-lg font-medium hover:bg-gray-800 transition-colors flex items-center justify-center gap-2 text-sm sm:text-base"
            >
              Get started
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>

      {/* Reliable Searches Section */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 md:py-16">
        <div className="text-center mb-6 sm:mb-8 md:mb-10">
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2 sm:mb-3">
            Reliable searches for AI Agents.
          </h2>
          <p className="text-sm sm:text-base text-gray-700 px-2">
            Semantic search that understands context and delivers accurate results across multiple languages.
          </p>
        </div>
        <div className="max-w-4xl mx-auto bg-linear-to-br from-gray-50 to-gray-100 rounded-xl sm:rounded-2xl p-4 sm:p-6 md:p-8 border border-gray-200 shadow-lg" style={{ minHeight: '500px' }}>
          <SearchCarousel />
        </div>
      </div>

      {/* MCP Tools Demo Section */}
      <div className="bg-gray-50 py-8 sm:py-12 md:py-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <MCPToolsDemo />
        </div>
      </div>

      {/* Training Demo Section */}
      <div className="bg-gray-50 py-8 sm:py-12 md:py-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-6 sm:mb-8 md:mb-10">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2 sm:mb-3">
              Effortless RAG Training
            </h2>
            <p className="text-sm sm:text-base text-gray-700 px-2">
              Add content from multiple sources and train your RAG with a single click. Watch the magic happen.
            </p>
          </div>
          <div className="max-w-2xl mx-auto">
            <TrainingDemo />
          </div>
        </div>
      </div>

      {/* Sources Demo */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 md:py-16">
        <div className="text-center mb-8 sm:mb-10 md:mb-12">
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2 sm:mb-3">
            Load data from anywhere. Effortlessly.
          </h2>
          <p className="text-base sm:text-lg md:text-xl text-gray-700 max-w-3xl mx-auto px-2">
            Import content from websites, documents, or create Q&A pairs with AI assistance. 
            Your RAG is ready in minutes, not hours.
          </p>
        </div>
        <div style={{ minHeight: '500px' }}>
          <SourcesShowcase />
        </div>
      </div>

      {/* Roadmap Section */}
      <div className="bg-linear-to-b from-gray-50 to-white py-10 sm:py-16 md:py-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <RoadmapSection />
        </div>
      </div>

      {/* Agent RAG Section */}
      <div className="bg-gray-50 py-8 sm:py-12 md:py-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-8 sm:mb-10 md:mb-12">
            <div className="inline-flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 bg-gray-900 text-white rounded-full text-xs sm:text-sm font-semibold mb-4 sm:mb-6">
              <span>Built for AI Agents</span>
            </div>
            <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight text-gray-900 mb-4 sm:mb-6">
              Reliable semantic search<br className="hidden sm:block" />for your AI agents.
            </h2>
            <p className="text-base sm:text-lg md:text-xl text-gray-700 mb-4 px-2">
              Build RAG tools in minutes. Connect via <span className="font-mono font-semibold text-gray-900">MCP</span> or <span className="font-mono font-semibold text-gray-900">API</span>.
              <br className="hidden sm:block" />Your agents get fast, accurate answers from your knowledge base.
            </p>
          </div>

          <div style={{ minHeight: '500px' }}>
            <AgentRagDiagram />
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16 md:py-20">
        <div className="bg-linear-to-r from-gray-900 to-gray-800 rounded-xl sm:rounded-2xl p-6 sm:p-8 md:p-12 text-center">
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-3 sm:mb-4">
            Ready to get started?
          </h2>
          <p className="text-sm sm:text-base text-gray-300 mb-6 sm:mb-8 max-w-2xl mx-auto px-2">
            Create your account and start managing your RAG content in minutes.
          </p>
          <Link
            href="/signin"
            className="inline-flex items-center gap-2 px-6 sm:px-8 py-3 sm:py-4 bg-white text-gray-900 rounded-lg font-semibold hover:bg-gray-100 transition-colors text-sm sm:text-base"
          >
            Get started
            <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5" />
          </Link>
        </div>
      </div>

      <Footer />
    </div>
  );
}
