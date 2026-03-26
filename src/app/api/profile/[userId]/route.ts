import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(
  _request: NextRequest,
  { params }: { params: { userId: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const [user, friendship] = await Promise.all([
    prisma.user.findUnique({
      where: { id: params.userId },
      select: {
        id: true,
        name: true,
        avatar: true,
        createdAt: true,
        _count: { select: { posts: true, visits: true } },
        posts: {
          orderBy: { createdAt: 'desc' },
          take: 20,
          include: {
            place: true,
            group: { select: { id: true, name: true } },
          },
        },
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
        groups: {
          select: { groupId: true },
        },
      },
    }),
    prisma.friend.findFirst({
      where: {
        OR: [
          { userId: session.user.id, friendId: params.userId },
          { userId: params.userId, friendId: session.user.id },
        ],
      },
    }),
  ])

  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  // Shared stats — only computed if they are friends or same group
  const myGroups = await prisma.groupMember.findMany({
    where: { userId: session.user.id },
    select: { groupId: true },
  })
  const myGroupIds = myGroups.map((g) => g.groupId)
  const theirGroupIdSet = new Set(user.groups.map((g) => g.groupId))
  const sharedGroupIds = myGroupIds.filter((id) => theirGroupIdSet.has(id))

  // Places we've both visited
  const myVisitedPostIds = await prisma.visit.findMany({
    where: { userId: session.user.id },
    select: { postId: true },
  })
  const myVisitedSet = new Set(myVisitedPostIds.map((v) => v.postId))
  const sharedVisits = user.visits.filter((v) => myVisitedSet.has(v.postId))

  // Places we both want to go (both voted on)
  const myVotedPostIds = await prisma.vote.findMany({
    where: { userId: session.user.id },
    select: { postId: true },
  })
  const myVotedSet = new Set(myVotedPostIds.map((v) => v.postId))
  const theirVotes = await prisma.vote.findMany({
    where: { userId: params.userId },
    select: { postId: true, post: { select: { place: true, group: { select: { id: true, name: true } } } } },
  })
  const sharedWantToGo = theirVotes.filter((v) => myVotedSet.has(v.postId))

  // Friendship status
  let friendStatus: 'none' | 'pending_sent' | 'pending_received' | 'friends' = 'none'
  if (friendship) {
    if (friendship.status === 'accepted') friendStatus = 'friends'
    else if (friendship.userId === session.user.id) friendStatus = 'pending_sent'
    else friendStatus = 'pending_received'
  }

  return NextResponse.json({
    user: {
      id: user.id,
      name: user.name,
      avatar: user.avatar,
      createdAt: user.createdAt,
      _count: user._count,
    },
    posts: user.posts,
    visits: user.visits,
    sharedGroupIds,
    sharedVisits: sharedVisits.map((v) => v.post),
    sharedWantToGo: sharedWantToGo.map((v) => v.post),
    friendStatus,
    friendshipId: friendship?.id || null,
  })
}
