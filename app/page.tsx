"use client";

import { useState, useEffect, useRef } from "react";

type ChatMessage = { role: "user" | "assistant"; content: string };
type ChatSession = { id: string; preview: string; timestamp: number };

export default function Home() {
  const [message, setMessage] = useState("");
  const [chat, setChat] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState("");
  const [error, setError] = useState("");
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
  const messagesEndRef = useRef(null);

  // Generate or load session ID on component mount
  useEffect(() => {
    // Check if session exists in localStorage
    let storedSessionId = localStorage.getItem("currentChatSessionId");
    if (!storedSessionId) {
      // Create new session ID
      storedSessionId = "session_" + Date.now() + "_" + Math.random().toString(36).substr(2, 9);
      localStorage.setItem("currentChatSessionId", storedSessionId);
    }
    setSessionId(storedSessionId);
    
    // Load all saved sessions from localStorage
    loadSavedSessions();
    
    // Load current chat history
    loadChatHistory(storedSessionId);
  }, []);

  const loadSavedSessions = () => {
    // Get all sessions from localStorage
    const sessions: ChatSession[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith("chat_session_")) {
        const sessionData = JSON.parse(localStorage.getItem(key) || "{}");
        sessions.push({
          id: key.replace("chat_session_", ""),
          preview: sessionData.preview || "New chat",
          timestamp: sessionData.timestamp || Date.now()
        });
      }
    }
    // Sort by most recent first
    sessions.sort((a, b) => b.timestamp - a.timestamp);
    setChatSessions(sessions);
  };

  const loadChatHistory = async (sid: string) => {
    try {
      const res = await fetch(`/api/chat?sessionId=${sid}`);
      const data = await res.json();
      if (data.chat) {
        setChat(data.chat);
        // Save preview to localStorage
        if (data.chat.length > 0) {
          localStorage.setItem(`chat_session_${sid}`, JSON.stringify({
            preview: data.chat[0].content.substring(0, 30) + "...",
            timestamp: Date.now()
          }));
          loadSavedSessions();
        }
      }
    } catch (err) {
      console.error("Failed to load chat history:", err);
    }
  };

  const sendMessage = async () => {
    if (!message.trim() || !sessionId) return;

    const userMessage = message.trim();
    setChat(prev => [...prev, { role: "user", content: userMessage }]);
    setMessage("");
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ 
          message: userMessage,
          sessionId: sessionId 
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to get response");
      }

      setChat(prev => [
        ...prev,
        { role: "assistant", content: data.reply }
      ]);

      // Save preview to localStorage
      localStorage.setItem(`chat_session_${sessionId}`, JSON.stringify({
        preview: userMessage.substring(0, 30) + "...",
        timestamp: Date.now()
      }));
      loadSavedSessions();

    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      console.error("Error:", err);
    } finally {
      setLoading(false);
    }
  };

  const startNewChat = () => {
    // Save current session before creating new one
    if (chat.length > 0) {
      localStorage.setItem(`chat_session_${sessionId}`, JSON.stringify({
        preview: chat[0].content.substring(0, 30) + "...",
        timestamp: Date.now()
      }));
    }

    // Generate new session ID
    const newSessionId = "session_" + Date.now() + "_" + Math.random().toString(36).substr(2, 9);
    localStorage.setItem("currentChatSessionId", newSessionId);
    setSessionId(newSessionId);
    setChat([]);
    setError("");
    loadSavedSessions();
  };

  const switchChat = (newSessionId: string) => {
    // Save current session preview
    if (chat.length > 0) {
      localStorage.setItem(`chat_session_${sessionId}`, JSON.stringify({
        preview: chat[0].content.substring(0, 30) + "...",
        timestamp: Date.now()
      }));
    }

    // Switch to new session
    localStorage.setItem("currentChatSessionId", newSessionId);
    setSessionId(newSessionId);
    loadChatHistory(newSessionId);
  };

  const deleteChat = (sessionIdToDelete: string) => {
    // Remove from localStorage
    localStorage.removeItem(`chat_session_${sessionIdToDelete}`);
    
    // If current chat is deleted, create new one
    if (sessionIdToDelete === sessionId) {
      startNewChat();
    } else {
      loadSavedSessions();
    }
  };

  return (
    <div className="flex h-screen bg-gradient-to-br from-gray-900 to-gray-800">
      {/* Sidebar - Dark theme with better contrast */}
      <div className="w-72 bg-gray-900 text-gray-100 flex flex-col shadow-2xl border-r border-gray-700">
        <div className="p-6 border-b border-gray-700">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
            Shoumik AI
          </h1>
          <p className="text-xs text-gray-400 mt-1">Powered by LLaMA 3.3</p>
        </div>

        <div className="px-4 py-4">
          <button
            onClick={startNewChat}
            className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition-all duration-200 shadow-lg hover:shadow-xl font-medium"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Chat
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4">
          <div className="text-xs uppercase tracking-wider text-gray-500 font-semibold mb-3 px-2">
            Recent Chats
          </div>
          <div className="space-y-2">
            {chatSessions.length > 0 ? (
              chatSessions.map((session) => (
                <div
                  key={session.id}
                  className={`group flex items-center justify-between p-3 rounded-lg cursor-pointer transition-all ${
                    session.id === sessionId
                      ? "bg-gray-800 border-l-4 border-blue-500"
                      : "hover:bg-gray-800"
                  }`}
                  onClick={() => switchChat(session.id)}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-200 truncate">
                      {session.preview}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {new Date(session.timestamp).toLocaleDateString()}
                    </p>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteChat(session.id);
                    }}
                    className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-400 transition-all"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              ))
            ) : (
              <div className="text-gray-500 text-sm text-center py-4">
                No chat history
              </div>
            )}
          </div>
        </div>

        <div className="p-6 border-t border-gray-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold">
              S
            </div>
            <div>
              <p className="text-sm font-medium text-gray-200">Shabik Yeamin Shoumik</p>
              <p className="text-xs text-gray-400">Developer</p>
            </div>
          </div>
        </div>
      </div>

      {/* Chat Area - Light theme with dark text for readability */}
      <div className="flex-1 flex flex-col bg-gray-50">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-8 py-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-800">AI Assistant</h2>
              <p className="text-sm text-gray-600 mt-1 flex items-center gap-2">
                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                Online · Ready to help
              </p>
            </div>
            <div className="text-xs text-gray-500 bg-gray-100 px-3 py-2 rounded-full">
              Session: {sessionId?.substring(0, 8)}...
            </div>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-8 py-6">
          <div className="max-w-4xl mx-auto space-y-6">
            {chat.length === 0 && !loading && (
              <div className="text-center py-20">
                <div className="w-20 h-20 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
                  <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-gray-700 mb-2">Welcome to Shoumik AI</h3>
                <p className="text-gray-500">Ask anything to start the conversation</p>
              </div>
            )}

            {chat.map((msg, i) => (
              <div
                key={i}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div className={`flex max-w-[80%] ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}>
                  <div className={`flex-shrink-0 ${msg.role === "user" ? "ml-3" : "mr-3"}`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-medium ${
                      msg.role === "user" 
                        ? "bg-gradient-to-r from-blue-500 to-blue-600" 
                        : "bg-gradient-to-r from-purple-500 to-purple-600"
                    }`}>
                      {msg.role === "user" ? "U" : "AI"}
                    </div>
                  </div>
                  <div>
                    <div className={`px-5 py-3 rounded-2xl shadow-sm ${
                      msg.role === "user"
                        ? "bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-br-none"
                        : "bg-white border border-gray-200 text-gray-800 rounded-bl-none"
                    }`}>
                      <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                    </div>
                    <p className={`text-xs mt-1 text-gray-500 ${
                      msg.role === "user" ? "text-right" : "text-left"
                    }`}>
                      {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex justify-start">
                <div className="flex max-w-[80%] flex-row">
                  <div className="flex-shrink-0 mr-3">
                    <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-purple-600 rounded-full flex items-center justify-center text-white font-medium">
                      AI
                    </div>
                  </div>
                  <div>
                    <div className="px-5 py-4 bg-white border border-gray-200 rounded-2xl rounded-bl-none shadow-sm">
                      <div className="flex space-x-2">
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">
                Error: {error}
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Input Area */}
        <div className="border-t border-gray-200 bg-white px-8 py-5">
          <div className="max-w-4xl mx-auto">
            <div className="flex gap-3 items-end">
              <div className="flex-1 relative">
                <textarea
                  className="w-full border border-gray-300 rounded-2xl px-5 py-4 pr-12 outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent resize-none bg-white text-gray-800 placeholder-gray-400 transition-all"
                  placeholder="Ask anything..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      sendMessage();
                    }
                  }}
                  rows={1}
                  style={{ minHeight: '60px', maxHeight: '150px' }}
                />
                <button
                  onClick={sendMessage}
                  disabled={loading || !message.trim()}
                  className="absolute right-3 bottom-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white p-2 rounded-xl hover:from-blue-600 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                </button>
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-2 text-center">
              Press Enter to send, Shift + Enter for new line
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}