"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, Zap, MessageSquare, Database, Sparkles, Globe, FileStack, MessageCircle } from "lucide-react";
import { SiDiscord } from "react-icons/si";
import Header from "../components/Header";
import Footer from "../components/Footer";

export default function PricingPage() {
  const [billingPeriod, setBillingPeriod] = useState<"annual" | "quarterly">("annual");

  const features = [
    { icon: Zap, text: "1 RAG workspace" },
    { icon: Database, text: "Bring your own vector database" },
    { icon: Sparkles, text: "Bring your own embedding API key" },
    { icon: Globe, text: "Website crawling & content import" },
    { icon: FileStack, text: "Document uploads (PDF, DOCX, TXT)" },
    { icon: MessageCircle, text: "Q&A pairs with AI assistance" },
    { icon: MessageSquare, text: "Direct text input" },
  ];

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <Header />

      {/* Hero Section */}
      <div className="flex-1">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="text-center mb-16">
            <h1 className="text-5xl font-bold tracking-tight text-gray-900 mb-4">
              Simple, transparent pricing
            </h1>
            <p className="text-xl text-gray-700 max-w-2xl mx-auto">
              Get started with Gimme_RAG. Bring your own infrastructure, pay only for the UI.
            </p>
          </div>

          {/* Pricing Cards */}
          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto mb-16">
            {/* Standard Plan with Toggle */}
            <div className="relative bg-white border-2 border-gray-900 rounded-2xl p-8 shadow-xl hover:shadow-2xl transition-all">
              {billingPeriod === "annual" && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                  <span className="inline-flex items-center gap-1 px-4 py-1.5 bg-green-500 text-white text-xs font-bold rounded-full shadow-lg">
                    <Zap className="w-3.5 h-3.5" />
                    BEST VALUE
                  </span>
                </div>
              )}
              
              <div className="text-center mb-6 pt-2">
                <h3 className="text-xl font-bold text-gray-900 mb-4">Standard</h3>
                
                {/* Toggle */}
                <div className="inline-flex items-center gap-1 bg-gray-100 rounded-lg p-1 mb-4">
                  <button
                    onClick={() => setBillingPeriod("annual")}
                    className={`px-4 py-2 rounded-md text-sm font-semibold transition-all ${
                      billingPeriod === "annual"
                        ? "bg-gray-900 text-white shadow-sm"
                        : "text-gray-600 hover:text-gray-900"
                    }`}
                  >
                    Annual
                  </button>
                  <button
                    onClick={() => setBillingPeriod("quarterly")}
                    className={`px-4 py-2 rounded-md text-sm font-semibold transition-all ${
                      billingPeriod === "quarterly"
                        ? "bg-gray-900 text-white shadow-sm"
                        : "text-gray-600 hover:text-gray-900"
                    }`}
                  >
                    Quarterly
                  </button>
                </div>

                {/* Pricing */}
                <div className="mb-1">
                  {billingPeriod === "annual" ? (
                    <>
                      <span className="text-5xl font-bold text-gray-900">€3.33</span>
                      <span className="text-gray-600 text-lg">/month</span>
                    </>
                  ) : (
                    <>
                      <span className="text-5xl font-bold text-gray-900">€4.99</span>
                      <span className="text-gray-600 text-lg">/month</span>
                    </>
                  )}
                </div>
                
                {billingPeriod === "annual" ? (
                  <>
                    <p className="text-xs text-gray-500 mb-2">
                      Billed annually (€39.99/year)
                    </p>
                    <p className="text-sm text-green-600 font-semibold">
                      Save €20 vs. quarterly
                    </p>
                  </>
                ) : (
                  <p className="text-xs text-gray-500">
                    Billed quarterly (€14.99 every 3 months)
                  </p>
                )}
              </div>

              <Link
                href="/signup"
                className="block w-full px-6 py-3 bg-gray-900 text-white rounded-lg font-semibold text-center hover:bg-gray-800 transition-colors mb-6"
              >
                Get Started
              </Link>

              <div className="space-y-3">
                {features.map((feature, idx) => {
                  const Icon = feature.icon;
                  return (
                    <div key={idx} className="flex items-start gap-3">
                      <div className={`flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center mt-0.5 ${
                        billingPeriod === "annual" ? "bg-green-100" : "bg-gray-100"
                      }`}>
                        <Check className={`w-3.5 h-3.5 ${
                          billingPeriod === "annual" ? "text-green-600" : "text-gray-600"
                        }`} />
                      </div>
                      <div className="flex items-center gap-2">
                        <Icon className="w-4 h-4 text-gray-600" />
                        <span className="text-sm text-gray-700">{feature.text}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Custom Plan */}
            <div className="bg-gradient-to-br from-purple-50 to-blue-50 border border-purple-200 rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all">
              <div className="text-center mb-6">
                <h3 className="text-xl font-bold text-gray-900 mb-2">Custom</h3>
                <div className="mb-2">
                  <span className="text-4xl font-bold text-gray-900">Let's talk</span>
                </div>
                <p className="text-sm text-gray-600">
                  Tailored for your needs
                </p>
              </div>

              <a
                href="https://discord.gg/2UY3dXtg"
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full px-6 py-3 bg-[#5865F2] text-white rounded-lg font-semibold text-center hover:bg-[#4752C4] transition-colors mb-6 flex items-center justify-center gap-2"
              >
                <SiDiscord className="w-5 h-5" />
                Message us on Discord
              </a>

              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-5 h-5 rounded-full bg-purple-100 flex items-center justify-center mt-0.5">
                    <Check className="w-3.5 h-3.5 text-purple-600" />
                  </div>
                  <span className="text-sm text-gray-700">Multiple RAG workspaces</span>
                </div>
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-5 h-5 rounded-full bg-purple-100 flex items-center justify-center mt-0.5">
                    <Check className="w-3.5 h-3.5 text-purple-600" />
                  </div>
                  <span className="text-sm text-gray-700">Priority support</span>
                </div>
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-5 h-5 rounded-full bg-purple-100 flex items-center justify-center mt-0.5">
                    <Check className="w-3.5 h-3.5 text-purple-600" />
                  </div>
                  <span className="text-sm text-gray-700">Custom integrations</span>
                </div>
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-5 h-5 rounded-full bg-purple-100 flex items-center justify-center mt-0.5">
                    <Check className="w-3.5 h-3.5 text-purple-600" />
                  </div>
                  <span className="text-sm text-gray-700">Team collaboration</span>
                </div>
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-5 h-5 rounded-full bg-purple-100 flex items-center justify-center mt-0.5">
                    <Check className="w-3.5 h-3.5 text-purple-600" />
                  </div>
                  <span className="text-sm text-gray-700">Flexible billing</span>
                </div>
              </div>
            </div>
          </div>

          {/* FAQ / Additional Info */}
          <div className="max-w-3xl mx-auto">
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-8">
              <h3 className="text-lg font-bold text-gray-900 mb-4">
                What's included in all plans?
              </h3>
              <div className="space-y-3 text-sm text-gray-700">
                <p>
                  <strong>🗄️ Bring Your Own Database:</strong> Connect your PostgreSQL with pgvector, Supabase, or any compatible vector database. Your data stays with you.
                </p>
                <p>
                  <strong>🤖 Bring Your Own API Keys:</strong> Use your OpenAI API key (or other providers) for embeddings. You control the costs and usage.
                </p>
                <p>
                  <strong>📦 No Hidden Fees:</strong> We only charge for the UI and management layer. All computation happens on your infrastructure.
                </p>
                <p>
                  <strong>💬 Need something specific?</strong> Fire us a message on{" "}
                  <a
                    href="https://discord.gg/2UY3dXtg"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#5865F2] font-semibold hover:underline"
                  >
                    Discord
                  </a>{" "}
                  and let's chat about custom plans, enterprise needs, or anything else!
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}





