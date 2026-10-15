import prisma from "@/lib/prisma";
import Groq from "groq-sdk";

export async function POST(req: Request) {
  try {
    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
    const { message, sessionId } = await req.json();

    if (!message || !sessionId) {
      return Response.json(
        { error: "Message and sessionId are required" },
        { status: 400 }
      );
    }

    console.log("Saving message for session:", sessionId);

    // Save user message
    const userMessage = await prisma.chatMessage.create({
      data: { 
        sessionId, 
        role: "user", 
        content: message 
      },
    });
    
    console.log("User message saved:", userMessage);

    // Get AI response
    const chatCompletion = await groq.chat.completions.create({
      messages: [{ role: "user", content: message }],
      model: "llama-3.3-70b-versatile",
    });

    const aiReply = chatCompletion.choices[0].message.content;

    // Save AI response
    const aiMessage = await prisma.chatMessage.create({
      data: { 
        sessionId, 
        role: "assistant",
        content: aiReply || "Sorry, I couldn't generate a response." 
      },
    });
    
    console.log("AI message saved:", aiMessage);

    return Response.json({ reply: aiReply });
  } catch (error) {
    console.error("Error in chat API:", error);
    return Response.json(
      {
        error:
          "Internal server error: " +
          (error instanceof Error ? error.message : "Unknown error"),
      },
      { status: 500 }
    );
  }
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get("sessionId");

    if (!sessionId) {
      return Response.json(
        { error: "sessionId is required" },
        { status: 400 }
      );
    }

    const messages = await prisma.chatMessage.findMany({
      where: { sessionId },
      orderBy: { createdAt: "asc" },
    });

    return Response.json({ chat: messages });
  } catch (error) {
    console.error("Error fetching chat history:", error);
    return Response.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}