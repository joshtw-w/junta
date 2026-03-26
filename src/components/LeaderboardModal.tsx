'use client'

import Avatar from './Avatar'

interface Member {
  userId: string
  user: { id: string; name: string; avatar: string | null }
}

interface Post {
  id: string
  userId?: string
  user?: { id: string }
}

interface LeaderboardModalProps {
  members: Member[]
  posts: Post[]
  visitedIds: Set<string>
  votesByPost: Record<string, Array<{ id: string; name: string; avatar: string | null }>>
  onClose: () => void
}

const MEDALS = ['🥇', '🥈', '🥉']

export default function LeaderboardModal({ members, posts, visitedIds, votesByPost, onClose }: LeaderboardModalProps) {
  const stats = members.map((m) => {
    const added = posts.filter((p) => (p.userId ?? p.user?.id) === m.userId).length
    const visited = posts.filter((p) => (p.userId ?? p.user?.id) === m.userId && visitedIds.has(p.id)).length
    const votesReceived = posts
      .filter((p) => p.userId === m.userId)
      .reduce((sum, p) => sum + (votesByPost[p.id]?.length || 0), 0)
    const score = added * 3 + visited * 5 + votesReceived * 2
    return { ...m.user, added, visited, votesReceived, score }
  }).sort((a, b) => b.score - a.score)

  return (
    <div
      className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-0 sm:p-4"
      onClick={onClose}
    >
      <div
        className="bg-slate-900 rounded-t-3xl sm:rounded-2xl w-full sm:max-w-sm border border-slate-700/50 overflow-hidden"
        style={{ maxHeight: '85vh' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
          <div>
            <h2 className="text-white font-semibold text-lg">Leaderboard</h2>
            <p className="text-slate-400 text-xs mt-0.5">Add places · Visit · Get votes</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="overflow-y-auto" style={{ maxHeight: 'calc(85vh - 72px)' }}>
          {stats.map((s, i) => (
            <div key={s.id} className="flex items-center gap-3 px-5 py-3.5 border-b border-slate-800/60 last:border-0">
              <span className="text-xl w-7 text-center flex-shrink-0">
                {MEDALS[i] || <span className="text-slate-500 text-sm font-bold">{i + 1}</span>}
              </span>
              <Avatar name={s.name} avatar={s.avatar} size={36} />
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm font-medium truncate">{s.name}</p>
                <div className="flex items-center gap-3 mt-0.5">
                  <span className="text-slate-400 text-xs">📍 {s.added}</span>
                  <span className="text-slate-400 text-xs">✅ {s.visited}</span>
                  <span className="text-slate-400 text-xs">🔥 {s.votesReceived}</span>
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-teal-400 font-bold text-sm">{s.score}</p>
                <p className="text-slate-500 text-xs">pts</p>
              </div>
            </div>
          ))}

          <div className="px-5 py-3 bg-slate-800/40">
            <p className="text-slate-500 text-xs text-center">📍 Add = 3pts · ✅ Visit = 5pts · 🔥 Vote = 2pts</p>
          </div>
        </div>
      </div>
    </div>
  )
}
