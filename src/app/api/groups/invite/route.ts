import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET — return groups the current user is in (for the group picker)
export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const memberships = await prisma.groupMember.findMany({
    where: { userId: session.user.id },
    include: { group: { select: { id: true, name: true, inviteCode: true } } },
  })

  return NextResponse.json(memberships.map((m) => m.group))
}

// POST — send a group invite link to a friend (returns the invite link, frontend can share it)
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { groupId, friendId } = await request.json()

    // Verify friendship exists
    const friendship = await prisma.friend.findFirst({
      where: {
        status: 'accepted',
        OR: [
          { userId: session.user.id, friendId },
          { userId: friendId, friendId: session.user.id },
        ],
      },
    })
    if (!friendship) return NextResponse.json({ error: 'Not friends' }, { status: 403 })

    // Verify caller is in the group
    const membership = await prisma.groupMember.findUnique({
      where: { userId_groupId: { userId: session.user.id, groupId } },
      include: { group: { select: { id: true, name: true, inviteCode: true } } },
    })
    if (!membership) return NextResponse.json({ error: 'Not in this group' }, { status: 403 })

    // Check if friend is already in the group
    const alreadyMember = await prisma.groupMember.findUnique({
      where: { userId_groupId: { userId: friendId, groupId } },
    })
    if (alreadyMember) return NextResponse.json({ error: 'Already a member' }, { status: 409 })

    return NextResponse.json({
      inviteCode: membership.group.inviteCode,
      groupName: membership.group.name,
    })
  } catch (error) {
    console.error('Invite error:', error)
    return NextResponse.json({ error: 'Failed to generate invite' }, { status: 500 })
  }
}
