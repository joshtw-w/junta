'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import Navbar from '@/components/Navbar'
import PostCard from '@/components/PostCard'
import AddPostModal from '@/components/AddPostModal'
import MapView from '@/components/MapView'
import Avatar from '@/components/Avatar'
import QRModal from '@/components/QRModal'
import LeaderboardModal from '@/components/LeaderboardModal'
import NearbyModal from '@/components/NearbyModal'

interface Place {
  id: string
  name: string
  address: string
  lat: number
  lng: number
  imageUrl: string | null
  googlePlaceId: string | null
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
  _count: { posts: number; members: number }
  members: Array<{ userId: string; role: string; user: { id: string; name: string; avatar: string | null } }>
}

interface PlaceDetails {
  rating: number | null
  totalRatings: number | null
  openNow: boolean | null
  website: string | null
  phone: string | null
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

  // Visited state
  const [visitedIds, setVisitedIds] = useState<Set<string>>(new Set())

  // Votes state: postId -> array of voters
  const [votesByPost, setVotesByPost] = useState<Record<string, Array<{ id: string; name: string; avatar: string | null }>>>({})


  // Photo carousel state
  const [photos, setPhotos] = useState<string[]>([])
  const [placeDetails, setPlaceDetails] = useState<PlaceDetails | null>(null)
  const [photoIndex, setPhotoIndex] = useState(0)
  const [loadingPhotos, setLoadingPhotos] = useState(false)

  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const [loadingMore, setLoadingMore] = useState(false)

  // New feature state
  const [showQR, setShowQR] = useState(false)
  const [showLeaderboard, setShowLeaderboard] = useState(false)
  const [showNearby, setShowNearby] = useState(false)
  const [tonightMode, setTonightMode] = useState(false)
  const [decisionPost, setDecisionPost] = useState<Post | null>(null)
  const [decisionSpinning, setDecisionSpinning] = useState(false)

  const fetchData = useCallback(async () => {
    try {
      const [groupRes, postsRes, visitsRes, votesRes] = await Promise.all([
        fetch(`/api/groups/${id}`),
        fetch(`/api/groups/${id}/posts`),
        fetch(`/api/visits?groupId=${id}`),
        fetch(`/api/votes?groupId=${id}`),
      ])
      if (groupRes.ok) setGroup(await groupRes.json())
      if (postsRes.ok) {
        const data = await postsRes.json()
        setPosts(data.posts)
        setNextCursor(data.nextCursor)
      }
      if (visitsRes.ok) {
        const ids: string[] = await visitsRes.json()
        setVisitedIds(new Set(ids))
      }
      if (votesRes.ok) setVotesByPost(await votesRes.json())
    } catch (err) {
      console.error('Failed to fetch group data:', err)
    } finally {
      setIsLoading(false)
    }
  }, [id])

  const loadMore = async () => {
    if (!nextCursor || loadingMore) return
    setLoadingMore(true)
    try {
      const res = await fetch(`/api/groups/${id}/posts?cursor=${nextCursor}`)
      if (res.ok) {
        const data = await res.json()
        setPosts((prev) => [...prev, ...data.posts])
        setNextCursor(data.nextCursor)
      }
    } catch (err) {
      console.error('Failed to load more posts:', err)
    } finally {
      setLoadingMore(false)
    }
  }

  useEffect(() => { fetchData() }, [fetchData])

  // Fetch photos when a post is selected
  useEffect(() => {
    if (!selectedPost) {
      setPhotos([])
      setPlaceDetails(null)
      setPhotoIndex(0)
      return
    }

    const googlePlaceId = selectedPost.place.googlePlaceId
    if (!googlePlaceId) {
      // No Google Place ID — just use the stored image
      setPhotos(selectedPost.place.imageUrl ? [selectedPost.place.imageUrl] : [])
      return
    }

    setLoadingPhotos(true)
    fetch(`/api/places/photos?googlePlaceId=${googlePlaceId}`)
      .then((r) => r.json())
      .then((data) => {
        const fetchedPhotos: string[] = data.photos || []
        // Always put stored image first if it's not already in the list
        const allPhotos = fetchedPhotos.length > 0
          ? fetchedPhotos
          : selectedPost.place.imageUrl
          ? [selectedPost.place.imageUrl]
          : []
        setPhotos(allPhotos)
        setPlaceDetails(data.details || null)
        setPhotoIndex(0)
      })
      .catch(() => {
        setPhotos(selectedPost.place.imageUrl ? [selectedPost.place.imageUrl] : [])
      })
      .finally(() => setLoadingPhotos(false))
  }, [selectedPost])

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

