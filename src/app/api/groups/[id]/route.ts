import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const group = await prisma.group.findUnique({
    where: { id: params.id },
    include: {
      members: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              avatar: true,
            },
          },
        },
        orderBy: {
          joinedAt: 'asc',
        },
      },
      _count: {
        select: {
          posts: true,
          members: true,
        },
      },
    },
  })

  if (!group) {
    return NextResponse.json({ error: 'Group not found' }, { status: 404 })
  }

  const isMember = group.members.some(
    (member) => member.userId === session.user.id
  )

  if (!isMember) {
    return NextResponse.json(
      { error: 'You are not a member of this group' },
      { status: 403 }
    )
  }

  return NextResponse.json(group)
}
