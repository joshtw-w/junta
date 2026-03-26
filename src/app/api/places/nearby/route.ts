import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const lat = request.nextUrl.searchParams.get('lat')
  const lng = request.nextUrl.searchParams.get('lng')

  if (!lat || !lng) {
    return NextResponse.json({ error: 'lat and lng required' }, { status: 400 })
  }

  const apiKey = process.env.GOOGLE_MAPS_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'Maps API not configured' }, { status: 500 })
  }

  try {
    const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lng}&radius=1500&type=restaurant&key=${apiKey}`
    const res = await fetch(url)
    const data = await res.json()

    if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
      return NextResponse.json({ error: 'Places API error' }, { status: 500 })
    }

    const places = (data.results || []).slice(0, 20).map((p: {
      place_id: string
      name: string
      vicinity: string
      geometry: { location: { lat: number; lng: number } }
      photos?: Array<{ photo_reference: string }>
      rating?: number
    }) => ({
      placeId: p.place_id,
      name: p.name,
      address: p.vicinity,
      lat: p.geometry.location.lat,
      lng: p.geometry.location.lng,
      photoUrl: p.photos?.[0]
        ? `https://maps.googleapis.com/maps/api/place/photo?maxwidth=200&photoreference=${p.photos[0].photo_reference}&key=${apiKey}`
        : null,
      rating: p.rating || null,
      distance: null,
    }))

    return NextResponse.json(places)
  } catch (error) {
    console.error('Nearby places error:', error)
    return NextResponse.json({ error: 'Failed to fetch nearby places' }, { status: 500 })
  }
}
