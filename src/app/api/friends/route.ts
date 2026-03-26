import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET /api/friends — my friends + pending requests
export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const [sent, received] = await Promise.all([
    prisma.friend.findMany({
      where: { userId: session.user.id },
      include: { friend: { select: { id: true, name: true, avatar: true } } },
    }),
    prisma.friend.findMany({
      where: { friendId: session.user.id },
      include: { user: { select: { id: true, name: true, avatar: true } } },
    }),
  ])

  const friends = [
    ...sent.filter((f) => f.status === 'accepted').map((f) => ({ ...f.friend, friendshipId: f.id })),
    ...received.filter((f) => f.status === 'accepted').map((f) => ({ ...f.user, friendshipId: f.id })),
  ]

  const pendingReceived = received
    .filter((f) => f.status === 'pending')
    .map((f) => ({ ...f.user, friendshipId: f.id }))

  const pendingSent = sent
    .filter((f) => f.status === 'pending')
    .map((f) => ({ ...f.friend, friendshipId: f.id }))

  return NextResponse.json({ friends, pendingReceived, pendingSent })
}

// POST /api/friends — send request
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { userId } = await request.json()
    if (userId === session.user.id) return NextResponse.json({ error: 'Cannot add yourself' }, { status: 400 })

    // Check if reverse already exists
    const existing = await prisma.friend.findFirst({
      where: {
        OR: [
          { userId: session.user.id, friendId: userId },
          { userId, friendId: session.user.id },
        ],
      },
    })
    if (existing) return NextResponse.json({ error: 'Request already exists' }, { status: 409 })

    const friendship = await prisma.friend.create({
      data: { userId: session.user.id, friendId: userId, status: 'pending' },
    })
    return NextResponse.json(friendship, { status: 201 })
  } catch (error) {
    console.error('Friend request error:', error)
    return NextResponse.json({ error: 'Failed to send request' }, { status: 500 })
  }
}

// PATCH /api/friends — accept or decline
export async function PATCH(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { friendshipId, action } = await request.json() // action: 'accept' | 'decline'

    const friendship = await prisma.friend.findUnique({ where: { id: friendshipId } })
    if (!friendship || friendship.friendId !== session.user.id) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    if (action === 'accept') {
      const updated = await prisma.friend.update({
        where: { id: friendshipId },
        data: { status: 'accepted' },
      })
      return NextResponse.json(updated)
    } else {
      await prisma.friend.delete({ where: { id: friendshipId } })
      return NextResponse.json({ success: true })
    }
  } catch (error) {
    console.error('Friend action error:', error)
    return NextResponse.json({ error: 'Failed to update friendship' }, { status: 500 })
  }
}

// DELETE /api/friends — unfriend
export async function DELETE(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { userId } = await request.json()
    await prisma.friend.deleteMany({
      where: {
        OR: [
          { userId: session.user.id, friendId: userId },
          { userId, friendId: session.user.id },
        ],
      },
    })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Unfriend error:', error)
    return NextResponse.json({ error: 'Failed to unfriend' }, { status: 500 })
  }
}
