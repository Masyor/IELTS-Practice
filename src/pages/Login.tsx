import React, { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { LogIn, User, AlertCircle } from 'lucide-react';
import { isFirebaseConfigured } from '../lib/firebase';

export default function Login() {
  const { user, login, loginAsDemo } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleGoogleLogin = async () => {
    setError(null);
    setLoading(true);
    try {
      await login();
    } catch (err: any) {
      console.error(err);
      if (!isFirebaseConfigured) {
        setError("Firebase configuration is not active. Using Demo Student instead.");
        // Fallback to demo automatically after a short delay
        setTimeout(() => {
          loginAsDemo();
        }, 1500);
      } else {
        setError(err.message || "An error occurred during Google sign in.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = async () => {
    setError(null);
    setLoading(true);
    try {
      await loginAsDemo();
    } catch (err: any) {
      setError("Failed to initialize demo session.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
      <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 max-w-md w-full text-center">
        <div className="mx-auto w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600 mb-4">
          <LogIn className="w-6 h-6" />
        </div>
        
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Welcome Back</h2>
        <p className="text-gray-500 mb-8 text-sm">
          Select an option below to start your IELTS preparation journey.
        </p>

        {error && (
          <div className="mb-6 p-3 bg-red-50 border border-red-100 text-red-600 rounded-lg text-xs flex items-start gap-2 text-left">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}
        
        <div className="space-y-4">
          {/* Google Sign In option */}
          <button
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50 px-4 py-3 rounded-xl font-medium transition-colors shadow-sm"
          >
            <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-5 h-5" />
            Sign in with Google
          </button>

          <div className="relative flex py-2 items-center">
            <div className="flex-grow border-t border-gray-200"></div>
            <span className="flex-shrink mx-4 text-gray-400 text-xs uppercase font-semibold tracking-wider">or</span>
            <div className="flex-grow border-t border-gray-200"></div>
          </div>

          {/* Local Practice / Demo Student profile option */}
          <button
            onClick={handleDemoLogin}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 bg-indigo-50 text-indigo-700 hover:bg-indigo-100/80 disabled:opacity-50 px-4 py-3 rounded-xl font-medium transition-colors border border-indigo-100"
          >
            <User className="w-5 h-5 text-indigo-600" />
            Use Demo Student Profile
          </button>
        </div>

        <p className="text-xs text-gray-400 mt-8 leading-relaxed">
          The Demo Student profile stores all your scores and answers locally in your browser. No registration is required.
        </p>
      </div>
    </div>
  );
}
