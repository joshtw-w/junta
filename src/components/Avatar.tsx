'use client'

const GRADIENT_COLORS = [
  'from-teal-400 to-teal-600',
  'from-violet-400 to-violet-600',
  'from-rose-400 to-rose-600',
  'from-amber-400 to-amber-600',
  'from-sky-400 to-sky-600',
  'from-emerald-400 to-emerald-600',
]

function colorFor(name: string) {
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
  return GRADIENT_COLORS[Math.abs(hash) % GRADIENT_COLORS.length]
}

interface AvatarProps {
  name: string
  avatar?: string | null
  size?: number       // px, default 28
  className?: string
}

export default function Avatar({ name, avatar, size = 28, className = '' }: AvatarProps) {
  const gradient = colorFor(name)
  const fontSize = Math.max(9, Math.round(size * 0.38))

  if (avatar) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={avatar}
        alt={name}
        title={name}
        className={`rounded-full object-cover flex-shrink-0 ${className}`}
        style={{ width: size, height: size }}
      />
    )
  }

  return (
    <div
      title={name}
      className={`rounded-full bg-gradient-to-br ${gradient} flex items-center justify-center font-bold text-white flex-shrink-0 ${className}`}
      style={{ width: size, height: size, fontSize }}
    >
      {name.charAt(0).toUpperCase()}
    </div>
  )
}
