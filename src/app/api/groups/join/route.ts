import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { inviteCode } = body

    if (!inviteCode) {
      return NextResponse.json(
        { error: 'Invite code is required' },
        { status: 400 }
      )
    }

    const group = await prisma.group.findUnique({
      where: { inviteCode: inviteCode.toUpperCase() },
      include: {
        _count: {
          select: { members: true },
        },
      },
    })

    if (!group) {
      return NextResponse.json(
        { error: 'Invalid invite code' },
        { status: 404 }
      )
    }

    const existingMembership = await prisma.groupMember.findUnique({
      where: {
        userId_groupId: {
          userId: session.user.id,
          groupId: group.id,
        },
      },
    })

    if (existingMembership) {
      return NextResponse.json(
        { error: 'You are already a member of this group', groupId: group.id },
        { status: 409 }
      )
    }

    await prisma.groupMember.create({
      data: {
        userId: session.user.id,
        groupId: group.id,
        role: 'member',
      },
    })

    return NextResponse.json({ groupId: group.id, groupName: group.name })
  } catch (error) {
    console.error('Join group error:', error)
    return NextResponse.json(
      { error: 'Failed to join group' },
      { status: 500 }
    )
  }
}
