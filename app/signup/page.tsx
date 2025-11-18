"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Check, Eye, EyeOff, X } from "lucide-react";
import { supabase } from "../../lib/supabase";

// Funzione per validare la password
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

// Tipo per i requisiti della password
interface PasswordRequirements {
  minLength: boolean;
  hasUppercase: boolean;
  hasLowercase: boolean;
  hasNumber: boolean;
  hasSpecialChar: boolean;
}

// Funzione per controllare i requisiti della password
const checkPasswordRequirements = (password: string): PasswordRequirements => {
  return {
    minLength: password.length >= 8,
    hasUppercase: /[A-Z]/.test(password),
    hasLowercase: /[a-z]/.test(password),
    hasNumber: /[0-9]/.test(password),
    hasSpecialChar: /[!@#$%^&*(),.?":{}|<>]/.test(password),
  };
};

export default function SignUpPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState("");
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordRequirements, setPasswordRequirements] = useState<PasswordRequirements>({
    minLength: false,
    hasUppercase: false,
    hasLowercase: false,
    hasNumber: false,
    hasSpecialChar: false,
  });
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setPasswordError(null);

    // Verifica accettazione termini
    if (!acceptedTerms) {
      setError("You must accept the Terms & Conditions and Privacy Policy to continue.");
      setLoading(false);
      return;
    }

    // Valida la password
    const passwordValidationError = validatePassword(password);
    if (passwordValidationError) {
      setPasswordError(passwordValidationError);
      setLoading(false);
      return;
    }

    try {
      const { error, data } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/signin`,
        }
      });
      
      // Log per debug (rimuovere in produzione se necessario)
      console.log('SignUp response:', { error, data, user: data?.user });
      
      if (error) {
        console.log('SignUp error:', error.message, error.status);
        
        // Gestione specifica per utente già registrato
        // Supabase può restituire diversi codici di errore per utente già esistente
        const errorMsg = error.message?.toLowerCase() || '';
        const errorCode = error.status?.toString() || '';
        
        if (errorMsg.includes('already registered') || 
            errorMsg.includes('user already exists') ||
            errorMsg.includes('already been registered') ||
            errorMsg.includes('email already confirmed') ||
            errorMsg.includes('user already registered') ||
            errorCode === '422' ||
            (errorMsg.includes('email') && errorMsg.includes('taken'))) {
          setError("This email is already registered. Please sign in instead.");
          // Dopo 3 secondi, reindirizza al login
          setTimeout(() => {
            router.push('/signin');
          }, 3000);
          setLoading(false);
          return;
        }
        
        // Se c'è un errore generico, lo mostriamo
        setError(error.message || "Failed to sign up");
        setLoading(false);
        return;
      }
      
      // Se non c'è errore ma anche nessun utente creato, potrebbe essere che l'utente esiste già
      // Supabase potrebbe non restituire errore ma anche non creare l'utente se l'email esiste già
      if (!data.user) {
        // Proviamo a verificare se l'utente può fare login (cioè se esiste già)
        // Questo è un modo per verificare se l'email è già registrata
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        
        // Se il login funziona, significa che l'utente esiste già
        if (!signInError) {
          // Chiudiamo la sessione perché non vogliamo autenticare l'utente qui
          await supabase.auth.signOut();
          setError("This email is already registered. Please sign in instead.");
          setTimeout(() => {
            router.push('/signin');
          }, 3000);
          setLoading(false);
          return;
        }
        
        // Se il login fallisce con "Invalid login credentials", potrebbe essere che l'utente esiste
        // ma la password è diversa, oppure l'utente non esiste
        // In questo caso, mostriamo un messaggio generico
        if (signInError.message?.toLowerCase().includes('invalid login') || 
            signInError.message?.toLowerCase().includes('email not confirmed')) {
          setError("This email is already registered. Please sign in instead.");
          setTimeout(() => {
            router.push('/signin');
          }, 3000);
          setLoading(false);
          return;
        }
        
        // Se c'è un altro errore, potrebbe essere che l'utente non esiste
        // ma c'è stato un problema nella registrazione
        setError("Failed to create account. Please try again.");
        setLoading(false);
        return;
      }
      
      // Se l'utente è stato creato con successo
      if (data.user && data.user.email) {
        setOtpSent(true);
      }
    } catch (err: any) {
      console.error('SignUp exception:', err);
      
      // Gestione errori generici
      const errorMessage = err.message || "Failed to sign up";
      
      // Controllo aggiuntivo per messaggi di errore comuni di Supabase
      if (errorMessage.toLowerCase().includes('already registered') || 
          errorMessage.toLowerCase().includes('user already exists') ||
          errorMessage.toLowerCase().includes('already been registered') ||
          errorMessage.toLowerCase().includes('email already confirmed') ||
          errorMessage.toLowerCase().includes('user already registered')) {
        setError("This email is already registered. Please sign in instead.");
        setTimeout(() => {
          router.push('/signin');
        }, 3000);
      } else {
        setError(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const { error } = await supabase.auth.verifyOtp({
        email,
        token: otp,
        type: 'signup'
      });
      
      if (error) throw error;
      router.push('/signin');
    } catch (err: any) {
      setError(err.message || "Failed to verify OTP");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Content */}
      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 mb-8"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to home
          </Link>

          <div className="bg-white border border-gray-200 rounded-lg p-8">
            {!otpSent ? (
              <>
                <h1 className="text-2xl font-semibold text-gray-900 mb-2">
                  Create your account
                </h1>
                <p className="text-sm text-gray-600 mb-6">
                  Get started with Gimme_RAG
                </p>

                <form onSubmit={handleSignUp} className="space-y-4">
                  {error && (
                    <div className="bg-red-50 border border-red-200 rounded-md p-3">
                      <p className="text-sm text-red-600">{error}</p>
                      {error.toLowerCase().includes('already registered') && (
                        <Link 
                          href="/signin" 
                          className="text-sm text-red-700 font-medium hover:underline mt-2 inline-block"
                        >
                          Go to Sign In →
                        </Link>
                      )}
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Email
                    </label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-700 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="you@example.com"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Password
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => {
                          const newPassword = e.target.value;
                          setPassword(newPassword);
                          setPasswordError(null);
                          setPasswordRequirements(checkPasswordRequirements(newPassword));
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
                    
                    {/* Password Requirements Checklist */}
                    {password && (
                      <div className="mt-2 space-y-1.5">
                        <div className="flex items-center gap-2">
                          {passwordRequirements.minLength ? (
                            <Check className="w-3.5 h-3.5 text-green-600" />
                          ) : (
                            <X className="w-3.5 h-3.5 text-gray-400" />
                          )}
                          <span className={`text-xs ${passwordRequirements.minLength ? 'text-green-600' : 'text-gray-500'}`}>
                            At least 8 characters
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          {passwordRequirements.hasUppercase ? (
                            <Check className="w-3.5 h-3.5 text-green-600" />
                          ) : (
                            <X className="w-3.5 h-3.5 text-gray-400" />
                          )}
                          <span className={`text-xs ${passwordRequirements.hasUppercase ? 'text-green-600' : 'text-gray-500'}`}>
                            One uppercase letter
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          {passwordRequirements.hasLowercase ? (
                            <Check className="w-3.5 h-3.5 text-green-600" />
                          ) : (
                            <X className="w-3.5 h-3.5 text-gray-400" />
                          )}
                          <span className={`text-xs ${passwordRequirements.hasLowercase ? 'text-green-600' : 'text-gray-500'}`}>
                            One lowercase letter
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          {passwordRequirements.hasNumber ? (
                            <Check className="w-3.5 h-3.5 text-green-600" />
                          ) : (
                            <X className="w-3.5 h-3.5 text-gray-400" />
                          )}
                          <span className={`text-xs ${passwordRequirements.hasNumber ? 'text-green-600' : 'text-gray-500'}`}>
                            One number
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          {passwordRequirements.hasSpecialChar ? (
                            <Check className="w-3.5 h-3.5 text-green-600" />
                          ) : (
                            <X className="w-3.5 h-3.5 text-gray-400" />
                          )}
                          <span className={`text-xs ${passwordRequirements.hasSpecialChar ? 'text-green-600' : 'text-gray-500'}`}>
                            One special character
                          </span>
                        </div>
                      </div>
                    )}
                    
                    {passwordError && (
                      <p className="text-xs text-red-600 mt-1">{passwordError}</p>
                    )}
                  </div>

                  {/* Terms & Conditions Checkbox */}
                  <div className="flex items-start gap-2">
                    <div className="relative flex items-center">
                      <input
                        type="checkbox"
                        id="acceptTerms"
                        checked={acceptedTerms}
                        onChange={(e) => setAcceptedTerms(e.target.checked)}
                        className="sr-only"
                      />
                      <div
                        onClick={() => setAcceptedTerms(!acceptedTerms)}
                        className={`w-4 h-4 border-2 rounded cursor-pointer flex items-center justify-center transition-colors ${
                          acceptedTerms
                            ? "bg-gray-900 border-gray-900"
                            : "bg-white border-gray-300 hover:border-gray-400"
                        }`}
                      >
                        {acceptedTerms && (
                          <svg
                            className="w-3 h-3 text-white"
                            fill="none"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path d="M5 13l4 4L19 7"></path>
                          </svg>
                        )}
                      </div>
                    </div>
                    <label htmlFor="acceptTerms" className="text-xs text-gray-700 cursor-pointer">
                      I agree to the{" "}
                      <a
                        href="https://example.com/terms"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-black font-medium hover:underline"
                      >
                        Terms & Conditions
                      </a>
                      {" "}and{" "}
                      <a
                        href="https://example.com/privacy"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-black font-medium hover:underline"
                      >
                        Privacy Policy
                      </a>
                    </label>
                  </div>

                  <button
                    type="submit"
                    disabled={loading || !acceptedTerms}
                    className="w-full px-4 py-2 bg-black text-white rounded-md font-medium hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? "Creating account..." : "Sign Up"}
                  </button>
                </form>
              </>
            ) : (
              <>
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Check className="w-6 h-6 text-green-600" />
                </div>
                <h1 className="text-2xl font-semibold text-gray-900 mb-2 text-center">
                  Check your email
                </h1>
                <p className="text-sm text-gray-600 mb-6 text-center">
                  We've sent a verification code to <strong>{email}</strong>
                </p>

                <form onSubmit={handleVerifyOtp} className="space-y-4">
                  {error && (
                    <div className="bg-red-50 border border-red-200 rounded-md p-3">
                      <p className="text-sm text-red-600">{error}</p>
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
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-700 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-center tracking-widest"
                      placeholder="Enter code"
                    />
                    <p className="text-xs text-gray-500 mt-1 text-center">
                      Enter the verification code sent to your email
                    </p>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full px-4 py-2 bg-black text-white rounded-md font-medium hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? "Verifying..." : "Verify & Continue"}
                  </button>

                  <button
                    type="button"
                    onClick={() => setOtpSent(false)}
                    className="w-full text-sm text-gray-600 hover:text-gray-900"
                  >
                    Use a different email
                  </button>
                </form>
              </>
            )}

            <div className="mt-6 text-center text-sm">
              <span className="text-gray-600">Already have an account? </span>
              <Link href="/signin" className="text-black font-medium hover:underline">
                Sign in
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

