'use client'

import { useState, useRef } from 'react'
import PlaceSearch from './PlaceSearch'

interface PlaceResult {
  placeId: string
  name: string
  address: string
  lat: number
  lng: number
  photoUrl: string | null
}

interface Post {
  id: string
  note: string | null
  createdAt: string
  place: {
    id: string
    name: string
    address: string
    lat: number
    lng: number
    imageUrl: string | null
  }
  user: {
    id: string
    name: string
    avatar: string | null
  }
}

interface AddPostModalProps {
  groupId: string
  onClose: () => void
  onPostAdded: (post: {
    id: string
    note: string | null
    createdAt: string
    place: {
      id: string
      name: string
      address: string
      lat: number
      lng: number
      imageUrl: string | null
      googlePlaceId: string | null
    }
    user: { id: string; name: string; avatar: string | null }
  }) => void
}

export default function AddPostModal({ groupId, onClose, onPostAdded }: AddPostModalProps) {
  const [selectedPlace, setSelectedPlace] = useState<PlaceResult | null>(null)
  const [note, setNote] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  // Google Maps link paste state
  const [mapsLink, setMapsLink] = useState('')
  const [isResolvingLink, setIsResolvingLink] = useState(false)
  const [linkError, setLinkError] = useState('')
  const linkInputRef = useRef<HTMLInputElement>(null)

  const resolveGoogleMapsLink = async (url: string) => {
    if (!url.trim()) return
    setIsResolvingLink(true)
    setLinkError('')
    setSelectedPlace(null)

    try {
      const res = await fetch('/api/places/resolve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: url.trim() }),
      })
      const data = await res.json()

      if (!res.ok) {
        setLinkError(data.error || 'Could not resolve link.')
        return
      }

      setSelectedPlace({
        placeId: data.placeId,
        name: data.name,
        address: data.address,
        lat: data.lat,
        lng: data.lng,
        photoUrl: data.photoUrl,
      })
    } catch {
      setLinkError('Failed to resolve link. Please try again.')
    } finally {
      setIsResolvingLink(false)
    }
  }

  const handleLinkPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const pasted = e.clipboardData.getData('text').trim()
    if (pasted.startsWith('http')) {
      setMapsLink(pasted)
      // Slight delay to let state update before resolving
      setTimeout(() => resolveGoogleMapsLink(pasted), 0)
    }
  }

  const handleLinkChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    setMapsLink(val)
    if (!val) {
      setLinkError('')
      setSelectedPlace(null)
    }
  }

  const handleLinkKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      resolveGoogleMapsLink(mapsLink)
    }
  }

  const clearSelected = () => {
    setSelectedPlace(null)
    setMapsLink('')
    setLinkError('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedPlace) {
      setError('Please select a place first')
      return
    }

    setError('')
    setIsSubmitting(true)

    try {
      const res = await fetch(`/api/groups/${groupId}/posts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          place: {
            name: selectedPlace.name,
            googlePlaceId: selectedPlace.placeId,
            lat: selectedPlace.lat,
            lng: selectedPlace.lng,
            address: selectedPlace.address,
            imageUrl: selectedPlace.photoUrl,
          },
          note: note.trim() || undefined,
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Failed to add place')
        return
      }

      onPostAdded(data)
    } catch {
      setError('An error occurred. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div
      className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-0 sm:p-4"
      onClick={onClose}
    >
      <div
        className="bg-slate-800 rounded-t-3xl sm:rounded-2xl w-full sm:max-w-md border border-slate-700 overflow-hidden max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-700 flex-shrink-0">
          <h2 className="text-base font-semibold text-white">Add a Place</h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-700 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="overflow-y-auto flex-1">
          <form onSubmit={handleSubmit}>
            <div className="p-5 space-y-4">
              {error && (
                <div className="bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl p-3 text-sm">
                  {error}
                </div>
              )}

              {/* ── Google Maps link paste ── */}
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wide">
                  Paste a Google Maps link
                </label>
                <div className="relative flex items-center">
                  {/* Link icon */}
                  <div className="absolute left-3 text-slate-500 pointer-events-none">
                    {isResolvingLink ? (
                      <svg className="w-4 h-4 animate-spin text-teal-400" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                      </svg>
                    ) : (
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                      </svg>
                    )}
                  </div>
                  <input
                    ref={linkInputRef}
                    type="text"
                    value={mapsLink}
                    onChange={handleLinkChange}
                    onPaste={handleLinkPaste}
                    onKeyDown={handleLinkKeyDown}
                    placeholder="https://maps.app.goo.gl/..."
                    className="w-full bg-slate-900 border border-slate-600 rounded-xl pl-10 pr-9 py-3 text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm"
                  />
                  {mapsLink && !isResolvingLink && (
                    <button
                      type="button"
                      onClick={() => { setMapsLink(''); setLinkError(''); if (!selectedPlace?.photoUrl) setSelectedPlace(null) }}
                      className="absolute right-3 text-slate-500 hover:text-white"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>
                {linkError && (
                  <p className="text-red-400 text-xs mt-1.5 px-1">{linkError}</p>
                )}
                {mapsLink && !isResolvingLink && !selectedPlace && !linkError && (
                  <button
                    type="button"
                    onClick={() => resolveGoogleMapsLink(mapsLink)}
                    className="mt-2 text-xs text-teal-400 hover:text-teal-300 transition-colors"
                  >
                    Resolve link →
                  </button>
                )}
              </div>

              {/* ── Divider ── */}
              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-slate-700" />
                <span className="text-xs text-slate-500 font-medium">or search by name</span>
                <div className="flex-1 h-px bg-slate-700" />
              </div>

              {/* ── Search ── */}
              <div>
                <PlaceSearch
                  onSelect={(place) => { setSelectedPlace(place); setMapsLink(''); setLinkError('') }}
                  placeholder="Search restaurants, cafes, bars..."
                />
              </div>

              {/* ── Selected place preview ── */}
              {selectedPlace && (
                <div className="bg-slate-900/60 rounded-xl overflow-hidden border border-teal-500/30">
                  {selectedPlace.photoUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={selectedPlace.photoUrl}
                      alt={selectedPlace.name}
                      className="w-full h-36 object-cover"
                    />
                  )}
                  <div className="p-3 flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-semibold text-white text-sm leading-snug">{selectedPlace.name}</p>
                      <p className="text-slate-400 text-xs mt-0.5 line-clamp-1">{selectedPlace.address}</p>
                    </div>
                    <button
                      type="button"
                      onClick={clearSelected}
                      className="text-slate-500 hover:text-white flex-shrink-0 mt-0.5"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>
              )}

              {/* ── Note ── */}
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wide">
                  Note <span className="text-slate-600 normal-case tracking-normal">(optional)</span>
                </label>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={2}
                  maxLength={500}
                  className="w-full bg-slate-900 border border-slate-600 rounded-xl px-4 py-3 text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm resize-none"
                  placeholder="Why do you recommend this place?"
                />
              </div>
            </div>

            {/* Footer */}
            <div className="px-5 py-4 border-t border-slate-700 flex gap-3 flex-shrink-0">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2.5 border border-slate-600 hover:border-slate-500 text-slate-400 hover:text-white rounded-xl text-sm transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !selectedPlace}
                className="flex-1 py-2.5 bg-teal-600 hover:bg-teal-500 text-white font-semibold rounded-xl text-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                    </svg>
                    Adding...
                  </span>
                ) : 'Add to Feed'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
