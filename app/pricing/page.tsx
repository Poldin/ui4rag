import Link from "next/link";

export default function PricingPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-white px-4">
      <div className="text-center">
        <h1 className="text-4xl font-semibold tracking-tight text-gray-900 mb-4">
          Pricing
        </h1>
        <p className="text-lg text-gray-600 mb-8">
          Pricing page - Coming soon
        </p>
        <Link
          href="/"
          className="px-4 py-2 rounded-md border border-gray-300 hover:bg-gray-50 transition-colors"
        >
          Back to Home
        </Link>
      </div>
    </div>
  );
}





