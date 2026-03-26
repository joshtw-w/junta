'use client'

import Link from 'next/link'

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

interface GroupCardProps {
  group: Group
  currentUserId: string
}

const GRADIENT_COLORS = [
  'from-teal-700 to-teal-900',
  'from-blue-700 to-blue-900',
  'from-violet-700 to-violet-900',
  'from-amber-700 to-amber-900',
  'from-rose-700 to-rose-900',
  'from-emerald-700 to-emerald-900',
]

function getGradient(name: string) {
  const index = name.charCodeAt(0) % GRADIENT_COLORS.length
  return GRADIENT_COLORS[index]
}

export default function GroupCard({ group, currentUserId }: GroupCardProps) {
  const userRole = group.members.find((m) => m.user.id === currentUserId)?.role
  const gradient = getGradient(group.name)

  return (
    <Link href={`/groups/${group.id}`} className="block group">
      <div className="bg-slate-800 rounded-2xl overflow-hidden border border-slate-700 hover:border-teal-500/50 transition-all hover:shadow-lg hover:shadow-teal-900/20 hover:-translate-y-0.5">
        {/* Color banner */}
        <div className={`h-24 bg-gradient-to-br ${gradient} relative overflow-hidden`}>
          <div className="absolute inset-0 flex items-center justify-center opacity-10">
            <svg className="w-24 h-24" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={0.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            </svg>
          </div>
          <div className="absolute top-3 right-3">
            {userRole === 'admin' && (
              <span className="bg-black/30 text-white/80 text-xs px-2 py-0.5 rounded-full backdrop-blur-sm">
                Admin
              </span>
            )}
          </div>
        </div>

        <div className="p-5">
          <h3 className="text-base font-semibold text-white mb-1 group-hover:text-teal-300 transition-colors truncate">
            {group.name}
          </h3>
          {group.description && (
            <p className="text-slate-400 text-xs line-clamp-2 mb-3">
              {group.description}
            </p>
          )}

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 text-xs text-slate-500">
              <span className="flex items-center gap-1">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                {group._count.members}
              </span>
              <span className="flex items-center gap-1">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                </svg>
                {group._count.posts} places
              </span>
            </div>

            {/* Member avatars */}
            <div className="flex -space-x-1.5">
              {group.members.slice(0, 4).map((member) => (
                <div
                  key={member.user.id}
                  className="w-6 h-6 rounded-full bg-gradient-to-br from-teal-400 to-teal-600 border-2 border-slate-800 flex items-center justify-center text-xs font-semibold text-white"
                  title={member.user.name}
                >
                  {member.user.name.charAt(0).toUpperCase()}
                </div>
              ))}
              {group.members.length > 4 && (
                <div className="w-6 h-6 rounded-full bg-slate-700 border-2 border-slate-800 flex items-center justify-center text-xs text-slate-400">
                  +{group.members.length - 4}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </Link>
  )
}
