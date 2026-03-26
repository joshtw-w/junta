import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

const PAGE_SIZE = 50

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const membership = await prisma.groupMember.findUnique({
    where: {
      userId_groupId: {
        userId: session.user.id,
        groupId: params.id,
      },
    },
  })

  if (!membership) {
    return NextResponse.json(
      { error: 'You are not a member of this group' },
      { status: 403 }
    )
  }

  const cursor = request.nextUrl.searchParams.get('cursor')

  const posts = await prisma.post.findMany({
    where: { groupId: params.id },
    include: {
      place: true,
      user: {
        select: {
          id: true,
          name: true,
          avatar: true,
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
    take: PAGE_SIZE + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
  })

  const hasMore = posts.length > PAGE_SIZE
  const items = hasMore ? posts.slice(0, PAGE_SIZE) : posts
  const nextCursor = hasMore ? items[items.length - 1].id : null

  return NextResponse.json({ posts: items, nextCursor })
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const membership = await prisma.groupMember.findUnique({
    where: {
      userId_groupId: {
        userId: session.user.id,
        groupId: params.id,
      },
    },
  })

  if (!membership) {
    return NextResponse.json(
      { error: 'You are not a member of this group' },
      { status: 403 }
    )
  }

  try {
    const body = await request.json()
    const { placeId, note, place } = body

    if (note && note.trim().length > 500) {
      return NextResponse.json({ error: 'Note must be 500 characters or less' }, { status: 400 })
    }

    let resolvedPlaceId: string

    if (placeId) {
      const existingPlace = await prisma.place.findUnique({
        where: { id: placeId },
      })
      if (!existingPlace) {
        return NextResponse.json({ error: 'Place not found' }, { status: 404 })
      }
      resolvedPlaceId = placeId
    } else if (place) {
      const { name, googlePlaceId, lat, lng, address, imageUrl } = place

      if (!name || lat === undefined || lng === undefined || !address) {
        return NextResponse.json(
          { error: 'Place name, lat, lng, and address are required' },
          { status: 400 }
        )
      }

      let upsertedPlace
      if (googlePlaceId) {
        upsertedPlace = await prisma.place.upsert({
          where: { googlePlaceId },
          update: {
            name,
            lat,
            lng,
            address,
            imageUrl: imageUrl || null,
          },
          create: {
            name,
            googlePlaceId,
            lat,
            lng,
            address,
            imageUrl: imageUrl || null,
          },
        })
      } else {
        upsertedPlace = await prisma.place.create({
          data: {
            name,
            lat,
            lng,
            address,
            imageUrl: imageUrl || null,
          },
        })
      }
      resolvedPlaceId = upsertedPlace.id
    } else {
      return NextResponse.json(
        { error: 'Either placeId or place object is required' },
        { status: 400 }
      )
    }

    const post = await prisma.post.create({
      data: {
        groupId: params.id,
        placeId: resolvedPlaceId,
        userId: session.user.id,
        note: note?.trim() || null,
      },
      include: {
        place: true,
        user: {
          select: {
            id: true,
            name: true,
            avatar: true,
          },
        },
      },
    })

    // Fire push notifications to other group members (non-blocking)
    const members = await prisma.groupMember.findMany({
      where: { groupId: params.id, NOT: { userId: session.user.id } },
      select: { userId: true },
    })
    if (members.length > 0 && process.env.INTERNAL_SECRET) {
      fetch(`${process.env.NEXTAUTH_URL}/api/push/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-internal-secret': process.env.INTERNAL_SECRET },
        body: JSON.stringify({
          userIds: members.map((m) => m.userId),
          title: `New place in your group 📍`,
          body: `${post.user.name} added ${post.place.name}`,
          url: `/groups/${params.id}`,
        }),
      }).catch(() => {})
    }

    return NextResponse.json(post, { status: 201 })
  } catch (error) {
    console.error('Create post error:', error)
    return NextResponse.json(
      { error: 'Failed to create post' },
      { status: 500 }
    )
  }
}
