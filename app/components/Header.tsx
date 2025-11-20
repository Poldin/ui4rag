import Link from "next/link";

export default function Header() {
  return (
    <nav className="border-b border-gray-200 bg-white sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-14 sm:h-16">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-base sm:text-lg font-bold text-gray-900 font-mono tracking-tight hover:text-gray-700 transition-colors">
              Gimme_RAG
            </span>
          </Link>
          <div className="flex items-center gap-2 sm:gap-4">
            <Link href="/pricing" className="text-xs sm:text-sm text-gray-700 hover:text-gray-900 transition-colors px-2 py-1 sm:px-0 sm:py-0">
              Pricing
            </Link>
            <Link
              href="/signin"
              className="px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-medium bg-black text-white rounded-md hover:bg-gray-800 transition-colors"
            >
              Sign In
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}

