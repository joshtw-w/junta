'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import Navbar from '@/components/Navbar'
import GroupCard from '@/components/GroupCard'

interface Group {
  id: string
  name: string
  description: string | null
  inviteCode: string
  createdAt: string
  _count: {
    posts: number
    members: number
  }
  members: Array<{
    user: {
      id: string
      name: string
      email: string
    }
    role: string
  }>
}

export default function GroupsPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const [groups, setGroups] = useState<Group[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [joinCode, setJoinCode] = useState('')
  const [joinError, setJoinError] = useState('')
  const [joinLoading, setJoinLoading] = useState(false)
  const [showJoinModal, setShowJoinModal] = useState(false)

  const fetchGroups = useCallback(async () => {
    try {
      const res = await fetch('/api/groups')
      if (res.ok) {
        const data = await res.json()
        setGroups(data)
      }
    } catch (error) {
      console.error('Failed to fetch groups:', error)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchGroups()
  }, [fetchGroups])

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault()
    setJoinError('')
    setJoinLoading(true)

    try {
      const res = await fetch('/api/groups/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inviteCode: joinCode }),
      })

      const data = await res.json()

      if (!res.ok) {
        if (res.status === 409) {
          router.push(`/groups/${data.groupId}`)
          return
        }
        setJoinError(data.error || 'Failed to join group')
        return
      }

      setShowJoinModal(false)
      setJoinCode('')
      router.push(`/groups/${data.groupId}`)
    } catch {
      setJoinError('An error occurred. Please try again.')
    } finally {
      setJoinLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-900">
      <Navbar />

      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white">
              Your Groups
            </h1>
            <p className="text-slate-400 text-sm mt-1">
              {groups.length === 0
                ? 'Create or join a group to get started'
                : `${groups.length} group${groups.length !== 1 ? 's' : ''}`}
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setShowJoinModal(true)}
              className="flex items-center gap-2 px-4 py-2.5 border border-slate-600 hover:border-teal-500 text-slate-300 hover:text-white rounded-xl text-sm font-medium transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
              Join Group
            </button>
            <Link
              href="/groups/new"
              className="flex items-center gap-2 px-4 py-2.5 bg-teal-600 hover:bg-teal-500 text-white rounded-xl text-sm font-medium transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              New Group
            </Link>
          </div>
        </div>

        {/* Groups grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-slate-800 rounded-2xl p-6 animate-pulse">
                <div className="h-5 bg-slate-700 rounded mb-3 w-3/4" />
                <div className="h-4 bg-slate-700 rounded mb-4 w-1/2" />
                <div className="flex gap-2">
                  <div className="h-8 bg-slate-700 rounded-lg flex-1" />
                  <div className="h-8 bg-slate-700 rounded-lg flex-1" />
                </div>
              </div>
            ))}
          </div>
        ) : groups.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-20 h-20 bg-slate-800 rounded-2xl flex items-center justify-center mb-6">
              <svg className="w-10 h-10 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">No groups yet</h3>
            <p className="text-slate-400 max-w-sm mb-6 text-sm">
              Create a group for your next trip or join an existing one with an invite code.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowJoinModal(true)}
                className="px-5 py-2.5 border border-slate-600 hover:border-teal-500 text-slate-300 hover:text-white rounded-xl text-sm font-medium transition-colors"
              >
                Join with Code
              </button>
              <Link
                href="/groups/new"
                className="px-5 py-2.5 bg-teal-600 hover:bg-teal-500 text-white rounded-xl text-sm font-medium transition-colors"
              >
                Create Group
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {groups.map((group) => (
              <GroupCard
                key={group.id}
                group={group}
                currentUserId={session?.user?.id || ''}
              />
            ))}
          </div>
        )}
      </main>

      {/* Join Modal */}
      {showJoinModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-2xl p-6 w-full max-w-sm border border-slate-700">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">Join a Group</h3>
              <button
                onClick={() => { setShowJoinModal(false); setJoinCode(''); setJoinError('') }}
                className="text-slate-400 hover:text-white"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <p className="text-slate-400 text-sm mb-4">
              Enter the 8-character invite code to join a group.
            </p>
            {joinError && (
              <div className="bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl p-3 mb-4 text-sm">
                {joinError}
              </div>
            )}
            <form onSubmit={handleJoin} className="space-y-4">
              <input
                type="text"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                required
                maxLength={8}
                className="w-full bg-slate-900 border border-slate-600 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500 font-mono text-center text-lg tracking-widest uppercase"
                placeholder="XXXXXXXX"
              />
              <button
                type="submit"
                disabled={joinLoading || joinCode.length !== 8}
                className="w-full bg-teal-600 hover:bg-teal-500 text-white font-semibold py-3 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
              >
                {joinLoading ? 'Joining...' : 'Join Group'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
