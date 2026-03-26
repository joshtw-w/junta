'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'

interface GroupInfo {
  id: string
  name: string
  description: string | null
  _count: {
    members: number
  }
}

export default function JoinGroupPage() {
  const { code } = useParams<{ code: string }>()
  const { data: session, status } = useSession()
  const router = useRouter()

  const [groupInfo, setGroupInfo] = useState<GroupInfo | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isJoining, setIsJoining] = useState(false)
  const [error, setError] = useState('')
  const [notFound, setNotFound] = useState(false)

  const fetchGroupInfo = useCallback(async () => {
    try {
      const res = await fetch(`/api/groups/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inviteCode: code, preview: true }),
      })

      if (res.status === 401) {
        setIsLoading(false)
        return
      }

      const data = await res.json()

      if (res.status === 409) {
        router.push(`/groups/${data.groupId}`)
        return
      }

      if (res.status === 404) {
        setNotFound(true)
        setIsLoading(false)
        return
      }

      if (res.ok) {
        router.push(`/groups/${data.groupId}`)
        return
      }
    } catch (err) {
      console.error('Error fetching group info:', err)
    } finally {
      setIsLoading(false)
    }
  }, [code, router])

  useEffect(() => {
    if (status === 'unauthenticated') {
      setIsLoading(false)
      return
    }

    if (status === 'authenticated') {
      fetchGroupInfo()
    }
  }, [status, fetchGroupInfo])

  const handleJoin = async () => {
    if (!session) {
      router.push(`/?callbackUrl=/join/${code}`)
      return
    }

    setIsJoining(true)
    setError('')

    try {
      const res = await fetch('/api/groups/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inviteCode: code }),
      })

      const data = await res.json()

      if (res.status === 409) {
        router.push(`/groups/${data.groupId}`)
        return
      }

      if (!res.ok) {
        setError(data.error || 'Failed to join group')
        return
      }

      router.push(`/groups/${data.groupId}`)
    } catch {
      setError('An error occurred. Please try again.')
    } finally {
      setIsJoining(false)
    }
  }

  if (isLoading || status === 'loading') {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (notFound) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="bg-slate-800 rounded-2xl p-8 w-full max-w-sm text-center border border-slate-700">
          <div className="w-16 h-16 bg-red-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.924-.833-2.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Invalid Invite Link</h2>
          <p className="text-slate-400 text-sm mb-6">
            This invite link is invalid or has expired.
          </p>
          <Link
            href="/groups"
            className="block w-full py-3 bg-teal-600 hover:bg-teal-500 text-white rounded-xl text-sm font-medium transition-colors"
          >
            Go to My Groups
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="bg-slate-800 rounded-2xl p-8 w-full max-w-sm border border-slate-700">
        {/* Logo */}
        <div className="flex items-center gap-2 mb-6">
          <div className="w-8 h-8 bg-teal-500 rounded-lg flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            </svg>
          </div>
          <span className="text-lg font-bold text-white">Junta</span>
        </div>

        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-teal-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-teal-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>

          {groupInfo ? (
            <>
              <h2 className="text-xl font-bold text-white mb-1">Join &ldquo;{groupInfo.name}&rdquo;</h2>
              <p className="text-slate-400 text-sm">
                {groupInfo._count.members} member{groupInfo._count.members !== 1 ? 's' : ''} already in this group
              </p>
              {groupInfo.description && (
                <p className="text-slate-300 text-sm mt-2 italic">{groupInfo.description}</p>
              )}
            </>
          ) : (
            <>
              <h2 className="text-xl font-bold text-white mb-1">You&apos;re Invited!</h2>
              <p className="text-slate-400 text-sm">
                Sign in to join this travel group
              </p>
              <div className="mt-3 bg-slate-900/50 rounded-xl px-4 py-2 inline-block">
                <span className="font-mono text-teal-400 font-semibold tracking-widest text-sm">
                  {code.toUpperCase()}
                </span>
              </div>
            </>
          )}
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl p-3 mb-4 text-sm">
            {error}
          </div>
        )}

        {status === 'unauthenticated' ? (
          <div className="space-y-3">
            <Link
              href={`/?callbackUrl=/join/${code}`}
              className="block w-full py-3 bg-teal-600 hover:bg-teal-500 text-white rounded-xl text-sm font-semibold text-center transition-colors"
            >
              Sign In to Join
            </Link>
            <p className="text-center text-slate-400 text-xs">
              Don&apos;t have an account?{' '}
              <Link href="/" className="text-teal-400 hover:text-teal-300">
                Register free
              </Link>
            </p>
          </div>
        ) : (
          <button
            onClick={handleJoin}
            disabled={isJoining}
            className="w-full py-3 bg-teal-600 hover:bg-teal-500 text-white rounded-xl text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isJoining ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                </svg>
                Joining...
              </span>
            ) : 'Join Group'}
          </button>
        )}

        <Link
          href="/groups"
          className="block text-center text-slate-400 hover:text-white text-sm mt-4 transition-colors"
        >
          Back to my groups
        </Link>
      </div>
    </div>
  )
}
