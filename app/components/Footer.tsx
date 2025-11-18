import { SiDiscord } from "react-icons/si";

export default function Footer() {
  return (
    <footer className="border-t border-gray-200 py-12 bg-white">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center gap-4 text-sm text-gray-600">
          <p>
            © {new Date().getFullYear()}{" "}
            <span className="font-mono font-semibold">Gimme_RAG</span>. Built for
            RAG enthusiasts.
          </p>
          <div className="flex items-center gap-4">
            <a
              href="https://discord.gg/2UY3dXtg"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-gray-600 hover:text-[#5865F2] hover:underline transition-colors"
            >
              <SiDiscord className="w-4 h-4" />
              Discord
            </a>
            <span className="text-gray-400">•</span>
            <a
              href="https://example.com/terms"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-600 hover:text-gray-900 hover:underline transition-colors"
            >
              Terms & Conditions
            </a>
            <span className="text-gray-400">•</span>
            <a
              href="https://example.com/privacy"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-600 hover:text-gray-900 hover:underline transition-colors"
            >
              Privacy Policy
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}

