"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface Session {
  sessionId: string;
  messageCount: number;
  firstMessage: string;
  lastMessage: string;
  createdAt: Date;
  lastActivity: Date;
}

export default function SessionsPage() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<'date' | 'messages'>('date');
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null);

  useEffect(() => {
    fetchSessions();
  }, []);

  const fetchSessions = async () => {
    try {
      const res = await fetch('/admin/api/sessions');
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      if (data.sessions) {
        setSessions(data.sessions);
      }
    } catch (error) {
      console.error("Error fetching sessions:", error);
    } finally {
      setLoading(false);
    }
  };

  const deleteSession = async (sessionId: string) => {
    if (confirm('Delete this entire session? This action cannot be undone.')) {
      setDeleteLoading(sessionId);
      try {
        // Fixed: Use the same base path as GET
        const res = await fetch('/admin/api/sessions', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId })
        });
        
        if (res.ok) {
          setSessions(sessions.filter(s => s.sessionId !== sessionId));
        } else {
          const error = await res.json();
          alert('Failed to delete: ' + (error.error || 'Unknown error'));
        }
      } catch (error) {
        console.error("Error deleting session:", error);
        alert('Error deleting session');
      } finally {
        setDeleteLoading(null);
      }
    }
  };

  const filteredSessions = sessions
    .filter(s => s.sessionId.toLowerCase().includes(searchTerm.toLowerCase()))
    .sort((a, b) => {
      if (sortBy === 'date') {
        return new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime();
      } else {
        return b.messageCount - a.messageCount;
      }
    });

  const exportSession = (session: Session) => {
    const dataStr = JSON.stringify(session, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    const exportFileDefaultName = `session-${session.sessionId.slice(0, 8)}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-800">Chat Sessions</h1>
        <div className="flex gap-4">
          <input
            type="text"
            placeholder="Search sessions..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-transparent w-64"
          />
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as 'date' | 'messages')}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-transparent"
          >
            <option value="date">Sort by Date</option>
            <option value="messages">Sort by Message Count</option>
          </select>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-200">
          <p className="text-sm text-gray-600">Total Sessions</p>
          <p className="text-2xl font-bold text-gray-800">{sessions.length}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-200">
          <p className="text-sm text-gray-600">Total Messages</p>
          <p className="text-2xl font-bold text-gray-800">
            {sessions.reduce((acc, s) => acc + s.messageCount, 0)}
          </p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-200">
          <p className="text-sm text-gray-600">Avg Messages/Session</p>
          <p className="text-2xl font-bold text-gray-800">
            {sessions.length > 0 
              ? (sessions.reduce((acc, s) => acc + s.messageCount, 0) / sessions.length).toFixed(1)
              : '0'}
          </p>
        </div>
      </div>

      <div className="grid gap-4">
        {filteredSessions.map((session) => (
          <div
            key={session.sessionId}
            className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-4 mb-3">
                  <h3 className="font-mono text-sm bg-gray-100 px-3 py-1 rounded-lg">
                    {session.sessionId}
                  </h3>
                  <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                    {session.messageCount} messages
                  </span>
                  <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                    {new Date(session.lastActivity).toLocaleDateString()}
                  </span>
                </div>
                
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <p className="text-xs text-gray-500 mb-1">First Message</p>
                    <p className="text-sm text-gray-700 line-clamp-2">{session.firstMessage || 'N/A'}</p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <p className="text-xs text-gray-500 mb-1">Last Message</p>
                    <p className="text-sm text-gray-700 line-clamp-2">{session.lastMessage || 'N/A'}</p>
                  </div>
                </div>

                <div className="flex gap-4 text-xs text-gray-500">
                  <span>Created: {new Date(session.createdAt).toLocaleString()}</span>
                  <span>Last Active: {new Date(session.lastActivity).toLocaleString()}</span>
                </div>
              </div>

              <div className="flex gap-2 ml-4">
                <Link
                  href={`/admin/sessions/${encodeURIComponent(session.sessionId)}`}
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                  View
                </Link>
                <button
                  onClick={() => exportSession(session)}
                  className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors flex items-center gap-2"
                  title="Export as JSON"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Export
                </button>
                <button
                  onClick={() => deleteSession(session.sessionId)}
                  disabled={deleteLoading === session.sessionId}
                  className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {deleteLoading === session.sessionId ? (
                    <>
                      <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Deleting...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                      Delete
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        ))}

        {filteredSessions.length === 0 && (
          <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
            <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
            </svg>
            <p className="text-gray-500 text-lg">No sessions found</p>
            <p className="text-gray-400 text-sm mt-2">Start a conversation in the chat to see it here</p>
          </div>
        )}
      </div>
    </div>
  );
}