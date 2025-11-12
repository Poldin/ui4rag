import Link from "next/link";
import { Database, Zap, Lock, Code2, ArrowRight } from "lucide-react";
import { SiSupabase, SiNextdotjs, SiOpenai } from "react-icons/si";
import AppDemo from "./components/AppDemo";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-2">
              <span className="text-lg font-semibold text-gray-900">UI4RAG</span>
            </div>
            <div className="flex items-center gap-4">
              <Link href="/pricing" className="text-sm text-gray-700 hover:text-gray-900">
                Pricing
              </Link>
              <Link
                href="/signin"
                className="px-4 py-2 text-sm font-medium bg-black text-white rounded-md hover:bg-gray-800 transition-colors"
              >
                Sign In
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16">
        <div className="text-center max-w-3xl mx-auto">
          <h1 className="text-5xl sm:text-6xl font-bold tracking-tight text-gray-900 mb-6">
            Manage your RAG content with ease
          </h1>
          <p className="text-xl text-gray-700 mb-8">
            Connect your vector database, configure AI embeddings, and manage all your content sources in one beautiful interface.
          </p>
          
          {/* Tech Stack Logos */}
          <div className="flex items-center justify-center gap-6 mb-8 opacity-70">
            <div className="flex items-center gap-2">
              <SiNextdotjs className="w-5 h-5 text-gray-700" />
              <span className="text-sm text-gray-700">Next.js</span>
            </div>
            <div className="flex items-center gap-2">
              <SiSupabase className="w-5 h-5 text-gray-700" />
              <span className="text-sm text-gray-700">Supabase</span>
            </div>
            <div className="flex items-center gap-2">
              <SiOpenai className="w-5 h-5 text-gray-700" />
              <span className="text-sm text-gray-700">OpenAI</span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/signup"
              className="px-6 py-3 bg-black text-white rounded-lg font-medium hover:bg-gray-800 transition-colors flex items-center justify-center gap-2"
            >
              Get started
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>

      {/* Interactive Demo */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-3">
            See it in action
          </h2>
          <p className="text-gray-700">
            Click around and explore the interface. This is what you'll be working with.
          </p>
        </div>
        <AppDemo />
      </div>

      {/* Features Grid */}
      <div id="features" className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid md:grid-cols-2 gap-8">
          {/* Feature 1 */}
          <div className="border border-gray-200 rounded-lg p-6 hover:shadow-lg transition-shadow">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
              <Database className="w-5 h-5 text-blue-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Connect Any Vector Database
            </h3>
            <p className="text-gray-700">
              Bring your own PostgreSQL with pgvector, Supabase, or any vector database. We provide the schema, you provide the connection.
            </p>
          </div>

          {/* Feature 2 */}
          <div className="border border-gray-200 rounded-lg p-6 hover:shadow-lg transition-shadow">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
              <Zap className="w-5 h-5 text-purple-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              AI-Powered Embeddings
            </h3>
            <p className="text-gray-700">
              Configure OpenAI embeddings with your API key. Choose models and dimensions that fit your needs.
            </p>
          </div>

          {/* Feature 3 */}
          <div className="border border-gray-200 rounded-lg p-6 hover:shadow-lg transition-shadow">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center mb-4">
              <Code2 className="w-5 h-5 text-green-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Multiple Content Sources
            </h3>
            <p className="text-gray-700">
              Add content from text, websites, documents, Q&A pairs, or Notion. All in one unified interface.
            </p>
          </div>

          {/* Feature 4 */}
          <div className="border border-gray-200 rounded-lg p-6 hover:shadow-lg transition-shadow">
            <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center mb-4">
              <Lock className="w-5 h-5 text-orange-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Secure & Private
            </h3>
            <p className="text-gray-700">
              Your data stays in your database. We only provide the UI layer. No data storage on our end.
            </p>
          </div>
        </div>
      </div>

      {/* How It Works */}
      <div className="bg-gray-50 py-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
            How It Works
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-12 h-12 bg-black text-white rounded-full flex items-center justify-center mx-auto mb-4 text-lg font-bold">
                1
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Configure
              </h3>
              <p className="text-gray-700">
                Connect your vector database and AI embeddings API
              </p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-black text-white rounded-full flex items-center justify-center mx-auto mb-4 text-lg font-bold">
                2
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Add Content
              </h3>
              <p className="text-gray-700">
                Import from multiple sources: text, websites, docs, or Notion
              </p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-black text-white rounded-full flex items-center justify-center mx-auto mb-4 text-lg font-bold">
                3
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Start Using
              </h3>
              <p className="text-gray-700">
                Your RAG is ready. Query it from your application
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="bg-linear-to-r from-gray-900 to-gray-800 rounded-2xl p-12 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            Ready to get started?
          </h2>
          <p className="text-gray-300 mb-8 max-w-2xl mx-auto">
            Create your account and start managing your RAG content in minutes. No credit card required.
          </p>
          <Link
            href="/signup"
            className="inline-flex items-center gap-2 px-8 py-4 bg-white text-gray-900 rounded-lg font-semibold hover:bg-gray-100 transition-colors"
          >
            Get started
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-gray-200 py-12">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-sm text-gray-600">
          <p>© {new Date().getFullYear()} UI4RAG. Built for RAG enthusiasts.</p>
        </div>
      </footer>
    </div>
  );
}
