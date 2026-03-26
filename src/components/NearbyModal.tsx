'use client'

import { useState, useEffect } from 'react'

interface NearbyPlace {
  placeId: string
  name: string
  address: string
  lat: number
  lng: number
  photoUrl: string | null
  rating: number | null
  distance: number | null
}

interface NearbyModalProps {
  groupId: string
  onAddPlace: (place: { name: string; googlePlaceId: string; lat: number; lng: number; address: string; imageUrl: string | null }) => void
  onClose: () => void
}

function getDistanceKm(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

export default function NearbyModal({ onAddPlace, onClose }: NearbyModalProps) {
  const [places, setPlaces] = useState<NearbyPlace[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [userLoc, setUserLoc] = useState<{ lat: number; lng: number } | null>(null)
  const [added, setAdded] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (!navigator.geolocation) {
      setError('Location not supported on this device')
      setLoading(false)
      return
    }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude }
        setUserLoc(loc)
        try {
          const res = await fetch(`/api/places/nearby?lat=${loc.lat}&lng=${loc.lng}`)
          if (!res.ok) throw new Error()
          const data: NearbyPlace[] = await res.json()
          const withDist = data.map((p) => ({
            ...p,
            distance: getDistanceKm(loc.lat, loc.lng, p.lat, p.lng),
          }))
          setPlaces(withDist)
        } catch {
          setError('Failed to load nearby places')
        } finally {
          setLoading(false)
        }
      },
      () => {
        setError('Allow location access to see nearby places')
        setLoading(false)
      }
    )
  }, [])

  const handleAdd = (p: NearbyPlace) => {
    onAddPlace({ name: p.name, googlePlaceId: p.placeId, lat: p.lat, lng: p.lng, address: p.address, imageUrl: p.photoUrl })
    setAdded((prev) => new Set(prev).add(p.placeId))
  }

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
            <h2 className="text-white font-semibold text-lg">Nearby Places</h2>
            <p className="text-slate-400 text-xs mt-0.5">{userLoc ? 'Restaurants near you' : 'Finding your location...'}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="overflow-y-auto" style={{ maxHeight: 'calc(85vh - 72px)' }}>
          {loading && (
            <div className="flex items-center justify-center py-16">
              <div className="w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
            </div>
          )}
          {error && (
            <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
              <div className="text-3xl mb-3">📍</div>
              <p className="text-slate-400 text-sm">{error}</p>
            </div>
          )}
          {!loading && !error && places.map((p) => (
            <div key={p.placeId} className="flex items-center gap-3 px-4 py-3 border-b border-slate-800/60 last:border-0">
              {p.photoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={p.photoUrl} alt={p.name} className="w-12 h-12 rounded-xl object-cover flex-shrink-0" />
              ) : (
                <div className="w-12 h-12 rounded-xl bg-slate-800 flex items-center justify-center flex-shrink-0">
                  <span className="text-xl">🍽️</span>
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm font-medium truncate">{p.name}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  {p.rating && <span className="text-amber-400 text-xs">★ {p.rating}</span>}
                  {p.distance !== null && (
                    <span className="text-slate-400 text-xs">
                      {p.distance < 1 ? `${Math.round(p.distance * 1000)}m` : `${p.distance.toFixed(1)}km`}
                    </span>
                  )}
                </div>
              </div>
              <button
                onClick={() => handleAdd(p)}
                disabled={added.has(p.placeId)}
                className="flex-shrink-0 px-3 py-1.5 bg-teal-600 hover:bg-teal-500 disabled:bg-slate-700 disabled:text-slate-500 text-white rounded-lg text-xs font-medium transition-colors"
              >
                {added.has(p.placeId) ? 'Added' : 'Add'}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
