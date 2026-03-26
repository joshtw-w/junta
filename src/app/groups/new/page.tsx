'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Navbar from '@/components/Navbar'
import Link from 'next/link'

export default function NewGroupPage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      const res = await fetch('/api/groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, description }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Failed to create group')
        return
      }

      router.push(`/groups/${data.id}`)
    } catch {
      setError('An error occurred. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-900">
      <Navbar />

      <main className="max-w-lg mx-auto px-4 py-12">
        <div className="mb-6">
          <Link
            href="/groups"
            className="flex items-center gap-2 text-slate-400 hover:text-white text-sm transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to groups
          </Link>
        </div>

        <div className="bg-slate-800 rounded-2xl p-8 border border-slate-700">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-white">Create a Group</h1>
            <p className="text-slate-400 text-sm mt-1">
              Build a shared collection of restaurants for your trip
            </p>
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl p-3 mb-6 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">
                Group name <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                maxLength={80}
                className="w-full bg-slate-900 border border-slate-600 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm"
                placeholder="e.g. Tokyo Trip 2024"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">
                Description <span className="text-slate-500">(optional)</span>
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                maxLength={300}
                className="w-full bg-slate-900 border border-slate-600 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm resize-none"
                placeholder="What's this group about? E.g. Best ramen spots in Tokyo..."
              />
              <div className="text-xs text-slate-500 mt-1 text-right">
                {description.length}/300
              </div>
            </div>

            <div className="bg-slate-900/50 rounded-xl p-4 border border-slate-700">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-teal-500/10 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                  <svg className="w-4 h-4 text-teal-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-medium text-white">Invite link generated automatically</p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    After creating your group, you&apos;ll get a unique invite code to share with your travel companions.
                  </p>
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading || !name.trim()}
              className="w-full bg-teal-600 hover:bg-teal-500 text-white font-semibold py-3 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                  </svg>
                  Creating group...
                </span>
              ) : 'Create Group'}
            </button>
          </form>
        </div>
      </main>
    </div>
  )
}
