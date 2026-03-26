import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const query = searchParams.get('query')
  const location = searchParams.get('location')

  if (!query) {
    return NextResponse.json(
      { error: 'Query parameter is required' },
      { status: 400 }
    )
  }

  const apiKey = process.env.GOOGLE_MAPS_API_KEY

  if (!apiKey) {
    return NextResponse.json(
      { error: 'Google Maps API key not configured' },
      { status: 500 }
    )
  }

  try {
    let url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(query)}&key=${apiKey}`

    if (location) {
      url += `&location=${location}&radius=50000`
    }

    const response = await fetch(url)
    const data = await response.json()

    if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
      console.error('Google Places API error:', data.status, data.error_message)
      return NextResponse.json(
        { error: `Google Places API error: ${data.status}` },
        { status: 500 }
      )
    }

    const results = (data.results || []).slice(0, 10).map((place: {
      place_id: string;
      name: string;
      formatted_address: string;
      geometry: { location: { lat: number; lng: number } };
      photos?: Array<{ photo_reference: string }>;
    }) => {
      let photoUrl: string | null = null
      if (place.photos && place.photos.length > 0) {
        const photoRef = place.photos[0].photo_reference
        photoUrl = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=800&photo_reference=${photoRef}&key=${apiKey}`
      }

      return {
        placeId: place.place_id,
        name: place.name,
        address: place.formatted_address,
        lat: place.geometry.location.lat,
        lng: place.geometry.location.lng,
        photoUrl,
      }
    })

    return NextResponse.json(results)
  } catch (error) {
    console.error('Places search error:', error)
    return NextResponse.json(
      { error: 'Failed to search places' },
      { status: 500 }
    )
  }
}
