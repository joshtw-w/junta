'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import Navbar from '@/components/Navbar'
import Avatar from '@/components/Avatar'

interface Place {
  id: string
  name: string
  address: string
  imageUrl: string | null
}

interface GroupRef {
  id: string
  name: string
}

interface Post {
  id: string
  place: Place
  group: GroupRef
  createdAt: string
}

interface VisitEntry {
  post: Post
}

interface ProfileData {
  user: {
    id: string
    name: string
    avatar: string | null
    createdAt: string
    _count: { posts: number; visits: number }
  }
  posts: Post[]
  visits: VisitEntry[]
  sharedGroupIds: string[]
  sharedVisits: Post[]
  sharedWantToGo: Post[]
  friendStatus: 'none' | 'pending_sent' | 'pending_received' | 'friends'
  friendshipId: string | null
}

export default function PublicProfilePage() {
  const { userId } = useParams<{ userId: string }>()
  const { data: session } = useSession()
  const router = useRouter()
  const [data, setData] = useState<ProfileData | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'added' | 'visited' | 'together'>('added')
  const [actionLoading, setActionLoading] = useState(false)
  const [showInvite, setShowInvite] = useState(false)
  const [myGroups, setMyGroups] = useState<{ id: string; name: string; inviteCode: string }[]>([])
  const [invitedGroups, setInvitedGroups] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (session?.user?.id === userId) {
      router.replace('/profile')
      return
    }
    fetch(`/api/profile/${userId}`)
      .then((r) => r.json())
      .then(setData)
      .finally(() => setLoading(false))
  }, [userId, session, router])

  const sendRequest = async () => {
    setActionLoading(true)
    await fetch('/api/friends', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId }),
    })
    setData((prev) => prev ? { ...prev, friendStatus: 'pending_sent' } : prev)
    setActionLoading(false)
  }

  const respondToRequest = async (action: 'accept' | 'decline') => {
    if (!data?.friendshipId) return
    setActionLoading(true)
    await fetch('/api/friends', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ friendshipId: data.friendshipId, action }),
    })
    setData((prev) => prev ? {
      ...prev,
      friendStatus: action === 'accept' ? 'friends' : 'none',
      friendshipId: action === 'accept' ? prev.friendshipId : null,
    } : prev)
    setActionLoading(false)
  }

  const openInvite = async () => {
    if (myGroups.length === 0) {
      const res = await fetch('/api/groups/invite')
      const data = await res.json()
      setMyGroups(data)
    }
    setShowInvite(true)
  }

  const sendGroupInvite = async (groupId: string) => {
    const res = await fetch('/api/groups/invite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ groupId, friendId: userId }),
    })
    const data = await res.json()
    if (res.ok) {
      const link = `${window.location.origin}/join/${data.inviteCode}`
      navigator.clipboard.writeText(link)
      setInvitedGroups((prev) => new Set(prev).add(groupId))
    }
  }

  const unfriend = async () => {
    setActionLoading(true)
    await fetch('/api/friends', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId }),
    })
    setData((prev) => prev ? { ...prev, friendStatus: 'none', friendshipId: null } : prev)
    setActionLoading(false)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900">
        <Navbar />
        <div className="flex items-center justify-center py-24">
          <div className="w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-slate-900">
        <Navbar />
        <div className="flex items-center justify-center py-24 text-slate-400">User not found</div>
      </div>
    )
  }

  const { user, posts, visits, sharedVisits, sharedWantToGo, friendStatus, sharedGroupIds } = data

  const tabPosts = activeTab === 'added' ? posts
    : activeTab === 'visited' ? visits.map((v) => v.post)
    : activeTab === 'together' ? sharedVisits
    : []

  return (
    <div className="min-h-screen bg-slate-900">
      <Navbar />
      <div className="max-w-lg mx-auto px-4 py-6">

        {/* Profile header */}
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-5 mb-5">
          <div className="flex items-start gap-4">
            <Avatar name={user.name} avatar={user.avatar} size={64} />
            <div className="flex-1 min-w-0">
              <h1 className="text-white text-xl font-bold truncate">{user.name}</h1>
              <p className="text-slate-500 text-xs mt-0.5">
                On Junta since {new Date(user.createdAt).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}
              </p>

              {/* Stats row */}
              <div className="flex items-center gap-4 mt-3">
                <div className="text-center">
                  <p className="text-white font-bold text-lg leading-none">{user._count.posts}</p>
                  <p className="text-slate-500 text-xs mt-0.5">Added</p>
                </div>
                <div className="text-center">
                  <p className="text-white font-bold text-lg leading-none">{user._count.visits}</p>
                  <p className="text-slate-500 text-xs mt-0.5">Visited</p>
                </div>
                {sharedGroupIds.length > 0 && (
                  <div className="text-center">
                    <p className="text-white font-bold text-lg leading-none">{sharedGroupIds.length}</p>
                    <p className="text-slate-500 text-xs mt-0.5">Shared group{sharedGroupIds.length !== 1 ? 's' : ''}</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Friend action */}
          <div className="mt-4">
            {friendStatus === 'none' && (
              <button
                onClick={sendRequest}
                disabled={actionLoading}
                className="w-full py-2.5 bg-teal-600 hover:bg-teal-500 disabled:opacity-50 text-white rounded-xl text-sm font-semibold transition-colors"
              >
                + Add friend
              </button>
            )}
            {friendStatus === 'pending_sent' && (
              <div className="w-full py-2.5 bg-slate-700 text-slate-400 rounded-xl text-sm text-center">
                Request sent · waiting for response
              </div>
            )}
            {friendStatus === 'pending_received' && (
              <div className="flex gap-2">
                <button
                  onClick={() => respondToRequest('accept')}
                  disabled={actionLoading}
                  className="flex-1 py-2.5 bg-teal-600 hover:bg-teal-500 disabled:opacity-50 text-white rounded-xl text-sm font-semibold transition-colors"
                >
                  Accept request
                </button>
                <button
                  onClick={() => respondToRequest('decline')}
                  disabled={actionLoading}
                  className="flex-1 py-2.5 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-xl text-sm font-medium transition-colors"
                >
                  Decline
                </button>
              </div>
            )}
            {friendStatus === 'friends' && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-teal-400 text-sm font-medium flex items-center gap-1.5">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Friends
                  </span>
                  <button
                    onClick={unfriend}
                    disabled={actionLoading}
                    className="text-slate-500 hover:text-red-400 text-xs transition-colors"
                  >
                    Remove friend
                  </button>
                </div>
                <button
                  onClick={openInvite}
                  className="w-full py-2.5 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                  </svg>
                  Invite to a group
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Together stats — shown if friends or in same group */}
        {(friendStatus === 'friends' || sharedGroupIds.length > 0) && (sharedVisits.length > 0 || sharedWantToGo.length > 0) && (
          <div className="bg-teal-900/20 border border-teal-700/30 rounded-2xl p-4 mb-5">
            <p className="text-teal-400 text-xs font-semibold uppercase tracking-wide mb-3">You & {user.name}</p>
            <div className="flex items-center gap-6">
              <div className="text-center">
                <p className="text-white font-bold text-2xl">{sharedVisits.length}</p>
                <p className="text-slate-400 text-xs mt-0.5">Places visited together</p>
              </div>
              <div className="text-center">
                <p className="text-white font-bold text-2xl">{sharedWantToGo.length}</p>
                <p className="text-slate-400 text-xs mt-0.5">Both want to go</p>
              </div>
              <div className="text-center">
                <p className="text-white font-bold text-2xl">{sharedGroupIds.length}</p>
                <p className="text-slate-400 text-xs mt-0.5">Groups shared</p>
              </div>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex items-center bg-slate-800 rounded-xl p-1 border border-slate-700 mb-4">
          {(['added', 'visited', 'together'] as const).map((tab) => {
            const label = tab === 'added' ? `Added (${posts.length})` : tab === 'visited' ? `Visited (${visits.length})` : `Together (${sharedVisits.length})`
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 py-2 rounded-lg text-xs font-medium transition-colors ${activeTab === tab ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'}`}
              >
                {label}
              </button>
            )
          })}
        </div>

        {/* Place list */}
        {tabPosts.length === 0 ? (
          <div className="text-center py-12 text-slate-500 text-sm">
            {activeTab === 'together' ? `No shared places yet — explore together!` : 'Nothing here yet'}
          </div>
        ) : (
          <div className="space-y-2">
            {tabPosts.map((post) => (
              <Link
                key={post.id}
                href={`/groups/${post.group.id}`}
                className="flex items-center gap-3 bg-slate-800/50 border border-slate-700/50 rounded-xl p-3 hover:bg-slate-800 transition-colors"
              >
                {post.place.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={post.place.imageUrl} alt={post.place.name} className="w-12 h-12 rounded-xl object-cover flex-shrink-0" />
                ) : (
                  <div className="w-12 h-12 rounded-xl bg-slate-700 flex items-center justify-center flex-shrink-0 text-lg">🍽️</div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-medium truncate">{post.place.name}</p>
                  <p className="text-slate-500 text-xs truncate">{post.group.name}</p>
                </div>
                <svg className="w-4 h-4 text-slate-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Invite to group picker */}
      {showInvite && (
        <div
          className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-0 sm:p-4"
          onClick={() => setShowInvite(false)}
        >
          <div
            className="bg-slate-900 rounded-t-3xl sm:rounded-2xl w-full sm:max-w-sm border border-slate-700/50 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
              <div>
                <h2 className="text-white font-semibold">Invite {user.name}</h2>
                <p className="text-slate-400 text-xs mt-0.5">Pick a group — copy the invite link</p>
              </div>
              <button onClick={() => setShowInvite(false)} className="text-slate-400 hover:text-white">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="divide-y divide-slate-800">
              {myGroups.length === 0 ? (
                <p className="text-slate-400 text-sm text-center py-8">You&apos;re not in any groups yet</p>
              ) : (
                myGroups.map((group) => (
                  <button
                    key={group.id}
                    onClick={() => sendGroupInvite(group.id)}
                    className="w-full flex items-center justify-between px-5 py-4 hover:bg-slate-800 transition-colors text-left"
                  >
                    <span className="text-white text-sm font-medium">{group.name}</span>
                    {invitedGroups.has(group.id) ? (
                      <span className="text-teal-400 text-xs font-medium flex items-center gap-1">
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Link copied
                      </span>
                    ) : (
                      <span className="text-slate-400 text-xs">Copy link →</span>
                    )}
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
