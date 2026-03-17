import prisma from "@/lib/prisma";

export default async function SessionDetailPage({
  params,
}: {
  params: { sessionId: string };
}) {
  const sessionId = decodeURIComponent(params.sessionId);

  const messages = await prisma.chatMessage.findMany({
    where: { sessionId },
    orderBy: { createdAt: "asc" },
  });

  const sessionInfo = {
    totalMessages: messages.length,
    firstMessage: messages[0]?.createdAt,
    lastMessage: messages[messages.length - 1]?.createdAt,
    userMessages: messages.filter((m: any) => m.role === 'user').length,
    aiMessages: messages.filter((m: any) => m.role === 'assistant').length,
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">Session Details</h1>
        <p className="font-mono text-sm bg-gray-100 px-3 py-1 rounded-lg inline-block">
          {sessionId}
        </p>
      </div>

      {/* Session Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-200">
          <p className="text-sm text-gray-600 mb-1">Total Messages</p>
          <p className="text-2xl font-bold text-gray-800">{sessionInfo.totalMessages}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-200">
          <p className="text-sm text-gray-600 mb-1">User Messages</p>
          <p className="text-2xl font-bold text-blue-600">{sessionInfo.userMessages}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-200">
          <p className="text-sm text-gray-600 mb-1">AI Messages</p>
          <p className="text-2xl font-bold text-purple-600">{sessionInfo.aiMessages}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-200">
          <p className="text-sm text-gray-600 mb-1">Duration</p>
          <p className="text-2xl font-bold text-green-600">
            {Math.ceil((new Date(sessionInfo.lastMessage).getTime() - new Date(sessionInfo.firstMessage).getTime()) / (1000 * 60))} min
          </p>
        </div>
      </div>

      {/* Messages */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-800">Conversation History</h2>
        </div>
        <div className="divide-y divide-gray-200">
          {messages.map((msg: any) => (
            <div key={msg.id} className="p-6 hover:bg-gray-50">
              <div className="flex items-start gap-4">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white flex-shrink-0 ${
                  msg.role === 'user' ? 'bg-blue-500' : 'bg-purple-500'
                }`}>
                  {msg.role === 'user' ? 'U' : 'AI'}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-sm font-medium text-gray-700">
                      {msg.role === 'user' ? 'User' : 'Assistant'}
                    </span>
                    <span className="text-xs text-gray-400">
                      {new Date(msg.createdAt).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-gray-700 whitespace-pre-wrap">{msg.content}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}