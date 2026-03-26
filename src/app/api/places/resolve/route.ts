import { NextRequest, NextResponse } from 'next/server'

// Follow a short URL to its final destination
async function resolveShortUrl(url: string): Promise<string> {
  const res = await fetch(url, {
    method: 'GET',
    redirect: 'follow',
    headers: { 'User-Agent': 'Mozilla/5.0' },
  })
  return res.url
}

interface ParsedUrl {
  placeId?: string
  lat?: number
  lng?: number
  query?: string
}

function parseGoogleMapsUrl(url: string): ParsedUrl {
  try {
    const u = new URL(url)

    // Extract place_id from data parameter — pattern !1sChIJ...
    const placeIdMatch = url.match(/!1s(ChIJ[A-Za-z0-9_\-]+)/)
    if (placeIdMatch) return { placeId: placeIdMatch[1] }

    // CID-based link: ?cid=...
    const cid = u.searchParams.get('cid')
    if (cid) {
      // CID is not the same as place_id but we can use Find Place by CID
      return { query: `cid:${cid}` }
    }

    // Coordinates: @lat,lng in pathname
    const coordMatch = u.pathname.match(/@(-?\d+\.?\d*),(-?\d+\.?\d*)/)
    if (coordMatch) {
      const lat = parseFloat(coordMatch[1])
      const lng = parseFloat(coordMatch[2])

      // Try to extract place name from path /place/NAME/@...
      const pathParts = u.pathname.split('/')
      const placeIndex = pathParts.indexOf('place')
      if (placeIndex >= 0 && pathParts[placeIndex + 1]) {
        const rawName = pathParts[placeIndex + 1]
        if (!rawName.startsWith('@')) {
          const name = decodeURIComponent(rawName).replace(/\+/g, ' ')
          return { lat, lng, query: name }
        }
      }
      return { lat, lng }
    }

    // ?q= query param
    const q = u.searchParams.get('q')
    if (q) return { query: q }

    // Path-based: /place/NAME
    const pathMatch = u.pathname.match(/\/place\/([^/@]+)/)
    if (pathMatch) {
      const name = decodeURIComponent(pathMatch[1]).replace(/\+/g, ' ')
      if (name) return { query: name }
    }
  } catch {
    // ignore parse errors
  }
  return {}
}

interface PlaceData {
  name: string
  address: string
  lat: number
  lng: number
  placeId: string
  photoUrl: string | null
}

async function placeDetails(placeId: string, apiKey: string): Promise<PlaceData | null> {
  const res = await fetch(
    `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=name,formatted_address,geometry,photos,place_id&key=${apiKey}`
  )
  const data = await res.json()
  if (data.status !== 'OK') return null
  const r = data.result
  let photoUrl: string | null = null
  if (r.photos?.length > 0) {
    photoUrl = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=800&photo_reference=${r.photos[0].photo_reference}&key=${apiKey}`
  }
  return {
    name: r.name,
    address: r.formatted_address,
    lat: r.geometry.location.lat,
    lng: r.geometry.location.lng,
    placeId: r.place_id,
    photoUrl,
  }
}

async function textSearch(query: string, apiKey: string, location?: string): Promise<PlaceData | null> {
  let url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(query)}&key=${apiKey}`
  if (location) url += `&location=${location}&radius=200`

  const res = await fetch(url)
  const data = await res.json()
  if (data.status !== 'OK' || !data.results?.length) return null

  const r = data.results[0]
  let photoUrl: string | null = null
  if (r.photos?.length > 0) {
    photoUrl = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=800&photo_reference=${r.photos[0].photo_reference}&key=${apiKey}`
  }
  return {
    name: r.name,
    address: r.formatted_address,
    lat: r.geometry.location.lat,
    lng: r.geometry.location.lng,
    placeId: r.place_id,
    photoUrl,
  }
}

async function reverseGeocode(lat: number, lng: number, apiKey: string): Promise<PlaceData | null> {
  const res = await fetch(
    `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${apiKey}`
  )
  const data = await res.json()
  if (data.status !== 'OK' || !data.results?.length) return null
  const r = data.results[0]
  return {
    name: r.address_components?.[0]?.long_name || r.formatted_address.split(',')[0],
    address: r.formatted_address,
    lat,
    lng,
    placeId: r.place_id,
    photoUrl: null,
  }
}

export async function POST(request: NextRequest) {
  let body: { url?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const rawUrl = body.url?.trim()
  if (!rawUrl) {
    return NextResponse.json({ error: 'URL is required' }, { status: 400 })
  }

  const apiKey = process.env.GOOGLE_MAPS_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'Google Maps API key not configured' }, { status: 500 })
  }

  // Validate it looks like a URL
  if (!rawUrl.startsWith('http')) {
    return NextResponse.json({ error: 'Please paste a valid Google Maps link.' }, { status: 400 })
  }

  let resolvedUrl = rawUrl

  // Follow short links to get the full URL
  const isShortLink =
    rawUrl.includes('maps.app.goo.gl') ||
    rawUrl.includes('goo.gl/maps') ||
    rawUrl.includes('g.co/maps')

  if (isShortLink) {
    try {
      resolvedUrl = await resolveShortUrl(rawUrl)
    } catch {
      return NextResponse.json({ error: 'Failed to follow short URL. Try the full Google Maps link instead.' }, { status: 400 })
    }
  }

  const parsed = parseGoogleMapsUrl(resolvedUrl)

  if (!parsed.placeId && parsed.lat === undefined && !parsed.query) {
    return NextResponse.json(
      { error: 'Could not extract place info from this link. Try copying the full URL from your browser.' },
      { status: 400 }
    )
  }

  try {
    let result: PlaceData | null = null

    // 1. Direct place_id — most reliable
    if (parsed.placeId) {
      result = await placeDetails(parsed.placeId, apiKey)
    }

    // 2. Coordinates + query — search near the pin
    if (!result && parsed.lat !== undefined && parsed.lng !== undefined) {
      if (parsed.query) {
        result = await textSearch(parsed.query, apiKey, `${parsed.lat},${parsed.lng}`)
      }
      // Fallback: reverse geocode the pin
      if (!result) {
        result = await reverseGeocode(parsed.lat, parsed.lng, apiKey)
      }
    }

    // 3. Query string only
    if (!result && parsed.query) {
      result = await textSearch(parsed.query, apiKey)
    }

    if (!result) {
      return NextResponse.json(
        { error: 'Could not find a place from this link. Try searching by name instead.' },
        { status: 404 }
      )
    }

    return NextResponse.json(result)
  } catch (err) {
    console.error('Place resolve error:', err)
    return NextResponse.json({ error: 'Failed to resolve place. Please try again.' }, { status: 500 })
  }
}
