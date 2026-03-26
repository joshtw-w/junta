import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// Toggle vote on a post
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { postId } = await request.json()
  if (!postId) {
    return NextResponse.json({ error: 'postId is required' }, { status: 400 })
  }

  const existing = await prisma.vote.findUnique({
    where: { userId_postId: { userId: session.user.id, postId } },
  })

  if (existing) {
    await prisma.vote.delete({ where: { id: existing.id } })
  } else {
    await prisma.vote.create({
      data: { userId: session.user.id, postId },
    })
  }

  // Return updated vote list for this post
  const votes = await prisma.vote.findMany({
    where: { postId },
    include: { user: { select: { id: true, name: true, avatar: true } } },
    orderBy: { createdAt: 'asc' },
  })

  return NextResponse.json({ votes, voted: !existing })
}

// Get votes for posts in a group
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const groupId = searchParams.get('groupId')
  if (!groupId) {
    return NextResponse.json({ error: 'groupId is required' }, { status: 400 })
  }

  const votes = await prisma.vote.findMany({
    where: { post: { groupId } },
    include: { user: { select: { id: true, name: true, avatar: true } } },
  })

  // Group votes by postId
  const byPost: Record<string, Array<{ id: string; name: string; avatar: string | null }>> = {}
  for (const vote of votes) {
    if (!byPost[vote.postId]) byPost[vote.postId] = []
    byPost[vote.postId].push(vote.user)
  }

  return NextResponse.json(byPost)
}
