import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    // Get all unique session IDs with their message counts
    const sessions = await prisma.chatMessage.groupBy({
      by: ['sessionId'],
      _count: {
        _all: true,
      },
      _min: {
        createdAt: true,
      },
      _max: {
        createdAt: true,
      },
    });

    // Get first and last message for each session
    const sessionsWithDetails = await Promise.all(
      sessions.map(async (session: any) => {
        const messages = await prisma.chatMessage.findMany({
          where: { sessionId: session.sessionId },
          orderBy: { createdAt: 'asc' },
          take: 1,
        });

        const lastMessages = await prisma.chatMessage.findMany({
          where: { sessionId: session.sessionId },
          orderBy: { createdAt: 'desc' },
          take: 1,
        });

        return {
          sessionId: session.sessionId,
          messageCount: session._count._all,
          firstMessage: messages[0]?.content || '',
          lastMessage: lastMessages[0]?.content || '',
          createdAt: session._min.createdAt,
          lastActivity: session._max.createdAt,
        };
      })
    );

    return NextResponse.json({ sessions: sessionsWithDetails });
  } catch (error) {
    console.error("Error fetching sessions:", error);
    return NextResponse.json(
      { error: "Failed to fetch sessions" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request) {
  try {
    const { sessionId } = await req.json();

    await prisma.chatMessage.deleteMany({
      where: { sessionId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting session:", error);
    return NextResponse.json(
      { error: "Failed to delete session" },
      { status: 500 }
    );
  }
}