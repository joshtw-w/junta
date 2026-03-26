'use client'

import { useState, useEffect } from 'react'
import { signIn, useSession } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'

export default function HomePage() {
  const [activeTab, setActiveTab] = useState<'login' | 'register'>('login')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  // Login state
  const [loginEmail, setLoginEmail] = useState('')
  const [loginPassword, setLoginPassword] = useState('')

  // Register state
  const [registerName, setRegisterName] = useState('')
  const [registerEmail, setRegisterEmail] = useState('')
  const [registerPassword, setRegisterPassword] = useState('')
  const [registerConfirm, setRegisterConfirm] = useState('')

  const router = useRouter()
  const searchParams = useSearchParams()
  const { data: session, status } = useSession()

  useEffect(() => {
    if (status === 'authenticated') {
      const callbackUrl = searchParams.get('callbackUrl') || '/groups'
      router.push(callbackUrl)
    }
  }, [status, router, searchParams])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      const result = await signIn('credentials', {
        email: loginEmail,
        password: loginPassword,
        redirect: false,
      })

      if (result?.error) {
        setError('Invalid email or password')
      } else {
        router.push('/groups')
      }
    } catch {
      setError('An error occurred. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (registerPassword !== registerConfirm) {
      setError('Passwords do not match')
      return
    }

    if (registerPassword.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }

    setIsLoading(true)

    try {
      const res = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: registerEmail,
          name: registerName,
          password: registerPassword,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Registration failed')
        return
      }

      const result = await signIn('credentials', {
        email: registerEmail,
        password: registerPassword,
        redirect: false,
      })

      if (result?.error) {
        setError('Account created but login failed. Please sign in.')
        setActiveTab('login')
      } else {
        router.push('/groups')
      }
    } catch {
      setError('An error occurred. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-900 flex">
      {/* Left hero panel */}
      <div className="hidden lg:flex flex-1 flex-col justify-between p-16 bg-gradient-to-br from-teal-900 via-teal-800 to-slate-900 relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxwYXRoIGQ9Ik0zNiAxOGMtMS4xIDAtMiAuOS0yIDJzLjkgMiAyIDIgMi0uOSAyLTItLjktMi0yLTJ6bTAgNGMtMS4xIDAtMiAuOS0yIDJzLjkgMiAyIDIgMi0uOSAyLTItLjktMi0yLTJ6IiBmaWxsPSIjZmZmIiBmaWxsLW9wYWNpdHk9Ii4wNSIvPjwvZz48L3N2Zz4=')] opacity-30" />
        <div className="relative">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-teal-400 rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6 text-teal-900" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <span className="text-2xl font-bold text-white tracking-tight">Junta</span>
          </div>
        </div>

        <div className="relative space-y-6">
          <h1 className="text-5xl font-bold text-white leading-tight">
            Share the best<br />
            <span className="text-teal-300">places</span> with your<br />
            travel group
          </h1>
          <p className="text-teal-100/80 text-lg max-w-md">
            Create a group, invite your travel companions, and build a shared collection of restaurants and spots worth visiting.
          </p>

          <div className="grid grid-cols-2 gap-4 pt-4">
            {[
              { icon: '🗺️', label: 'Map View', desc: 'See all spots on a map' },
              { icon: '📸', label: 'Photo Feed', desc: 'Pinterest-style grid' },
              { icon: '🔗', label: 'Invite Links', desc: 'Share with one click' },
              { icon: '✈️', label: 'Travel Ready', desc: 'Plan before you go' },
            ].map((item) => (
              <div key={item.label} className="bg-white/10 backdrop-blur rounded-xl p-4">
                <div className="text-2xl mb-1">{item.icon}</div>
                <div className="text-white font-semibold text-sm">{item.label}</div>
                <div className="text-teal-200/70 text-xs">{item.desc}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="relative text-teal-200/50 text-sm">
          © 2024 Junta. Plan together, travel better.
        </div>
      </div>

      {/* Right auth panel */}
      <div className="flex-1 flex flex-col items-center justify-center p-8 lg:max-w-md lg:w-full">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="flex items-center gap-2 mb-8 lg:hidden">
            <div className="w-8 h-8 bg-teal-500 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              </svg>
            </div>
            <span className="text-xl font-bold text-white">Junta</span>
          </div>

          <h2 className="text-2xl font-bold text-white mb-2">
            {activeTab === 'login' ? 'Welcome back' : 'Create your account'}
          </h2>
          <p className="text-slate-400 mb-8 text-sm">
            {activeTab === 'login'
              ? 'Sign in to see your travel groups'
              : 'Join the platform for group travel planning'}
          </p>

          {/* Tab switcher */}
          <div className="flex bg-slate-800 rounded-xl p-1 mb-6">
            <button
              onClick={() => { setActiveTab('login'); setError('') }}
              className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${
                activeTab === 'login'
                  ? 'bg-teal-600 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Sign In
            </button>
            <button
              onClick={() => { setActiveTab('register'); setError('') }}
              className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${
                activeTab === 'register'
                  ? 'bg-teal-600 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Register
            </button>
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl p-3 mb-4 text-sm">
              {error}
            </div>
          )}

          {activeTab === 'login' ? (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">
                  Email address
                </label>
                <input
                  type="email"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  required
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm"
                  placeholder="you@example.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">
                  Password
                </label>
                <input
                  type="password"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  required
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm"
                  placeholder="••••••••"
                />
              </div>
              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-teal-600 hover:bg-teal-500 text-white font-semibold py-3 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm mt-2"
              >
                {isLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                    </svg>
                    Signing in...
                  </span>
                ) : 'Sign In'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleRegister} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">
                  Full name
                </label>
                <input
                  type="text"
                  value={registerName}
                  onChange={(e) => setRegisterName(e.target.value)}
                  required
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm"
                  placeholder="Alex Johnson"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">
                  Email address
                </label>
                <input
                  type="email"
                  value={registerEmail}
                  onChange={(e) => setRegisterEmail(e.target.value)}
                  required
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm"
                  placeholder="you@example.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">
                  Password
                </label>
                <input
                  type="password"
                  value={registerPassword}
                  onChange={(e) => setRegisterPassword(e.target.value)}
                  required
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm"
                  placeholder="Min. 6 characters"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">
                  Confirm password
                </label>
                <input
                  type="password"
                  value={registerConfirm}
                  onChange={(e) => setRegisterConfirm(e.target.value)}
                  required
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm"
                  placeholder="••••••••"
                />
              </div>
              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-teal-600 hover:bg-teal-500 text-white font-semibold py-3 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm mt-2"
              >
                {isLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                    </svg>
                    Creating account...
                  </span>
                ) : 'Create Account'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
