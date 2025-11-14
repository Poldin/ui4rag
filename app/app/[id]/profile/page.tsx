"use client";

import { useState, useEffect } from "react";
import { Eye, EyeOff, CreditCard, Loader2 } from "lucide-react";
import { supabase } from "../../../../lib/supabase";

// Funzione per validare la password (stessa di signup)
const validatePassword = (password: string): string | null => {
  if (password.length < 8) {
    return "Password must be at least 8 characters long";
  }
  if (!/[A-Z]/.test(password)) {
    return "Password must contain at least one uppercase letter";
  }
  if (!/[a-z]/.test(password)) {
    return "Password must contain at least one lowercase letter";
  }
  if (!/[0-9]/.test(password)) {
    return "Password must contain at least one number";
  }
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    return "Password must contain at least one special character";
  }
  return null;
};

export default function ProfilePage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(true);
  
  // Change Password Dialog state
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [changingPassword, setChangingPassword] = useState(false);
  const [passwordChangeError, setPasswordChangeError] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState("");
  const [verifyingOtp, setVerifyingOtp] = useState(false);

  // Load user data
  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error) throw error;
      if (user?.email) {
        setEmail(user.email);
      }
    } catch (error) {
      console.error("Error loading user:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleRequestPasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setChangingPassword(true);
    setPasswordChangeError("");
    setPasswordError(null);

    // Valida la password
    const passwordValidationError = validatePassword(newPassword);
    if (passwordValidationError) {
      setPasswordError(passwordValidationError);
      setChangingPassword(false);
      return;
    }

    try {
      // Step 1: Send OTP to email for verification
      const { error } = await supabase.auth.signInWithOtp({
        email: email,
        options: {
          shouldCreateUser: false,
        }
      });

      if (error) throw error;

      // OTP sent successfully
      setOtpSent(true);
    } catch (err: any) {
      setPasswordChangeError(err.message || "Failed to send verification code");
    } finally {
      setChangingPassword(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setVerifyingOtp(true);
    setPasswordChangeError("");

    try {
      // Step 1: Verify the OTP code
      const { error: verifyError } = await supabase.auth.verifyOtp({
        email: email,
        token: otp,
        type: 'email'
      });

      if (verifyError) throw verifyError;

      // Step 2: Now update the password
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (updateError) throw updateError;

      // Success! Close dialog and reset state
      setShowPasswordDialog(false);
      setNewPassword("");
      setOtp("");
      setOtpSent(false);
      alert("Password changed successfully!");
    } catch (err: any) {
      setPasswordChangeError(err.message || "Failed to change password");
    } finally {
      setVerifyingOtp(false);
    }
  };

  const handleCloseDialog = () => {
    setShowPasswordDialog(false);
    setNewPassword("");
    setOtp("");
    setOtpSent(false);
    setPasswordError(null);
    setPasswordChangeError("");
  };

  const handleManageBilling = async () => {
    // TODO: Integrate with Stripe Customer Portal
    // For now, show a message
    alert("Stripe billing integration coming soon!");
    
    // When Stripe is configured, uncomment this:
    /*
    try {
      const response = await fetch('/api/create-portal-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      const { url } = await response.json();
      window.location.href = url;
    } catch (error) {
      console.error('Error creating portal session:', error);
    }
    */
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <>
      <div className="h-full flex flex-col">
        {/* Header */}
        <div className="border-b border-gray-200 px-6 py-4">
          <h1 className="text-xl font-semibold text-gray-900">Profile</h1>
        </div>

        {/* Content */}
        <div className="flex-1 px-6 py-6">
          <div className="max-w-3xl space-y-6">
            {/* Account Information */}
            <div>
              <h2 className="text-base font-medium text-gray-900 mb-3">Account Information</h2>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm text-gray-700 mb-1.5">Email</label>
                  <input
                    type="email"
                    value={email}
                    disabled
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-700 bg-gray-50 cursor-not-allowed"
                  />
                  <p className="text-xs text-gray-500 mt-1">Email cannot be changed</p>
                </div>
              </div>
            </div>

            {/* Password Settings */}
            <div>
              <h2 className="text-base font-medium text-gray-900 mb-3">Password</h2>
              <button
                onClick={() => setShowPasswordDialog(true)}
                className="px-4 py-2 bg-black text-white text-sm rounded-md hover:bg-gray-800 transition-colors"
              >
                Change Password
              </button>
            </div>

            {/* Billing */}
            <div>
              <h2 className="text-base font-medium text-gray-900 mb-3">Billing</h2>
              <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-white rounded-md border border-gray-200">
                    <CreditCard className="w-5 h-5 text-gray-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-sm font-medium text-gray-900 mb-1">Manage Billing</h3>
                    <p className="text-xs text-gray-600 mb-3">
                      View your invoices, update payment methods, and manage your subscription
                    </p>
                    <button
                      onClick={handleManageBilling}
                      className="px-3 py-1.5 bg-white border border-gray-300 text-sm text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
                    >
                      Open Billing Portal
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Change Password Dialog */}
      {showPasswordDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            {!otpSent ? (
              <>
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Change Password</h2>
                <p className="text-sm text-gray-600 mb-4">
                  Enter your new password. We'll send a verification code to your email.
                </p>

                <form onSubmit={handleRequestPasswordChange} className="space-y-4">
                  {passwordChangeError && (
                    <div className="bg-red-50 border border-red-200 rounded-md p-3">
                      <p className="text-sm text-red-600">{passwordChangeError}</p>
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      New Password
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        value={newPassword}
                        onChange={(e) => {
                          setNewPassword(e.target.value);
                          setPasswordError(null);
                        }}
                        required
                        className={`w-full px-3 py-2 pr-10 border ${passwordError ? 'border-red-500' : 'border-gray-300'} rounded-md text-sm text-gray-700 placeholder:text-gray-400 focus:outline-none focus:ring-2 ${passwordError ? 'focus:ring-red-500' : 'focus:ring-blue-500'} focus:border-transparent`}
                        placeholder="••••••••"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                      >
                        {showPassword ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                    {passwordError ? (
                      <p className="text-xs text-red-600 mt-1">{passwordError}</p>
                    ) : (
                      <p className="text-xs text-gray-500 mt-1">
                        Min 8 characters, uppercase, lowercase, number, special character
                      </p>
                    )}
                  </div>

                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={handleCloseDialog}
                      className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md text-sm font-medium hover:bg-gray-50 transition-colors"
                      disabled={changingPassword}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={changingPassword}
                      className="flex-1 px-4 py-2 bg-black text-white rounded-md text-sm font-medium hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {changingPassword ? (
                        <span className="flex items-center justify-center gap-2">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Sending...
                        </span>
                      ) : (
                        "Send Verification Code"
                      )}
                    </button>
                  </div>
                </form>
              </>
            ) : (
              <>
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Verify Your Email</h2>
                <p className="text-sm text-gray-600 mb-4">
                  We've sent a verification code to <strong>{email}</strong>
                </p>

                <form onSubmit={handleVerifyOtp} className="space-y-4">
                  {passwordChangeError && (
                    <div className="bg-red-50 border border-red-200 rounded-md p-3">
                      <p className="text-sm text-red-600">{passwordChangeError}</p>
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Verification Code
                    </label>
                    <input
                      type="text"
                      value={otp}
                      onChange={(e) => setOtp(e.target.value)}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-700 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-center text-lg tracking-widest"
                      placeholder="Enter code"
                    />
                  </div>

                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={handleCloseDialog}
                      className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md text-sm font-medium hover:bg-gray-50 transition-colors"
                      disabled={verifyingOtp}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={verifyingOtp}
                      className="flex-1 px-4 py-2 bg-black text-white rounded-md text-sm font-medium hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {verifyingOtp ? (
                        <span className="flex items-center justify-center gap-2">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Verifying...
                        </span>
                      ) : (
                        "Verify & Change Password"
                      )}
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setOtpSent(false);
                      setOtp("");
                      setPasswordChangeError("");
                    }}
                    className="w-full text-sm text-gray-600 hover:text-gray-900"
                  >
                    Try a different password
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
