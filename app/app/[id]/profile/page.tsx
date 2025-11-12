export default function ProfilePage() {
  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="border-b border-gray-200 px-6 py-4">
        <h1 className="text-xl font-semibold text-gray-900">Profile</h1>
      </div>

      {/* Content */}
      <div className="flex-1 px-6 py-6">
        <div className="max-w-3xl space-y-6">
          {/* Personal Information */}
          <div>
            <h2 className="text-base font-medium text-gray-900 mb-3">Personal Information</h2>
            <div className="space-y-3">
              <div>
                <label className="block text-sm text-gray-700 mb-1.5">Name</label>
                <input
                  type="text"
                  placeholder="John Doe"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-700 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-700 mb-1.5">Email</label>
                <input
                  type="email"
                  placeholder="john@example.com"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-700 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>

          {/* Account Settings */}
          <div>
            <h2 className="text-base font-medium text-gray-900 mb-3">Account Settings</h2>
            <div className="space-y-3">
              <div>
                <label className="block text-sm text-gray-700 mb-1.5">Current Password</label>
                <input
                  type="password"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-700 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-700 mb-1.5">New Password</label>
                <input
                  type="password"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-700 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>

          {/* Save button */}
          <div className="pt-2">
            <button className="px-4 py-2 bg-black text-white text-sm rounded-md hover:bg-gray-800 transition-colors">
              Save Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}





