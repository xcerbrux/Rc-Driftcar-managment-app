import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { ShieldCheck, Database, CheckCircle2, Lock, ArrowRight, Car } from 'lucide-react';

export function AuthPage() {
  const { loginWithGoogle, dbConnected } = useAuth();
  const [signingIn, setSigningIn] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const handleGoogleSignIn = async () => {
    setAuthError(null);
    setSigningIn(true);
    try {
      await loginWithGoogle();
    } catch (err: any) {
      setAuthError(err.message || 'Authentication encountered an issue.');
    } finally {
      setSigningIn(false);
    }
  };

  return (
    <div id="auth-page-container" className="min-h-screen bg-zinc-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-zinc-900 text-white shadow-sm mb-4">
          <Car className="w-6 h-6" />
        </div>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">RC Business Manager</h1>
        <p className="mt-2 text-sm text-zinc-600">
          Internal operations, inventory, sales & finance management
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 sm:px-10 border border-zinc-200 rounded-xl shadow-xs">
          <div className="mb-6">
            <div className="flex items-center gap-2 text-xs font-medium text-zinc-500 bg-zinc-50 py-1.5 px-3 rounded-md border border-zinc-100">
              <Lock className="w-3.5 h-3.5 text-zinc-400" />
              <span>Restricted Access: Authorized Business Staff Only</span>
            </div>
          </div>

          {authError && (
            <div
              id="auth-error-banner"
              className="mb-5 p-3.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-sm"
            >
              <p className="font-medium text-xs uppercase tracking-wide text-rose-600 mb-0.5">Authentication Notice</p>
              <p>{authError}</p>
            </div>
          )}

          <div className="space-y-4">
            <button
              id="google-signin-btn"
              onClick={handleGoogleSignIn}
              disabled={signingIn}
              className="w-full flex items-center justify-center gap-3 px-4 py-3 border border-zinc-300 rounded-lg text-sm font-medium text-zinc-800 bg-white hover:bg-zinc-50 focus:outline-hidden focus:ring-2 focus:ring-offset-1 focus:ring-zinc-900 transition-all disabled:opacity-60 disabled:cursor-not-allowed shadow-xs"
            >
              {signingIn ? (
                <div className="w-5 h-5 border-2 border-zinc-400 border-t-zinc-900 rounded-full animate-spin" />
              ) : (
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
              )}
              <span>{signingIn ? 'Signing in...' : 'Sign in with Google'}</span>
            </button>
          </div>

          <div className="mt-8 pt-6 border-t border-zinc-100 space-y-3">
            <h2 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
              Connected Infrastructure
            </h2>
            <div className="flex items-center justify-between text-xs text-zinc-600 bg-zinc-50 p-2.5 rounded-md border border-zinc-100">
              <div className="flex items-center gap-2">
                <Database className="w-3.5 h-3.5 text-zinc-500" />
                <span>Cloud Firestore</span>
              </div>
              <span className="inline-flex items-center gap-1 text-emerald-600 font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                {dbConnected ? 'Online' : 'Checking'}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs text-zinc-600 bg-zinc-50 p-2.5 rounded-md border border-zinc-100">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-3.5 h-3.5 text-zinc-500" />
                <span>Firebase Authentication</span>
              </div>
              <span className="text-zinc-500">Google OAuth</span>
            </div>
          </div>
        </div>

        <div className="mt-6 text-center text-xs text-zinc-500">
          <p>RC Drift Car Specialist Shop Operations</p>
          <p className="mt-1 text-zinc-400">Inventory &bull; COD Tracking &bull; Financial Accuracy</p>
        </div>
      </div>
    </div>
  );
}
