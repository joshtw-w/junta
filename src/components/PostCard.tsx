'use client'

import Avatar from './Avatar'

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

interface PostCardProps {
  post: Post
  onClick: () => void
  isCurrentUser: boolean
  isVisited?: boolean
  voteCount?: number
}

// Deterministic gradient per place name so placeholders are colorful
const GRADIENTS = [
  'from-teal-700 to-cyan-900',
  'from-violet-700 to-indigo-900',
  'from-rose-700 to-pink-900',
  'from-amber-600 to-orange-900',
  'from-emerald-700 to-teal-900',
  'from-sky-700 to-blue-900',
]

function gradientFor(name: string): string {
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
  return GRADIENTS[Math.abs(hash) % GRADIENTS.length]
}

export default function PostCard({ post, onClick, isCurrentUser, isVisited, voteCount = 0 }: PostCardProps) {
  const { place, user, note } = post
  const gradient = gradientFor(place.name)

  return (
    <button
      onClick={onClick}
      className="w-full text-left bg-slate-800 rounded-2xl overflow-hidden border border-slate-700/60 hover:border-teal-500/50 transition-all duration-200 hover:shadow-xl hover:shadow-black/30 hover:-translate-y-0.5 group block"
    >
      {/* Image — takes up most of the card */}
      <div className="relative overflow-hidden" style={{ paddingBottom: '72%' }}>
        {place.imageUrl ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={place.imageUrl}
              alt={place.name}
              className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              loading="lazy"
            />
            {/* Gradient overlay — always present so text is readable */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
            {/* Badges: top-right */}
            <div className="absolute top-2 right-2 flex flex-col items-end gap-1">
              {voteCount > 0 && (
                <div className="flex items-center gap-1 bg-amber-500 rounded-full px-2 py-0.5 shadow-lg">
                  <span className="text-xs leading-none">🙋</span>
                  <span className="text-xs font-bold text-white">{voteCount}</span>
                </div>
              )}
              {isVisited && (
                <div className="w-6 h-6 bg-teal-500 rounded-full flex items-center justify-center shadow-lg">
                  <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className={`absolute inset-0 bg-gradient-to-br ${gradient} flex items-center justify-center`}>
            <svg className="w-10 h-10 text-white/20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
        )}
      </div>

      {/* Content below image */}
      <div className="px-3 py-2.5">
        <h3 className="font-semibold text-white text-sm leading-snug group-hover:text-teal-300 transition-colors line-clamp-1">
          {place.name}
        </h3>

        {note ? (
          <p className="text-slate-400 text-xs mt-1 line-clamp-2 italic leading-relaxed">
            &ldquo;{note}&rdquo;
          </p>
        ) : (
          <p className="text-slate-500 text-xs mt-1 line-clamp-1">
            {place.address.split(',').slice(0, 2).join(',')}
          </p>
        )}

        <div className="flex items-center gap-1.5 mt-2">
          <div className="w-4 h-4 rounded-full bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center text-[9px] font-bold text-white flex-shrink-0">
            {user.name.charAt(0).toUpperCase()}
          </div>
          <span className="text-xs text-slate-500 truncate">
            {isCurrentUser ? 'You' : user.name}
          </span>
        </div>
      </div>
    </button>
  )
}
