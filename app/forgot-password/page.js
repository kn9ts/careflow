'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { resetPassword } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    if (!email) {
      setError('Please enter your email address');
      setLoading(false);
      return;
    }

    try {
      const result = await resetPassword(email);

      if (result.success) {
        setMessage('Password reset email sent! Please check your inbox.');
        setEmail('');
      } else {
        setError(result.error);
      }
    } catch (err) {
      console.error('Password reset error:', err);
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8 relative overflow-hidden bg-gradient-diagonal">
      {/* Background with gradient and pattern */}
      <div className="absolute inset-0">
        {/* Decorative gradient orbs */}
        <div className="absolute top-0 left-1/2 w-96 h-96 bg-secondary-500/20 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-500/15 rounded-full blur-3xl -translate-x-1/4 translate-y-1/4" />
        <div className="absolute bottom-0 right-0 w-64 h-64 bg-accent-500/15 rounded-full blur-3xl translate-x-1/4 translate-y-1/4" />

        {/* Scenery Background Image */}
        <img
          src="https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1920&q=80"
          alt=""
          className="w-full h-full object-cover opacity-30"
        />

        {/* Dark overlay for readability */}
        <div className="absolute inset-0 bg-navy-900/70" />
      </div>

      {/* Forgot Password Card */}
      <div className="w-full max-w-md relative z-10">
        {/* Logo/Brand */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-secondary-500 to-purple-500 shadow-glow-secondary mb-4">
            <svg
              className="w-8 h-8 text-white"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"
              />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Reset Password</h1>
          <p className="text-navy-300 text-sm">Enter your email to receive reset instructions</p>
        </div>

        {/* Card Container */}
        <div className="bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 p-8 shadow-elevated">
          {/* Success Message */}
          {message && (
            <div className="mb-6 p-4 bg-success-500/10 border border-success-500/30 rounded-xl text-success-300 text-sm flex items-start gap-3 animate-slide-down">
              <svg
                className="w-5 h-5 text-success-400 flex-shrink-0 mt-0.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
              <div>
                <p className="font-medium">Check your email</p>
                <p className="mt-1 text-success-400/80">{message}</p>
              </div>
            </div>
          )}

          {/* Error Alert */}
          {error && (
            <div className="mb-6 p-4 bg-error-500/10 border border-error-500/30 rounded-xl text-error-300 text-sm flex items-start gap-3 animate-slide-down">
              <svg
                className="w-5 h-5 text-error-400 flex-shrink-0 mt-0.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <span>{error}</span>
            </div>
          )}

          {!message && (
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Email Input */}
              <div>
                <label htmlFor="email" className="label text-white/90">
                  Email Address
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <svg
                      className="w-5 h-5 text-navy-400"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                      />
                    </svg>
                  </div>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="input pl-11 bg-white/5 border-white/10 text-white placeholder:text-navy-400 focus:bg-white/10 focus:border-secondary-400/50"
                    placeholder="Enter your email address"
                    required
                    autoComplete="email"
                    aria-describedby="email-hint"
                  />
                </div>
                <p id="email-hint" className="helper-text text-navy-400">
                  We'll send you a link to reset your password.
                </p>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full py-3.5 text-base font-semibold"
              >
                {loading ? (
                  <div className="flex items-center justify-center gap-2">
                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-white/30 border-t-white" />
                    <span>Sending email...</span>
                  </div>
                ) : (
                  <>
                    <span>Send Reset Email</span>
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                      />
                    </svg>
                  </>
                )}
              </button>
            </form>
          )}

          {message && (
            <div className="space-y-4">
              <div className="p-4 bg-secondary-500/10 border border-secondary-500/30 rounded-xl">
                <h3 className="text-sm font-medium text-secondary-300 mb-2">What's next?</h3>
                <ul className="text-sm text-navy-300 space-y-2">
                  <li className="flex items-start gap-2">
                    <svg
                      className="w-4 h-4 text-secondary-400 mt-0.5 flex-shrink-0"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    <span>Check your email inbox for the reset link</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <svg
                      className="w-4 h-4 text-secondary-400 mt-0.5 flex-shrink-0"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    <span>Click the link in the email to reset your password</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <svg
                      className="w-4 h-4 text-secondary-400 mt-0.5 flex-shrink-0"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    <span>The link will expire in 1 hour for security</span>
                  </li>
                </ul>
              </div>

              <button
                type="button"
                onClick={() => setMessage('')}
                className="btn btn-ghost w-full bg-white/5 border-white/10 hover:bg-white/10"
              >
                <span>Send another email</span>
              </button>
            </div>
          )}

          {/* Divider */}
          <div className="divider-text my-6 text-navy-400">or</div>

          {/* Back to Sign In */}
          <a
            href="/login"
            className="btn btn-ghost w-full bg-white/5 border-white/10 hover:bg-white/10"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 19l-7-7m0 0l7-7m-7 7h18"
              />
            </svg>
            <span>Back to Sign In</span>
          </a>
        </div>

        {/* Help Section */}
        <div className="mt-6 text-center">
          <p className="text-navy-400 text-sm">
            Need help?{' '}
            <a href="#" className="text-secondary-400 hover:text-secondary-300 transition-colors">
              Contact Support
            </a>
          </p>
        </div>

        {/* Bottom Branding */}
        <div className="mt-8 text-center">
          <p className="text-navy-500 text-xs">© 2024 CareFlow. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
}
