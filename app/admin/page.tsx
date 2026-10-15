import prisma from "@/lib/prisma";

async function getStats() {
  try {
    console.log("Starting to fetch stats...");
    
    // Test 1: Simple count
    console.log("Fetching total messages...");
    const totalMessages = await prisma.chatMessage.count();
    console.log("Total messages:", totalMessages);
    
    // Test 2: Group by session
    console.log("Fetching sessions...");
    const sessionGroups = await prisma.chatMessage.groupBy({
      by: ['sessionId'],
      _count: true,
    });
    const totalSessions = sessionGroups.length;
    console.log("Total sessions:", totalSessions);
    
    // Test 3: Recent messages
    console.log("Fetching recent messages...");
    const recentMessages = await prisma.chatMessage.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        sessionId: true,
        role: true,
        content: true,
        createdAt: true,
      },
    });
    console.log("Recent messages count:", recentMessages.length);

    // Test 4: Raw query
    console.log("Running raw query...");
    let messagesByDay: { date: Date; count: bigint }[] = [];
    try {
      messagesByDay = await prisma.$queryRaw<{ date: Date; count: bigint }[]>`
        SELECT 
          DATE(created_at) as date,
          COUNT(*) as count
        FROM chat_messages
        WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
        GROUP BY DATE(created_at)
        ORDER BY date DESC
      `;
      console.log("Raw query results:", messagesByDay);
    } catch (rawError) {
      console.error("Raw query failed:", rawError);
      // Fallback to empty array if raw query fails
      messagesByDay = [];
    }

    return {
      totalMessages,
      totalSessions,
      recentMessages: JSON.parse(JSON.stringify(recentMessages)),
      messagesByDay: messagesByDay.map(({ date, count }) => ({
        date: date.toISOString(),
        count: Number(count),
      })),
    };
  } catch (error) {
    console.error("=== ERROR FETCHING STATS ===");
    if (error instanceof Error) {
      console.error("Error name:", error.name);
      console.error("Error message:", error.message);
      console.error("Error stack:", error.stack);
    } else {
      console.error("Error:", error);
    }
    return null;
  }
}

export default async function AdminDashboard() {
  const stats = await getStats();

  if (!stats) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold text-red-600 mb-4">Error Loading Dashboard</h1>
        <p className="text-gray-700 mb-4">Check the server terminal for detailed error logs.</p>
        <div className="bg-gray-100 p-4 rounded">
          <p className="font-mono text-sm text-gray-800">
            Check your terminal for the full error details.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-800 mb-8">Dashboard</h1>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Total Messages</p>
              <p className="text-3xl font-bold text-gray-800">{stats.totalMessages}</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Total Sessions</p>
              <p className="text-3xl font-bold text-gray-800">{stats.totalSessions}</p>
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Avg Messages/Session</p>
              <p className="text-3xl font-bold text-gray-800">
                {stats.totalSessions > 0 
                  ? (stats.totalMessages / stats.totalSessions).toFixed(1) 
                  : '0'}
              </p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Today's Messages</p>
              <p className="text-3xl font-bold text-gray-800">
                {stats.messagesByDay.length > 0 ? (
                  stats.messagesByDay.find((d: any) => {
                    const today = new Date().toISOString().split('T')[0];
                    const dateStr = new Date(d.date).toISOString().split('T')[0];
                    return dateStr === today;
                  })?.count || 0
                ) : 0}
              </p>
            </div>
            <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Messages */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-8">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-800">Recent Messages</h2>
        </div>
        {stats.recentMessages.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Session</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Message</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {stats.recentMessages.map((msg: any) => (
                  <tr key={msg.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {new Date(msg.createdAt).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-sm font-mono text-gray-600">
                      {msg.sessionId.substring(0, 12)}...
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        msg.role === 'user' 
                          ? 'bg-blue-100 text-blue-800' 
                          : 'bg-purple-100 text-purple-800'
                      }`}>
                        {msg.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 max-w-md truncate">
                      {msg.content}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-8 text-center text-gray-500">
            No messages yet. Start a conversation in the chat!
          </div>
        )}
      </div>

      {/* Activity Chart */}
      {stats.messagesByDay.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Last 7 Days Activity</h2>
          <div className="flex items-end gap-2 h-40">
            {stats.messagesByDay.map((day: any) => {
              const max = Math.max(...stats.messagesByDay.map((d: any) => d.count));
              const height = max > 0 ? (day.count / max) * 100 : 0;
              const date = new Date(day.date);
              
              return (
                <div key={day.date} className="flex-1 flex flex-col items-center gap-2">
                  <div className="relative w-full flex justify-center">
                    <div 
                      className="w-8 bg-blue-500 rounded-t-lg transition-all"
                      style={{ height: `${height}%`, minHeight: '4px' }}
                    />
                  </div>
                  <div className="text-center">
                    <div className="text-xs font-medium text-gray-600">
                      {date.toLocaleDateString('en-US', { weekday: 'short' })}
                    </div>
                    <div className="text-xs text-gray-400">
                      {date.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric' })}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}