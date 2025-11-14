export default function Footer() {
  return (
    <footer className="border-t border-gray-200 py-12 bg-white">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-sm text-gray-600">
        <p>
          © {new Date().getFullYear()}{" "}
          <span className="font-mono font-semibold">Gimme_RAG</span>. Built for
          RAG enthusiasts.
        </p>
      </div>
    </footer>
  );
}

