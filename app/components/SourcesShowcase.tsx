"use client";

import { useState, useEffect } from "react";
import { FileText, Globe, FileStack, MessageSquare, StickyNote, Sparkles, CheckCircle2, ArrowRight, Clock } from "lucide-react";

type SourceType = "text" | "website" | "docs" | "qa" | "notion";

interface SourceDemo {
  type: SourceType;
  icon: React.ElementType;
  title: string;
  description: string;
  badge?: string;
  fields: {
    label: string;
    placeholder: string;
    value: string;
    type?: "input" | "textarea" | "ai";
    aiGenerated?: boolean;
  }[];
  color: string;
}

const sourceDemos: SourceDemo[] = [
  {
    type: "website",
    icon: Globe,
    title: "Website Crawling",
    description: "Import entire websites with automatic content extraction",
    color: "green",
    fields: [
      {
        label: "Website URL",
        placeholder: "https://example.com",
        value: "https://docs.mycompany.com",
        type: "input"
      },
      {
        label: "Crawl Depth",
        placeholder: "Number of pages",
        value: "All pages",
        type: "input"
      }
    ]
  },
  {
    type: "docs",
    icon: FileStack,
    title: "Document Upload",
    description: "Upload PDFs, Word docs, and text files - we handle the rest",
    color: "blue",
    fields: [
      {
        label: "Documents",
        placeholder: "Drop files here",
        value: "✓ User_Manual.pdf (2.3 MB)\n✓ API_Documentation.docx (1.8 MB)\n✓ FAQ_Sheet.txt (124 KB)",
        type: "textarea"
      }
    ]
  },
  {
    type: "qa",
    icon: MessageSquare,
    title: "Q&A Pairs with AI",
    description: "Create Q&A pairs - AI helps you write and optimize them",
    color: "purple",
    fields: [
      {
        label: "Question",
        placeholder: "What question do users ask?",
        value: "How do I reset my password?",
        type: "input"
      },
      {
        label: "Answer (AI-Enhanced)",
        placeholder: "AI will help optimize your answer...",
        value: "To reset your password, navigate to the login page and click 'Forgot Password'. Enter your email address, and we'll send you a secure reset link. The link expires in 24 hours for security. If you don't receive the email, check your spam folder or contact support.",
        type: "textarea",
        aiGenerated: true
      }
    ]
  },
  {
    type: "text",
    icon: FileText,
    title: "Direct Text Input",
    description: "Paste or type content directly - perfect for quick additions",
    color: "gray",
    fields: [
      {
        label: "Title",
        placeholder: "Give it a name",
        value: "Company Policies 2024",
        type: "input"
      },
      {
        label: "Content",
        placeholder: "Your content here...",
        value: "Our company values transparency, innovation, and collaboration. All employees are expected to follow our code of conduct and maintain professional standards...",
        type: "textarea"
      }
    ]
  }
];

