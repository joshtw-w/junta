'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Navbar from '@/components/Navbar'

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

interface VisitedPost {
  id: string
  createdAt: string
  place: Place
  group: GroupRef
}

interface AddedPost {
  id: string
  note: string | null
  createdAt: string
  place: Place
  group: GroupRef
}

interface ProfileData {
  id: string
  name: string
  email: string
  avatar: string | null
  createdAt: string
  _count: { posts: number; groups: number; visits: number }
  visits: Array<{ post: VisitedPost }>
  posts: AddedPost[]
}

const AVATAR_COLORS = [
  'from-teal-400 to-teal-600',
  'from-violet-400 to-violet-600',
  'from-rose-400 to-rose-600',
  'from-amber-400 to-amber-600',
  'from-sky-400 to-sky-600',
  'from-emerald-400 to-emerald-600',
]

export default function ProfilePage() {
  const { data: session } = useSession()
  const router = useRouter()
  const [profile, setProfile] = useState<ProfileData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'visited' | 'added'>('visited')
  const [editingName, setEditingName] = useState(false)
  const [nameInput, setNameInput] = useState('')
  const [saving, setSaving] = useState(false)

  const avatarColor = AVATAR_COLORS[
    session?.user?.name
      ? session.user.name.charCodeAt(0) % AVATAR_COLORS.length
      : 0
  ]

  useEffect(() => {
    fetch('/api/profile')
      .then((r) => r.json())
      .then((data) => { setProfile(data); setNameInput(data.name) })
      .catch(() => router.push('/'))
      .finally(() => setIsLoading(false))
  }, [router])

  const saveName = async () => {
    if (!nameInput.trim() || nameInput === profile?.name) {
      setEditingName(false)
      return
    }
    setSaving(true)
    const res = await fetch('/api/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: nameInput.trim() }),
    })
    if (res.ok) {
      const data = await res.json()
      setProfile((p) => p ? { ...p, name: data.name } : p)
    }
    setSaving(false)
    setEditingName(false)
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-900">
        <Navbar />
        <div className="flex items-center justify-center py-24">
          <div className="w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    )
  }

  if (!profile) return null

  const visitedPosts = profile.visits.map((v) => v.post)
  const displayPosts = activeTab === 'visited' ? visitedPosts : profile.posts

  return (
    <div className="min-h-screen bg-slate-900">
      <Navbar />

      <main className="max-w-lg mx-auto px-4 py-6">
        {/* Profile card */}
        <div className="bg-slate-800 rounded-2xl p-6 mb-6 border border-slate-700">
          <div className="flex items-center gap-4 mb-5">
            {/* Avatar */}
            <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${avatarColor} flex items-center justify-center text-2xl font-bold text-white flex-shrink-0`}>
              {profile.name.charAt(0).toUpperCase()}
            </div>

            <div className="flex-1 min-w-0">
              {editingName ? (
                <div className="flex items-center gap-2">
                  <input
                    autoFocus
                    value={nameInput}
                    onChange={(e) => setNameInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') saveName(); if (e.key === 'Escape') setEditingName(false) }}
                    className="bg-slate-900 border border-slate-600 rounded-xl px-3 py-1.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 w-full"
                  />
                  <button
                    onClick={saveName}
                    disabled={saving}
                    className="px-3 py-1.5 bg-teal-600 hover:bg-teal-500 text-white text-xs rounded-xl flex-shrink-0 transition-colors disabled:opacity-50"
                  >
                    {saving ? '...' : 'Save'}
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <h1 className="text-lg font-bold text-white truncate">{profile.name}</h1>
                  <button
                    onClick={() => setEditingName(true)}
                    className="text-slate-500 hover:text-white transition-colors flex-shrink-0"
                    title="Edit name"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                  </button>
                </div>
              )}
              <p className="text-slate-400 text-sm truncate">{profile.email}</p>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Places added', value: profile._count.posts },
              { label: 'Been here', value: profile._count.visits },
              { label: 'Groups', value: profile._count.groups },
            ].map((stat) => (
              <div key={stat.label} className="bg-slate-900/50 rounded-xl p-3 text-center">
                <div className="text-xl font-bold text-teal-400">{stat.value}</div>
                <div className="text-xs text-slate-500 mt-0.5">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex bg-slate-800 rounded-xl p-1 mb-4 border border-slate-700">
          <button
            onClick={() => setActiveTab('visited')}
            className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${activeTab === 'visited' ? 'bg-teal-600 text-white' : 'text-slate-400 hover:text-white'}`}
          >
            Been here ({profile._count.visits})
          </button>
          <button
            onClick={() => setActiveTab('added')}
            className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${activeTab === 'added' ? 'bg-teal-600 text-white' : 'text-slate-400 hover:text-white'}`}
          >
            Added ({profile._count.posts})
          </button>
        </div>

        {/* Place list */}
        {displayPosts.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-slate-500 text-sm">
              {activeTab === 'visited'
                ? "You haven't marked any places as visited yet."
                : "You haven't added any places yet."}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {displayPosts.map((post) => (
              <Link
                key={post.id}
                href={`/groups/${post.group.id}`}
                className="flex items-center gap-3 bg-slate-800 hover:bg-slate-750 border border-slate-700 hover:border-teal-500/40 rounded-2xl p-3 transition-all group"
              >
                {/* Thumbnail */}
                <div className="w-14 h-14 rounded-xl overflow-hidden flex-shrink-0 bg-slate-700">
                  {post.place.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={post.place.imageUrl} alt={post.place.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-teal-800 to-slate-700 flex items-center justify-center">
                      <svg className="w-6 h-6 text-teal-300/30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      </svg>
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-white text-sm group-hover:text-teal-300 transition-colors line-clamp-1">{post.place.name}</p>
                  <p className="text-slate-500 text-xs line-clamp-1 mt-0.5">{post.place.address}</p>
                  <p className="text-teal-600 text-xs mt-1">{post.group.name}</p>
                </div>

                <svg className="w-4 h-4 text-slate-600 group-hover:text-teal-400 transition-colors flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
