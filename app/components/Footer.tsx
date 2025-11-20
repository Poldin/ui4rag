import { SiDiscord } from "react-icons/si";

export default function Footer() {
  return (
    <footer className="border-t border-gray-200 py-8 sm:py-12 bg-white">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center gap-3 sm:gap-4 text-xs sm:text-sm text-gray-600">
          <p className="text-center px-2">
            © {new Date().getFullYear()}{" "}
            <span className="font-mono font-semibold">Gimme_RAG</span>. Built for
            RAG enthusiasts.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-4 px-2">
            <a
              href="https://discord.gg/2UY3dXtg"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-gray-600 hover:text-[#5865F2] hover:underline transition-colors"
            >
              <SiDiscord className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span>Discord</span>
            </a>
            <span className="text-gray-400 hidden sm:inline">•</span>
            <a
              href="https://example.com/terms"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-600 hover:text-gray-900 hover:underline transition-colors"
            >
              T&Cs
            </a>
            <span className="text-gray-400 hidden sm:inline">•</span>
            <a
              href="https://example.com/privacy"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-600 hover:text-gray-900 hover:underline transition-colors"
            >
              Privacy
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}

