'use client'

import { useState, useEffect, useCallback } from 'react'
import { GoogleMap, Marker, InfoWindow, useJsApiLoader } from '@react-google-maps/api'

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

interface MapViewProps {
  posts: Post[]
}

const MAP_STYLES = [
  { elementType: 'geometry', stylers: [{ color: '#1e293b' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#1e293b' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#94a3b8' }] },
  {
    featureType: 'administrative.locality',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#cbd5e1' }],
  },
  {
    featureType: 'poi',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#94a3b8' }],
  },
  {
    featureType: 'poi.park',
    elementType: 'geometry',
    stylers: [{ color: '#263340' }],
  },
  {
    featureType: 'road',
    elementType: 'geometry',
    stylers: [{ color: '#334155' }],
  },
  {
    featureType: 'road',
    elementType: 'geometry.stroke',
    stylers: [{ color: '#1e293b' }],
  },
  {
    featureType: 'road.highway',
    elementType: 'geometry',
    stylers: [{ color: '#475569' }],
  },
  {
    featureType: 'road.highway',
    elementType: 'geometry.stroke',
    stylers: [{ color: '#1e293b' }],
  },
  {
    featureType: 'transit',
    elementType: 'geometry',
    stylers: [{ color: '#263340' }],
  },
  {
    featureType: 'water',
    elementType: 'geometry',
    stylers: [{ color: '#0f172a' }],
  },
  {
    featureType: 'water',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#475569' }],
  },
]

const containerStyle = {
  width: '100%',
  height: '100%',
}

function getMapCenter(posts: Post[]): { lat: number; lng: number } {
  if (posts.length === 0) return { lat: 35.6762, lng: 139.6503 }

  const avgLat = posts.reduce((sum, p) => sum + p.place.lat, 0) / posts.length
  const avgLng = posts.reduce((sum, p) => sum + p.place.lng, 0) / posts.length
  return { lat: avgLat, lng: avgLng }
}

export default function MapView({ posts }: MapViewProps) {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || ''
  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: apiKey,
  })

  const [selectedPost, setSelectedPost] = useState<Post | null>(null)
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [map, setMap] = useState<google.maps.Map | null>(null)

  const center = getMapCenter(posts)

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          })
        },
        () => {
          // Permission denied or error — silently ignore
        }
      )
    }
  }, [])

  const fitBounds = useCallback(() => {
    if (!map || posts.length === 0) return

    const bounds = new window.google.maps.LatLngBounds()
    posts.forEach((post) => {
      bounds.extend({ lat: post.place.lat, lng: post.place.lng })
    })
    if (userLocation) {
      bounds.extend(userLocation)
    }
    map.fitBounds(bounds, { top: 60, right: 60, bottom: 60, left: 60 })
  }, [map, posts, userLocation])

  useEffect(() => {
    if (map && posts.length > 0) {
      fitBounds()
    }
  }, [map, fitBounds, posts.length])

  const onLoad = useCallback((mapInstance: google.maps.Map) => {
    setMap(mapInstance)
  }, [])

  const onUnmount = useCallback(() => {
    setMap(null)
  }, [])

  if (!isLoaded) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-slate-900">
        <div className="w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!apiKey) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-slate-900 p-8">
        <div className="text-center max-w-sm">
          <div className="w-16 h-16 bg-slate-800 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
            </svg>
          </div>
          <h3 className="text-white font-semibold mb-2">Google Maps API Key Required</h3>
          <p className="text-slate-400 text-sm">
            Add your <code className="text-teal-400 bg-slate-800 px-1 rounded">NEXT_PUBLIC_GOOGLE_MAPS_API_KEY</code> to your .env file to enable the map view.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full h-[calc(100vh-120px)] relative">
      <GoogleMap
        mapContainerStyle={containerStyle}
        center={center}
        zoom={posts.length === 1 ? 15 : 12}
        onLoad={onLoad}
        onUnmount={onUnmount}
        options={{
          styles: MAP_STYLES,
          disableDefaultUI: false,
          zoomControl: true,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: true,
          gestureHandling: 'greedy',
        }}
        onClick={() => setSelectedPost(null)}
      >
        {/* Place markers */}
        {posts.map((post) => (
          <Marker
            key={post.id}
            position={{ lat: post.place.lat, lng: post.place.lng }}
            onClick={() => setSelectedPost(post)}
            icon={{
              path: 'M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z',
              fillColor: '#0d9488',
              fillOpacity: 1,
              strokeColor: '#fff',
              strokeWeight: 1.5,
              scale: 1.6,
              anchor: new window.google.maps.Point(12, 22),
            }}
          />
        ))}

        {/* User location marker */}
        {userLocation && (
          <Marker
            position={userLocation}
            icon={{
              path: window.google.maps.SymbolPath.CIRCLE,
              fillColor: '#3b82f6',
              fillOpacity: 1,
              strokeColor: '#fff',
              strokeWeight: 2,
              scale: 8,
            }}
            title="Your location"
            zIndex={999}
          />
        )}

        {/* Info window */}
        {selectedPost && (
          <InfoWindow
            position={{ lat: selectedPost.place.lat, lng: selectedPost.place.lng }}
            onCloseClick={() => setSelectedPost(null)}
            options={{ pixelOffset: new window.google.maps.Size(0, -35) }}
          >
            <div className="bg-slate-800 rounded-xl overflow-hidden max-w-[220px]" style={{ fontFamily: 'Inter, sans-serif' }}>
              {selectedPost.place.imageUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={selectedPost.place.imageUrl}
                  alt={selectedPost.place.name}
                  className="w-full h-28 object-cover"
                  style={{ display: 'block' }}
                />
              )}
              <div style={{ padding: '10px' }}>
                <p style={{ fontWeight: 600, color: '#fff', fontSize: '13px', margin: '0 0 2px' }}>
                  {selectedPost.place.name}
                </p>
                <p style={{ color: '#94a3b8', fontSize: '11px', margin: '0 0 6px', lineHeight: 1.4 }}>
                  {selectedPost.place.address}
                </p>
                {selectedPost.note && (
                  <p style={{ color: '#cbd5e1', fontSize: '11px', margin: '0 0 6px', fontStyle: 'italic', borderLeft: '2px solid #0d9488', paddingLeft: '6px' }}>
                    &ldquo;{selectedPost.note}&rdquo;
                  </p>
                )}
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <div style={{ width: '18px', height: '18px', borderRadius: '50%', background: 'linear-gradient(135deg, #2dd4bf, #0d9488)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 600, color: '#fff', flexShrink: 0 }}>
                    {selectedPost.user.name.charAt(0).toUpperCase()}
                  </div>
                  <span style={{ color: '#94a3b8', fontSize: '11px' }}>
                    Added by {selectedPost.user.name}
                  </span>
                </div>
              </div>
            </div>
          </InfoWindow>
        )}
      </GoogleMap>

      {/* Legend */}
      <div className="absolute bottom-6 left-4 bg-slate-900/90 backdrop-blur border border-slate-700 rounded-xl px-4 py-3 flex items-center gap-4 text-xs text-slate-400">
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-teal-500 inline-block" />
          Places
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-blue-500 inline-block" />
          You
        </span>
        <span className="text-slate-500">{posts.length} spot{posts.length !== 1 ? 's' : ''}</span>
      </div>
    </div>
  )
}
