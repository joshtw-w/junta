import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

function generateInviteCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let result = ''
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

export async function GET() {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const groups = await prisma.group.findMany({
    where: {
      members: {
        some: {
          userId: session.user.id,
        },
      },
    },
    include: {
      members: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      },
      _count: {
        select: {
          posts: true,
          members: true,
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  })

  return NextResponse.json(groups)
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { name, description } = body

    if (!name || name.trim().length === 0) {
      return NextResponse.json(
        { error: 'Group name is required' },
        { status: 400 }
      )
    }

    let inviteCode = generateInviteCode()
    let codeExists = await prisma.group.findUnique({ where: { inviteCode } })
    while (codeExists) {
      inviteCode = generateInviteCode()
      codeExists = await prisma.group.findUnique({ where: { inviteCode } })
    }

    const group = await prisma.group.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        inviteCode,
        members: {
          create: {
            userId: session.user.id,
            role: 'admin',
          },
        },
      },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
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

    return NextResponse.json(group, { status: 201 })
  } catch (error) {
    console.error('Create group error:', error)
    return NextResponse.json(
      { error: 'Failed to create group' },
      { status: 500 }
    )
  }
}