  const toggleVote = async (postId: string) => {
    const res = await fetch('/api/votes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ postId }),
    })
    if (res.ok) {
      const data = await res.json()
      setVotesByPost((prev) => ({ ...prev, [postId]: data.votes.map((v: { user: { id: string; name: string; avatar: string | null } }) => v.user) }))
    }
  }

  const toggleVisited = async (postId: string) => {
    const res = await fetch('/api/visits', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ postId }),
    })
    const data = await res.json()
    setVisitedIds((prev) => {
      const next = new Set(prev)
      data.visited ? next.add(postId) : next.delete(postId)
      return next
    })
  }

  // Register service worker for push notifications
  useEffect(() => {
    if ('serviceWorker' in navigator && process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY) {
      navigator.serviceWorker.register('/sw.js').then(async (reg) => {
        const existing = await reg.pushManager.getSubscription()
        if (existing) return // already subscribed
        const perm = await Notification.requestPermission()
        if (perm !== 'granted') return
        const sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
        })
        await fetch('/api/push/subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(sub),
        })
      }).catch(() => {})
    }
  }, [])

  const pickForMe = () => {
    const pool = tonightMode
      ? posts.filter((p) => (votesByPost[p.id]?.length || 0) > 0 && !visitedIds.has(p.id))
      : posts.filter((p) => !visitedIds.has(p.id))
    if (pool.length === 0) return
    setDecisionSpinning(true)
    let count = 0
    const interval = setInterval(() => {
      setDecisionPost(pool[Math.floor(Math.random() * pool.length)])
      count++
      if (count >= 12) {
        clearInterval(interval)
        setDecisionPost(pool[Math.floor(Math.random() * pool.length)])
        setDecisionSpinning(false)
      }
    }, 120)
  }

  const handleNearbyAdd = async (place: { name: string; googlePlaceId: string; lat: number; lng: number; address: string; imageUrl: string | null }) => {
    const res = await fetch(`/api/groups/${id}/posts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ place }),
    })
    if (res.ok) {
      const newPost = await res.json()
      setPosts((prev) => [newPost, ...prev])
    }
  }

  const filteredPosts = tonightMode
    ? posts.filter((p) => (votesByPost[p.id]?.length || 0) > 0)
    : posts

  const currentPhoto = photos[photoIndex] || selectedPost?.place.imageUrl || null

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
            <Link href="/groups" className="text-teal-400 hover:text-teal-300 text-sm mt-2 inline-block">Back to groups</Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col">
      <Navbar groupName={group.name} groupId={id} />

      {/* Sticky sub-header */}
      <div className="sticky top-16 z-30 bg-slate-900/95 backdrop-blur border-b border-slate-800">
        {/* Row 1: members + view toggle + add */}
        <div className="max-w-2xl mx-auto px-3 py-2.5 flex items-center justify-between gap-3">
          {/* Left: avatars + count */}
          <div className="flex items-center gap-2 min-w-0">
            <div className="flex -space-x-1.5">
              {group.members.slice(0, 5).map((m) => (
                <Link
                  key={m.userId}
                  href={m.userId === session?.user?.id ? '/profile' : `/profile/${m.userId}`}
                  className="border-2 border-slate-900 rounded-full hover:z-10 hover:scale-110 transition-transform relative"
                  title={m.user.name}
                >
                  <Avatar name={m.user.name} avatar={m.user.avatar} size={24} />
                </Link>
              ))}
            </div>
            <span className="text-xs text-slate-500 truncate">
              {group._count.members} member{group._count.members !== 1 ? 's' : ''} · {posts.length} places
            </span>
          </div>

          {/* Right: view toggle + add */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <div className="flex items-center bg-slate-800 rounded-xl p-0.5 border border-slate-700">
              <button
                onClick={() => setViewMode('feed')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${viewMode === 'feed' ? 'bg-teal-600 text-white' : 'text-slate-400 hover:text-white'}`}
              >Feed</button>
              <button
                onClick={() => setViewMode('map')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${viewMode === 'map' ? 'bg-teal-600 text-white' : 'text-slate-400 hover:text-white'}`}
              >Map</button>
            </div>
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

        {/* Row 2: action strip — horizontal scroll */}
        <div className="max-w-2xl mx-auto border-t border-slate-800/60">
          <div className="flex items-center gap-2 px-3 py-2 overflow-x-auto scrollbar-none">
            <button
              onClick={() => setTonightMode(!tonightMode)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border whitespace-nowrap flex-shrink-0 transition-colors ${tonightMode ? 'bg-amber-500/20 border-amber-500/50 text-amber-400' : 'border-slate-700 text-slate-400 hover:text-white hover:border-slate-500'}`}
            >🌙 Tonight</button>
            <button
              onClick={pickForMe}
              disabled={posts.length === 0}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border border-slate-700 text-slate-400 hover:text-white hover:border-slate-500 whitespace-nowrap flex-shrink-0 transition-colors disabled:opacity-40"
            >🎲 Pick for me</button>
            <button
              onClick={() => setShowNearby(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border border-slate-700 text-slate-400 hover:text-white hover:border-slate-500 whitespace-nowrap flex-shrink-0 transition-colors"
            >📍 Nearby</button>
            <button
              onClick={() => setShowLeaderboard(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border border-slate-700 text-slate-400 hover:text-white hover:border-slate-500 whitespace-nowrap flex-shrink-0 transition-colors"
            >🏆 Leaderboard</button>
            <button
              onClick={() => setShowQR(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border border-slate-700 text-slate-400 hover:text-white hover:border-slate-500 whitespace-nowrap flex-shrink-0 transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
              </svg>
              Add members
            </button>
          </div>
        </div>

        {/* Tonight mode banner */}
        {tonightMode && (
          <div className="bg-amber-500/10 border-t border-amber-500/20 px-4 py-1.5">
            <span className="text-amber-400 text-xs font-medium">🌙 Showing {filteredPosts.length} want-to-go place{filteredPosts.length !== 1 ? 's' : ''}</span>
          </div>
        )}
      </div>

      {/* Main content */}
      {viewMode === 'map' ? (
        <div style={{ height: 'calc(100dvh - 148px)', minHeight: '400px' }}>
          <MapView posts={posts} />
        </div>
      ) : (
        <main className="max-w-2xl mx-auto px-3 py-4">
          {filteredPosts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <div className="w-16 h-16 bg-slate-800 rounded-2xl flex items-center justify-center mb-5">
                <svg className="w-8 h-8 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">No places yet</h3>
              <p className="text-slate-400 max-w-xs mb-5 text-sm">Add the first restaurant or spot for your trip.</p>
              <button
                onClick={() => setShowAddModal(true)}
                className="px-5 py-2.5 bg-teal-600 hover:bg-teal-500 text-white rounded-xl text-sm font-semibold transition-colors"
              >Add First Place</button>
            </div>
          ) : (
            <>
              <div className="masonry-grid">
                {filteredPosts.map((post) => (
                  <div key={post.id} className="masonry-item">
                    <PostCard
                      post={post}
                      onClick={() => setSelectedPost(post)}
                      isCurrentUser={post.user.id === session?.user?.id}
                      isVisited={visitedIds.has(post.id)}
                      voteCount={(votesByPost[post.id] || []).length}
                    />
                  </div>
                ))}
              </div>
              {nextCursor && (
                <div className="flex justify-center py-6">
                  <button
                    onClick={loadMore}
                    disabled={loadingMore}
                    className="px-6 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-sm font-medium transition-colors disabled:opacity-50"
                  >
                    {loadingMore ? 'Loading...' : 'Load more'}
                  </button>
                </div>
              )}
            </>
          )}
        </main>
      )}

      {/* Add Post Modal */}
      {showAddModal && (
        <AddPostModal groupId={id} onClose={() => setShowAddModal(false)} onPostAdded={handlePostAdded} />
      )}

      {/* Post Detail Modal with photo carousel */}
      {selectedPost && (
        <div
          className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-0 sm:p-4"
          onClick={() => setSelectedPost(null)}
        >
          <div
            className="bg-slate-900 rounded-t-3xl sm:rounded-2xl overflow-hidden w-full sm:max-w-sm border border-slate-700/50 flex flex-col"
            style={{ maxHeight: '92vh' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Photo area */}
            <div className="relative flex-shrink-0" style={{ paddingBottom: '62%' }}>
              {loadingPhotos ? (
                <div className="absolute inset-0 bg-slate-800 flex items-center justify-center">
                  <div className="w-6 h-6 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : currentPhoto ? (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={currentPhoto}
                    alt={selectedPost.place.name}
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-transparent to-transparent" />
                </>
              ) : (
                <div className="absolute inset-0 bg-gradient-to-br from-teal-800 to-slate-700 flex items-center justify-center">
                  <svg className="w-14 h-14 text-teal-300/20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  </svg>
                </div>
              )}

              {/* Photo navigation */}
              {photos.length > 1 && (
                <>
                  <button
                    onClick={() => setPhotoIndex((i) => (i - 1 + photos.length) % photos.length)}
                    className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 bg-black/50 hover:bg-black/70 backdrop-blur-sm rounded-full flex items-center justify-center text-white transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                  <button
                    onClick={() => setPhotoIndex((i) => (i + 1) % photos.length)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 bg-black/50 hover:bg-black/70 backdrop-blur-sm rounded-full flex items-center justify-center text-white transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>

                  {/* Dot indicators */}
                  <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-1.5">
                    {photos.map((_, i) => (
                      <button
                        key={i}
                        onClick={() => setPhotoIndex(i)}
                        className={`w-1.5 h-1.5 rounded-full transition-all ${i === photoIndex ? 'bg-white w-3' : 'bg-white/50'}`}
                      />
                    ))}
                  </div>

                  {/* Photo count */}
                  <div className="absolute top-3 left-3 bg-black/50 backdrop-blur-sm rounded-full px-2 py-0.5 text-xs text-white">
                    {photoIndex + 1}/{photos.length}
                  </div>
                </>
              )}

              {/* Close button */}
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
            <div className="p-5 overflow-y-auto">
              <div className="flex items-start justify-between gap-3 mb-1">
                <h3 className="text-lg font-bold text-white leading-snug">{selectedPost.place.name}</h3>
                {/* Been here button */}
                <button
                  onClick={() => toggleVisited(selectedPost.id)}
                  className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                    visitedIds.has(selectedPost.id)
                      ? 'bg-teal-600 text-white'
                      : 'bg-slate-800 text-slate-400 hover:text-white border border-slate-700'
                  }`}
                >
                  <svg className="w-3.5 h-3.5" fill={visitedIds.has(selectedPost.id) ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  {visitedIds.has(selectedPost.id) ? 'Been here' : 'Mark visited'}
                </button>
              </div>

              {/* ── Vote section ── */}
              {(() => {
                const voters = votesByPost[selectedPost.id] || []
                const hasVoted = voters.some((v) => v.id === session?.user?.id)
                return (
                  <div className="bg-slate-800/60 rounded-2xl p-3 mb-3 border border-slate-700/50">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2 min-w-0">
                        {voters.length === 0 ? (
                          <p className="text-slate-500 text-xs">No votes yet — be the first!</p>
                        ) : (
                          <>
                            {/* Voter avatars */}
                            <div className="flex -space-x-1.5">
                              {voters.slice(0, 5).map((voter) => (
                                <div key={voter.id} className="border-2 border-slate-800 rounded-full">
                                  <Avatar name={voter.name} avatar={voter.avatar} size={24} />
                                </div>
                              ))}
                            </div>
                            <p className="text-slate-300 text-xs truncate">
                              {voters.length === 1
                                ? `${voters[0].name} wants to go`
                                : voters.length === 2
                                ? `${voters[0].name} & ${voters[1].name} want to go`
                                : `${voters[0].name} & ${voters.length - 1} others want to go`}
                            </p>
                          </>
                        )}
                      </div>
                      {/* Vote button */}
                      <button
                        onClick={() => toggleVote(selectedPost.id)}
                        className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                          hasVoted
                            ? 'bg-amber-500 text-white scale-105'
                            : 'bg-slate-700 hover:bg-amber-500 text-slate-300 hover:text-white border border-slate-600'
                        }`}
                      >
                        <span className="text-base leading-none">🙋</span>
                        {hasVoted ? `${voters.length} want to go` : 'Want to go'}
                      </button>
                    </div>
                  </div>
                )
              })()}

              {/* Rating */}
              {placeDetails?.rating && (
                <div className="flex items-center gap-2 mb-2">
                  <div className="flex items-center gap-1">
                    {[1,2,3,4,5].map((star) => (
                      <svg key={star} className={`w-3.5 h-3.5 ${star <= Math.round(placeDetails.rating!) ? 'text-amber-400' : 'text-slate-600'}`} fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                      </svg>
                    ))}
                  </div>
                  <span className="text-sm font-semibold text-amber-400">{placeDetails.rating.toFixed(1)}</span>
                  {placeDetails.totalRatings && (
                    <span className="text-xs text-slate-500">({placeDetails.totalRatings.toLocaleString()} reviews)</span>
                  )}
                  {placeDetails.openNow !== null && (
                    <span className={`text-xs font-medium ${placeDetails.openNow ? 'text-emerald-400' : 'text-red-400'}`}>
                      {placeDetails.openNow ? 'Open now' : 'Closed'}
                    </span>
                  )}
                </div>
              )}

              <p className="text-slate-400 text-sm mb-3">{selectedPost.place.address}</p>

              {selectedPost.note && (
                <p className="text-slate-300 text-sm bg-slate-800/60 rounded-xl p-3 mb-3 italic leading-relaxed border-l-2 border-teal-600">
                  &ldquo;{selectedPost.note}&rdquo;
                </p>
              )}

              <div className="flex items-center justify-between mb-4">
                <Link
                  href={selectedPost.user.id === session?.user?.id ? '/profile' : `/profile/${selectedPost.user.id}`}
                  className="flex items-center gap-2 hover:opacity-80 transition-opacity"
                  onClick={() => setSelectedPost(null)}
                >
                  <Avatar name={selectedPost.user.name} avatar={selectedPost.user.avatar} size={28} />
                  <span className="text-sm text-slate-300">{selectedPost.user.name}</span>
                </Link>
                <span className="text-xs text-slate-500">
                  {new Date(selectedPost.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </span>
              </div>

              {/* Action buttons */}
              <div className="flex gap-2">
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(selectedPost.place.name)}&query_place_id=${selectedPost.place.googlePlaceId || ''}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 py-2.5 flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl text-sm transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  </svg>
                  Maps
                </a>
                {placeDetails?.website && (
                  <a
                    href={placeDetails.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 py-2.5 flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl text-sm transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                    Website
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Decision Mode overlay */}
      {decisionPost && (
        <div
          className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-50 p-6"
          onClick={() => !decisionSpinning && setDecisionPost(null)}
        >
          <div className="text-center" onClick={(e) => e.stopPropagation()}>
            <p className="text-slate-400 text-sm mb-4 uppercase tracking-widest">Tonight you&apos;re going to...</p>
            <div className={`bg-slate-800 border border-slate-700 rounded-3xl overflow-hidden max-w-xs w-full mx-auto transition-all ${decisionSpinning ? 'scale-95 opacity-70' : 'scale-100 opacity-100'}`}>
              {decisionPost.place.imageUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={decisionPost.place.imageUrl} alt={decisionPost.place.name} className="w-full h-48 object-cover" />
              )}
              <div className="p-5">
                <h2 className="text-white text-xl font-bold mb-1">{decisionPost.place.name}</h2>
                <p className="text-slate-400 text-sm">{decisionPost.place.address}</p>
                {(votesByPost[decisionPost.id]?.length || 0) > 0 && (
                  <p className="text-amber-400 text-xs mt-2">🔥 {votesByPost[decisionPost.id].length} want to go</p>
                )}
              </div>
            </div>
            {!decisionSpinning && (
              <div className="flex gap-3 mt-5 justify-center">
                <button
                  onClick={pickForMe}
                  className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-sm font-medium"
                >
                  Try again 🎲
                </button>
                <button
                  onClick={() => { setSelectedPost(decisionPost); setDecisionPost(null) }}
                  className="px-5 py-2.5 bg-teal-600 hover:bg-teal-500 text-white rounded-xl text-sm font-medium"
                >
                  Let&apos;s go →
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* QR Modal */}
      {showQR && group && (
        <QRModal inviteCode={group.inviteCode} groupName={group.name} onClose={() => setShowQR(false)} />
      )}

      {/* Leaderboard Modal */}
      {showLeaderboard && group && (
        <LeaderboardModal
          members={group.members}
          posts={posts}
          visitedIds={visitedIds}
          votesByPost={votesByPost}
          onClose={() => setShowLeaderboard(false)}
        />
      )}

      {/* Nearby Modal */}
      {showNearby && (
        <NearbyModal groupId={id} onAddPlace={handleNearbyAdd} onClose={() => setShowNearby(false)} />
      )}
    </div>
  )
}
