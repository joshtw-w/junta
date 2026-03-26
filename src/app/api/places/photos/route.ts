import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const googlePlaceId = searchParams.get('googlePlaceId')

  if (!googlePlaceId) {
    return NextResponse.json({ error: 'googlePlaceId is required' }, { status: 400 })
  }

  const apiKey = process.env.GOOGLE_MAPS_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'API key not configured' }, { status: 500 })
  }

  try {
    const res = await fetch(
      `https://maps.googleapis.com/maps/api/place/details/json?place_id=${googlePlaceId}&fields=photos,name,rating,user_ratings_total,opening_hours,website,formatted_phone_number&key=${apiKey}`
    )
    const data = await res.json()

    if (data.status !== 'OK') {
      return NextResponse.json({ photos: [], details: null })
    }

    const r = data.result
    const photos = (r.photos || []).slice(0, 8).map((p: { photo_reference: string }) =>
      `https://maps.googleapis.com/maps/api/place/photo?maxwidth=1200&photo_reference=${p.photo_reference}&key=${apiKey}`
    )

    return NextResponse.json({
      photos,
      details: {
        rating: r.rating || null,
        totalRatings: r.user_ratings_total || null,
        openNow: r.opening_hours?.open_now ?? null,
        website: r.website || null,
        phone: r.formatted_phone_number || null,
      },
    })
  } catch (err) {
    console.error('Photos fetch error:', err)
    return NextResponse.json({ photos: [], details: null })
  }
}
