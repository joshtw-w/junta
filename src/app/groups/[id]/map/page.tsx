'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import Navbar from '@/components/Navbar'
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
}

export default function MapPage() {
  const { id } = useParams<{ id: string }>()
  const [group, setGroup] = useState<Group | null>(null)
  const [posts, setPosts] = useState<Post[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const fetchData = useCallback(async () => {
    try {
      const [groupRes, postsRes] = await Promise.all([
        fetch(`/api/groups/${id}`),
        fetch(`/api/groups/${id}/posts`),
      ])

      if (groupRes.ok) {
        const groupData = await groupRes.json()
        setGroup(groupData)
      }

      if (postsRes.ok) {
        const postsData = await postsRes.json()
        setPosts(postsData)
      }
    } catch (error) {
      console.error('Failed to fetch data:', error)
    } finally {
      setIsLoading(false)
    }
  }, [id])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-900">
        <Navbar />
        <div className="flex items-center justify-center h-[calc(100vh-64px)]">
          <div className="w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col">
      <Navbar groupName={group?.name} groupId={id} />

      {/* Sub-nav */}
      <div className="bg-slate-800/50 border-b border-slate-700/50 px-4 py-3">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm">
            <Link href="/groups" className="text-slate-400 hover:text-white transition-colors">
              Groups
            </Link>
            <svg className="w-3 h-3 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            <Link href={`/groups/${id}`} className="text-slate-400 hover:text-white transition-colors">
              {group?.name || 'Group'}
            </Link>
            <svg className="w-3 h-3 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            <span className="text-white">Map</span>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-400">
              {posts.length} place{posts.length !== 1 ? 's' : ''}
            </span>
            <Link
              href={`/groups/${id}`}
              className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-600 hover:border-teal-500 text-slate-300 hover:text-white rounded-lg text-xs transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
              </svg>
              Feed View
            </Link>
          </div>
        </div>
      </div>

      {/* Map */}
      <div className="flex-1">
        {posts.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full py-24 text-center px-4">
            <div className="w-20 h-20 bg-slate-800 rounded-2xl flex items-center justify-center mb-6">
              <svg className="w-10 h-10 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">No places on the map yet</h3>
            <p className="text-slate-400 text-sm mb-6">
              Add some places to your group feed to see them on the map.
            </p>
            <Link
              href={`/groups/${id}`}
              className="px-5 py-2.5 bg-teal-600 hover:bg-teal-500 text-white rounded-xl text-sm font-medium transition-colors"
            >
              Go to Feed
            </Link>
          </div>
        ) : (
          <MapView posts={posts} />
        )}
      </div>
    </div>
  )
}
