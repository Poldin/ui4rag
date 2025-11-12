import PendingChanges from "../../../../components/PendingChanges";

export default function NotionSourcePage() {
  return (
    <div className="h-full flex flex-col relative">
      {/* Header */}
      <div className="border-b border-gray-200 px-6 py-4">
        <h1 className="text-xl font-semibold text-gray-900">Notion Source</h1>
      </div>

      {/* Content */}
      <div className="flex-1 px-6 py-6">
        <div className="max-w-3xl space-y-4">
          <p className="text-sm text-gray-600">
            Connect your Notion workspace to import content
          </p>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Notion Integration Token
            </label>
            <input
              type="password"
              placeholder="secret_..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-700 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <p className="text-xs text-gray-600 mt-1.5">
              Create an integration at{" "}
              <a
                href="https://www.notion.so/my-integrations"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline"
              >
                notion.so/my-integrations
              </a>
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Database or Page URL
            </label>
            <input
              type="url"
              placeholder="https://notion.so/..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-700 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="includeSubpages"
              className="w-4 h-4 border-gray-300 rounded"
            />
            <label htmlFor="includeSubpages" className="text-sm text-gray-700">
              Include all subpages
            </label>
          </div>

          <div className="flex gap-2">
            <button className="px-4 py-2 bg-black text-white text-sm rounded-md hover:bg-gray-800 transition-colors">
              Connect Notion
            </button>
            <button className="px-4 py-2 border border-gray-300 text-sm rounded-md hover:bg-gray-50 transition-colors">
              Cancel
            </button>
          </div>
        </div>
      </div>
      <PendingChanges />
    </div>
  );
}

