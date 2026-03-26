'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import Navbar from '@/components/Navbar'
import PostCard from '@/components/PostCard'
import AddPostModal from '@/components/AddPostModal'
import MapView from '@/components/MapView'

interface Place {
  id: string
  name: string
  address: string
  lat: number
  lng: number
  imageUrl: string | null
}

interface PostUser {
  id: string
  name: string
  avatar: string | null
}

interface Post {
  id: string
  note: string | null
  createdAt: string
  place: Place
  user: PostUser
}

interface Group {
  id: string
  name: string
  description: string | null
  inviteCode: string
  _count: {
    posts: number
    members: number
  }
  members: Array<{
    userId: string
    role: string
    user: { id: string; name: string }
  }>
}

type ViewMode = 'feed' | 'map'

export default function GroupFeedPage() {
  const { id } = useParams<{ id: string }>()
  const { data: session } = useSession()
  const [group, setGroup] = useState<Group | null>(null)
  const [posts, setPosts] = useState<Post[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [copied, setCopied] = useState(false)
  const [selectedPost, setSelectedPost] = useState<Post | null>(null)
  const [viewMode, setViewMode] = useState<ViewMode>('feed')

  const fetchData = useCallback(async () => {
    try {
      const [groupRes, postsRes] = await Promise.all([
        fetch(`/api/groups/${id}`),
        fetch(`/api/groups/${id}/posts`),
      ])
      if (groupRes.ok) setGroup(await groupRes.json())
      if (postsRes.ok) setPosts(await postsRes.json())
    } catch (err) {
      console.error('Failed to fetch group data:', err)
    } finally {
      setIsLoading(false)
    }
  }, [id])

  useEffect(() => { fetchData() }, [fetchData])

  const copyInviteLink = () => {
    if (!group) return
    const link = `${window.location.origin}/join/${group.inviteCode}`
    navigator.clipboard.writeText(link)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handlePostAdded = (newPost: Post) => {
    setPosts((prev) => [newPost, ...prev])
    setShowAddModal(false)
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-900">
        <Navbar />
        <div className="max-w-2xl mx-auto px-3 py-6">
          <div className="animate-pulse space-y-4">
            <div className="h-7 bg-slate-800 rounded-xl w-40" />
            <div className="masonry-grid">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="masonry-item bg-slate-800 rounded-2xl overflow-hidden">
                  <div className="bg-slate-700" style={{ paddingBottom: '72%' }} />
                  <div className="p-3 space-y-2">
                    <div className="h-3 bg-slate-700 rounded w-3/4" />
                    <div className="h-2.5 bg-slate-700 rounded w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!group) {
    return (
      <div className="min-h-screen bg-slate-900">
        <Navbar />
        <div className="flex items-center justify-center py-24">
          <div className="text-center">
            <p className="text-slate-400">Group not found or you don&apos;t have access.</p>
            <Link href="/groups" className="text-teal-400 hover:text-teal-300 text-sm mt-2 inline-block">
              Back to groups
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-900">
      <Navbar groupName={group.name} groupId={id} />

      {/* ── Sticky sub-header ── */}
      <div className="sticky top-16 z-30 bg-slate-900/95 backdrop-blur border-b border-slate-800">
        <div className="max-w-2xl mx-auto px-3 py-3 flex items-center justify-between gap-3">
          {/* Group info + members */}
          <div className="flex items-center gap-2 min-w-0">
            <div className="flex -space-x-1.5">
              {group.members.slice(0, 5).map((m) => (
                <div
                  key={m.userId}
                  className="w-6 h-6 rounded-full bg-gradient-to-br from-teal-400 to-teal-600 border-2 border-slate-900 flex items-center justify-center text-[9px] font-bold text-white flex-shrink-0"
                  title={m.user.name}
                >
                  {m.user.name.charAt(0).toUpperCase()}
                </div>
              ))}
            </div>
            <span className="text-xs text-slate-500 truncate">
              {group._count.members} member{group._count.members !== 1 ? 's' : ''}
              {' · '}
              {posts.length} place{posts.length !== 1 ? 's' : ''}
            </span>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Feed / Map toggle */}
            <div className="flex items-center bg-slate-800 rounded-xl p-0.5 border border-slate-700">
              <button
                onClick={() => setViewMode('feed')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  viewMode === 'feed'
                    ? 'bg-teal-600 text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Feed
              </button>
              <button
                onClick={() => setViewMode('map')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  viewMode === 'map'
                    ? 'bg-teal-600 text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Map
              </button>
            </div>

            {/* Share */}
            <button
              onClick={copyInviteLink}
              className="flex items-center gap-1.5 px-3 py-2 border border-slate-700 hover:border-teal-500/60 text-slate-400 hover:text-white rounded-xl text-xs transition-colors"
              title="Copy invite link"
            >
              {copied ? (
                <>
                  <svg className="w-3.5 h-3.5 text-teal-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-teal-400">Copied</span>
                </>
              ) : (
                <>
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                  </svg>
                  Invite
                </>
              )}
            </button>

            {/* Add Place */}
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-1.5 px-3 py-2 bg-teal-600 hover:bg-teal-500 text-white rounded-xl text-xs font-semibold transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
              </svg>
              Add
            </button>
          </div>
        </div>
      </div>

      {/* ── Main content ── */}
      {viewMode === 'map' ? (
        <div style={{ height: 'calc(100vh - 116px)' }}>
          <MapView posts={posts} />
        </div>
      ) : (
        <main className="max-w-2xl mx-auto px-3 py-4">
          {posts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <div className="w-16 h-16 bg-slate-800 rounded-2xl flex items-center justify-center mb-5">
                <svg className="w-8 h-8 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">No places yet</h3>
              <p className="text-slate-400 max-w-xs mb-5 text-sm">
                Add the first restaurant or spot for your trip. Paste a Google Maps link or search by name.
              </p>
              <button
                onClick={() => setShowAddModal(true)}
                className="px-5 py-2.5 bg-teal-600 hover:bg-teal-500 text-white rounded-xl text-sm font-semibold transition-colors"
              >
                Add First Place
              </button>
            </div>
          ) : (
            <div className="masonry-grid">
              {posts.map((post) => (
                <div key={post.id} className="masonry-item">
                  <PostCard
                    post={post}
                    onClick={() => setSelectedPost(post)}
                    isCurrentUser={post.user.id === session?.user?.id}
                  />
                </div>
              ))}
            </div>
          )}
        </main>
      )}

      {/* ── Add Post Modal ── */}
      {showAddModal && (
        <AddPostModal
          groupId={id}
          onClose={() => setShowAddModal(false)}
          onPostAdded={handlePostAdded}
        />
      )}

      {/* ── Post Detail Modal ── */}
      {selectedPost && (
        <div
          className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-0 sm:p-4"
          onClick={() => setSelectedPost(null)}
        >
          <div
            className="bg-slate-800 rounded-t-3xl sm:rounded-2xl overflow-hidden w-full sm:max-w-sm border border-slate-700"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Image */}
            <div className="relative" style={{ paddingBottom: '60%' }}>
              {selectedPost.place.imageUrl ? (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={selectedPost.place.imageUrl}
                    alt={selectedPost.place.name}
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                </>
              ) : (
                <div className="absolute inset-0 bg-gradient-to-br from-teal-800 to-slate-700 flex items-center justify-center">
                  <svg className="w-14 h-14 text-teal-300/20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  </svg>
                </div>
              )}
              {/* Close button overlaid on image */}
              <button
                onClick={() => setSelectedPost(null)}
                className="absolute top-3 right-3 w-8 h-8 bg-black/50 hover:bg-black/70 backdrop-blur-sm rounded-full flex items-center justify-center text-white transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Details */}
            <div className="p-5">
              <h3 className="text-lg font-bold text-white leading-snug">{selectedPost.place.name}</h3>
              <p className="text-slate-400 text-sm mt-0.5">{selectedPost.place.address}</p>

              {selectedPost.note && (
                <p className="text-slate-300 text-sm bg-slate-900/60 rounded-xl p-3 mt-3 italic leading-relaxed border-l-2 border-teal-600">
                  &ldquo;{selectedPost.note}&rdquo;
                </p>
              )}

              <div className="flex items-center justify-between mt-4">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center text-xs font-bold text-white">
                    {selectedPost.user.name.charAt(0).toUpperCase()}
                  </div>
                  <span className="text-sm text-slate-300">{selectedPost.user.name}</span>
                </div>
                <span className="text-xs text-slate-500">
                  {new Date(selectedPost.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </span>
              </div>

              {/* Open in Maps */}
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(selectedPost.place.name)}&query_place_id=${selectedPost.place.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full mt-4 py-2.5 flex items-center justify-center gap-2 bg-slate-700 hover:bg-slate-600 text-slate-300 hover:text-white rounded-xl text-sm transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Open in Google Maps
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
