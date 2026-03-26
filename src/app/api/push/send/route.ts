import { NextRequest, NextResponse } from 'next/server'
import webpush from 'web-push'
import { prisma } from '@/lib/prisma'

webpush.setVapidDetails(
  'mailto:' + (process.env.VAPID_EMAIL || 'admin@junta.app'),
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '',
  process.env.VAPID_PRIVATE_KEY || ''
)

export async function POST(request: NextRequest) {
  const secret = request.headers.get('x-internal-secret')
  if (secret !== process.env.INTERNAL_SECRET) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const { userIds, title, body, url } = await request.json()

    const subs = await prisma.pushSubscription.findMany({
      where: userIds ? { userId: { in: userIds } } : {},
    })

    const payload = JSON.stringify({ title, body, url: url || '/' })

    const results = await Promise.allSettled(
      subs.map((sub) =>
        webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          payload
        ).catch(async (err) => {
          if (err.statusCode === 410) {
            await prisma.pushSubscription.delete({ where: { id: sub.id } })
          }
          throw err
        })
      )
    )

    const sent = results.filter((r) => r.status === 'fulfilled').length
    return NextResponse.json({ sent, total: subs.length })
  } catch (error) {
    console.error('Push send error:', error)
    return NextResponse.json({ error: 'Failed to send notifications' }, { status: 500 })
  }
}
