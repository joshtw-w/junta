import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      name: true,
      email: true,
      avatar: true,
      createdAt: true,
      _count: { select: { posts: true, groups: true, visits: true } },
      visits: {
        orderBy: { createdAt: 'desc' },
        include: {
          post: {
            include: {
              place: true,
              group: { select: { id: true, name: true } },
            },
          },
        },
      },
      posts: {
        orderBy: { createdAt: 'desc' },
        take: 20,
        include: {
          place: true,
          group: { select: { id: true, name: true } },
        },
      },
    },
  })

  return NextResponse.json(user)
}

export async function PATCH(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { name, avatar } = await request.json()

  const user = await prisma.user.update({
    where: { id: session.user.id },
    data: {
      ...(name && { name }),
      ...(avatar !== undefined && { avatar }),
    },
    select: { id: true, name: true, email: true, avatar: true },
  })

  return NextResponse.json(user)
}
