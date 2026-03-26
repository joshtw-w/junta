import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// Toggle visited status for a post
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { postId } = await request.json()
  if (!postId) {
    return NextResponse.json({ error: 'postId is required' }, { status: 400 })
  }

  const existing = await prisma.visit.findUnique({
    where: { userId_postId: { userId: session.user.id, postId } },
  })

  if (existing) {
    await prisma.visit.delete({ where: { id: existing.id } })
    return NextResponse.json({ visited: false })
  } else {
    await prisma.visit.create({
      data: { userId: session.user.id, postId },
    })
    return NextResponse.json({ visited: true })
  }
}

// Get all visited post IDs for current user in a group
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const groupId = searchParams.get('groupId')

  const visits = await prisma.visit.findMany({
    where: {
      userId: session.user.id,
      ...(groupId ? { post: { groupId } } : {}),
    },
    select: { postId: true },
  })

  return NextResponse.json(visits.map((v: { postId: string }) => v.postId))
}