export default function SourcesShowcase() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [fieldProgress, setFieldProgress] = useState<number[]>([]);
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    const currentSource = sourceDemos[activeIndex];
    
    // Initialize field progress
    const animateFields = async () => {
      setFieldProgress([]);
      setShowSuccess(false);
      setIsTransitioning(false);

      // Wait a bit before starting
      await new Promise(resolve => setTimeout(resolve, 800));

      // Animate each field appearing
      for (let i = 0; i < currentSource.fields.length; i++) {
        await new Promise(resolve => setTimeout(resolve, 600));
        setFieldProgress(prev => [...prev, i]);
      }

      // Show success checkmark
      await new Promise(resolve => setTimeout(resolve, 800));
      setShowSuccess(true);

      // Wait before transitioning to next
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Transition to next source
      setIsTransitioning(true);
      await new Promise(resolve => setTimeout(resolve, 500));
      setActiveIndex((prev) => (prev + 1) % sourceDemos.length);
    };

    animateFields();
  }, [activeIndex]);

  const currentSource = sourceDemos[activeIndex];
  const Icon = currentSource.icon;

  const getColorClasses = (color: string) => {
    switch (color) {
      case "green":
        return {
          bg: "bg-green-100",
          text: "text-green-700",
          border: "border-green-200",
          ring: "ring-green-500"
        };
      case "blue":
        return {
          bg: "bg-blue-100",
          text: "text-blue-700",
          border: "border-blue-200",
          ring: "ring-blue-500"
        };
      case "purple":
        return {
          bg: "bg-purple-100",
          text: "text-purple-700",
          border: "border-purple-200",
          ring: "ring-purple-500"
        };
      case "gray":
        return {
          bg: "bg-gray-100",
          text: "text-gray-700",
          border: "border-gray-200",
          ring: "ring-gray-500"
        };
      default:
        return {
          bg: "bg-gray-100",
          text: "text-gray-700",
          border: "border-gray-200",
          ring: "ring-gray-500"
        };
    }
  };

  const colors = getColorClasses(currentSource.color);

  return (
    <div className="relative">
      <div className="flex flex-col lg:flex-row gap-4 sm:gap-6 md:gap-8 items-start">
        {/* Left Side - Source Selector */}
        <div className="w-full lg:w-1/3 space-y-2 sm:space-y-3">
          {sourceDemos.map((source, idx) => {
            const SourceIcon = source.icon;
            const isActive = idx === activeIndex;
            const isPast = idx < activeIndex || (activeIndex === 0 && idx === sourceDemos.length - 1);
            
            return (
              <div
                key={source.type}
                className={`relative border rounded-lg p-3 sm:p-4 transition-all duration-500 cursor-pointer ${
                  isActive
                    ? 'bg-white border-gray-900 shadow-lg ring-2 ring-gray-900 ring-offset-1 sm:ring-offset-2'
                    : isPast
                    ? 'bg-gray-50 border-gray-300 opacity-60'
                    : 'bg-white border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-start gap-2 sm:gap-3">
                  <div className={`w-8 h-8 sm:w-9 sm:h-9 md:w-10 md:h-10 rounded-lg flex items-center justify-center shrink-0 ${
                    isActive ? 'bg-gray-900' : 'bg-gray-100'
                  }`}>
                    <SourceIcon className={`w-4 h-4 sm:w-4.5 sm:h-4.5 md:w-5 md:h-5 ${isActive ? 'text-white' : 'text-gray-600'}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 sm:gap-2 mb-0.5 sm:mb-1 flex-wrap">
                      <h4 className={`text-xs sm:text-sm font-semibold ${isActive ? 'text-gray-900' : 'text-gray-700'}`}>
                        {source.title}
                      </h4>
                      {source.badge && (
                        <span className="text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 bg-orange-100 text-orange-700 border border-orange-200 rounded-full font-medium">
                          {source.badge}
                        </span>
                      )}
                      {isPast && (
                        <CheckCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-green-600" />
                      )}
                    </div>
                    <p className="text-[11px] sm:text-xs text-gray-600 leading-relaxed">
                      {source.description}
                    </p>
                  </div>
                  {isActive && (
                    <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 text-gray-900 animate-pulse shrink-0" />
                  )}
                </div>
              </div>
            );
          })}

          {/* Notion Coming Soon */}
          <div className="relative border border-dashed border-gray-300 rounded-lg p-3 sm:p-4 bg-gray-50/50">
            <div className="flex items-start gap-2 sm:gap-3">
              <div className="w-8 h-8 sm:w-9 sm:h-9 md:w-10 md:h-10 rounded-lg flex items-center justify-center shrink-0 bg-gray-200">
                <StickyNote className="w-4 h-4 sm:w-4.5 sm:h-4.5 md:w-5 md:h-5 text-gray-400" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 sm:gap-2 mb-0.5 sm:mb-1 flex-wrap">
                  <h4 className="text-xs sm:text-sm font-semibold text-gray-500">
                    Notion Integration
                  </h4>
                  <span className="text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 bg-orange-100 text-orange-700 border border-orange-200 rounded-full font-medium flex items-center gap-1">
                    <Clock className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                    Coming Soon
                  </span>
                </div>
                <p className="text-[11px] sm:text-xs text-gray-500 leading-relaxed">
                  Import directly from your Notion workspace
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side - Demo Content */}
        <div className="w-full lg:w-2/3">
          <div
            className={`bg-white border border-gray-200 rounded-lg sm:rounded-xl shadow-xl overflow-hidden transition-all duration-500 ${
              isTransitioning ? 'opacity-0 scale-95' : 'opacity-100 scale-100'
            }`}
            style={{ minHeight: '400px' }}
          >
            {/* Header */}
            <div className={`${colors.bg} border-b ${colors.border} px-4 sm:px-5 md:px-6 py-3 sm:py-4`}>
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="w-10 h-10 sm:w-11 sm:h-11 md:w-12 md:h-12 bg-white rounded-lg flex items-center justify-center shadow-sm shrink-0">
                  <Icon className={`w-5 h-5 sm:w-5.5 sm:h-5.5 md:w-6 md:h-6 ${colors.text}`} />
                </div>
                <div className="min-w-0">
                  <h3 className="text-base sm:text-lg font-semibold text-gray-900">
                    {currentSource.title}
                  </h3>
                  <p className="text-xs sm:text-sm text-gray-600">
                    {currentSource.description}
                  </p>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="p-4 sm:p-5 md:p-6 space-y-4 sm:space-y-5" style={{ minHeight: '300px' }}>
              {currentSource.fields.map((field, idx) => (
                <div
                  key={idx}
                  className={`transition-all duration-500 ${
                    fieldProgress.includes(idx)
                      ? 'opacity-100 translate-y-0'
                      : 'opacity-0 translate-y-4'
                  }`}
                  style={{ 
                    minHeight: field.type === 'textarea' ? '100px' : '40px',
                    visibility: fieldProgress.includes(idx) ? 'visible' : 'hidden'
                  }}
                >
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5 sm:mb-2">
                    {field.label}
                    {field.aiGenerated && (
                      <span className="ml-1.5 sm:ml-2 inline-flex items-center gap-0.5 sm:gap-1 text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 bg-purple-100 text-purple-700 border border-purple-200 rounded-full">
                        <Sparkles className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                        AI-Enhanced
                      </span>
                    )}
                  </label>
                  {field.type === "textarea" ? (
                    <div className={`w-full px-3 sm:px-4 py-2 sm:py-3 border-2 rounded-lg bg-gray-50 text-xs sm:text-sm text-gray-900 font-mono leading-relaxed whitespace-pre-wrap min-h-[80px] sm:min-h-[100px] ${
                      field.aiGenerated ? 'border-purple-300 bg-purple-50/50' : 'border-gray-300'
                    }`}>
                      {field.value}
                    </div>
                  ) : (
                    <div className="w-full px-3 sm:px-4 py-2 sm:py-2.5 border-2 border-gray-300 rounded-lg bg-gray-50 text-xs sm:text-sm text-gray-900 font-medium">
                      {field.value}
                    </div>
                  )}
                </div>
              ))}

              {/* Action Button */}
              <div
                className={`pt-3 sm:pt-4 transition-all duration-500 ${
                  showSuccess ? 'opacity-100' : 'opacity-0'
                }`}
              >
                <button
                  className={`w-full px-4 sm:px-6 py-2.5 sm:py-3 bg-gray-900 text-white rounded-lg font-semibold hover:bg-gray-800 transition-colors flex items-center justify-center gap-2 text-xs sm:text-sm ${
                    showSuccess ? 'ring-2 ring-green-500 ring-offset-1 sm:ring-offset-2' : ''
                  }`}
                  disabled
                >
                  {showSuccess ? (
                    <>
                      <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5" />
                      <span>Added to RAG</span>
                    </>
                  ) : (
                    <>
                      <span>Add to RAG</span>
                      <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5" />
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Progress Indicators */}
          <div className="flex justify-center gap-1.5 sm:gap-2 mt-4 sm:mt-6">
            {sourceDemos.map((_, idx) => (
              <div
                key={idx}
                className={`h-1 sm:h-1.5 rounded-full transition-all duration-500 ${
                  idx === activeIndex
                    ? 'w-6 sm:w-8 bg-gray-900'
                    : 'w-1 sm:w-1.5 bg-gray-300'
                }`}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

