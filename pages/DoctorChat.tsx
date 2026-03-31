import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Search, Send, User, ArrowLeft, MessageSquare, Eye } from 'lucide-react';
import { api } from '../api';
import { Conversation, ChatMessage } from '../types';

export default function DoctorChat() {
  const { patientId: routePatientId } = useParams();
  const navigate = useNavigate();

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activePatientId, setActivePatientId] = useState<string | null>(routePatientId || null);
  const [activePatientName, setActivePatientName] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [loadingConvs, setLoadingConvs] = useState(true);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const scrollRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Fetch conversations
  const fetchConversations = async () => {
    try {
      const res = await api.getConversations();
      setConversations(res.items || []);

      // If we have a route patientId but no active name, find it
      if (routePatientId && !activePatientName) {
        const conv = (res.items || []).find((c: Conversation) => c.patientId === routePatientId);
        if (conv) setActivePatientName(conv.patientName);
      }
    } catch (err) {
      console.error('Failed to fetch conversations:', err);
    } finally {
      setLoadingConvs(false);
    }
  };

  // Fetch messages for active patient
  const fetchMessages = async (patientOpenid: string) => {
    try {
      setLoadingMsgs(true);
      const res = await api.getMessages(patientOpenid);
      setMessages(res.items || []);

      // Mark as read
      api.markMessagesRead(patientOpenid).catch(() => {});
    } catch (err) {
      console.error('Failed to fetch messages:', err);
    } finally {
      setLoadingMsgs(false);
    }
  };

  // Initial load
  useEffect(() => {
    fetchConversations();

    // If navigated from PatientDetail with a patientId, fetch patient name
    if (routePatientId && !activePatientName) {
      api.getPatient(routePatientId).then(patient => {
        setActivePatientName(patient.nickName || patient.name || '患者');
      }).catch(() => {});
    }
  }, []);

  // Load messages when active patient changes
  useEffect(() => {
    if (activePatientId) {
      fetchMessages(activePatientId);
    }
  }, [activePatientId]);

  // Scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Polling for new messages
  useEffect(() => {
    pollRef.current = setInterval(() => {
      fetchConversations();
      if (activePatientId) {
        fetchMessages(activePatientId);
      }
    }, 10000);

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [activePatientId]);

  const handleSelectConversation = (conv: Conversation) => {
    setActivePatientId(conv.patientId);
    setActivePatientName(conv.patientName);
    setMessages([]);
  };

  const handleSend = async () => {
    if (!input.trim() || !activePatientId || sending) return;

    const text = input.trim();
    setInput('');
    setSending(true);

    // Optimistic update
    const tempMsg: ChatMessage = {
      id: `temp_${Date.now()}`,
      conversationId: '',
      senderId: '',
      senderRole: 'doctor',
      senderName: '我',
      content: text,
      type: 'text',
      createdAt: Date.now(),
      read: false,
    };
    setMessages(prev => [...prev, tempMsg]);

    try {
      await api.sendMessage(activePatientId, text, activePatientName);
      // Refresh messages to get server-assigned IDs
      await fetchMessages(activePatientId);
      fetchConversations();
    } catch (err) {
      console.error('Failed to send message:', err);
      // Remove optimistic message on failure
      setMessages(prev => prev.filter(m => m.id !== tempMsg.id));
    } finally {
      setSending(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const formatTime = (ts: number) => {
    const d = new Date(ts);
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    if (isToday) {
      return d.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
    }
    return d.toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
  };

  const filteredConvs = conversations.filter(c =>
    c.patientName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 h-[calc(100vh-200px)] flex overflow-hidden">
      {/* Left: Conversation List */}
      <div className="w-80 border-r border-slate-100 flex flex-col bg-slate-50/50">
        {/* Search */}
        <div className="p-4 border-b border-slate-100">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
            <input
              type="text"
              placeholder="搜索患者..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary-100 focus:border-primary-500"
            />
          </div>
        </div>

        {/* Conversation List */}
        <div className="flex-1 overflow-y-auto">
          {loadingConvs ? (
            <div className="text-center py-8 text-slate-400 text-sm">加载中...</div>
          ) : filteredConvs.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <MessageSquare size={32} className="mx-auto mb-3 text-slate-300" />
              <p className="text-sm">暂无会话</p>
              <p className="text-xs mt-1">在患者详情页点击"发消息"开始聊天</p>
            </div>
          ) : (
            filteredConvs.map(conv => (
              <button
                key={conv.id}
                onClick={() => handleSelectConversation(conv)}
                className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors border-b border-slate-50 ${
                  activePatientId === conv.patientId
                    ? 'bg-primary-50 border-l-2 border-l-primary-500'
                    : 'hover:bg-slate-100'
                }`}
              >
                <div className="w-10 h-10 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center font-bold text-sm flex-shrink-0">
                  {conv.patientName.substring(0, 1)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-center">
                    <span className="font-medium text-slate-800 text-sm truncate">{conv.patientName}</span>
                    <span className="text-xs text-slate-400 flex-shrink-0">{formatTime(conv.lastMessageTime)}</span>
                  </div>
                  <p className="text-xs text-slate-500 truncate mt-0.5">{conv.lastMessage}</p>
                </div>
                {conv.unreadCount > 0 && (
                  <span className="w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center flex-shrink-0">
                    {conv.unreadCount > 99 ? '99+' : conv.unreadCount}
                  </span>
                )}
              </button>
            ))
          )}
        </div>
      </div>

      {/* Right: Chat Window */}
      <div className="flex-1 flex flex-col">
        {activePatientId ? (
          <>
            {/* Chat Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-white">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center font-bold text-sm">
                  {activePatientName.substring(0, 1) || '?'}
                </div>
                <div>
                  <h3 className="font-bold text-slate-800">{activePatientName || '患者'}</h3>
                  <p className="text-xs text-slate-400">来自小程序</p>
                </div>
              </div>
              <button
                onClick={() => navigate(`/patients/${activePatientId}`)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-primary-600 bg-primary-50 rounded-lg hover:bg-primary-100 transition-colors"
              >
                <Eye size={14} />
                查看档案
              </button>
            </div>

            {/* Messages Area */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-50/30">
              {loadingMsgs ? (
                <div className="text-center py-8 text-slate-400 text-sm">加载消息...</div>
              ) : messages.length === 0 ? (
                <div className="text-center py-12 text-slate-400 text-sm">暂无消息记录，发送第一条消息开始聊天</div>
              ) : (
                messages.map(msg => (
                  <div key={msg.id} className={`flex ${msg.senderRole === 'doctor' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`flex max-w-[70%] gap-3 ${msg.senderRole === 'doctor' ? 'flex-row-reverse' : 'flex-row'}`}>
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold ${
                        msg.senderRole === 'doctor'
                          ? 'bg-primary-100 text-primary-600'
                          : 'bg-slate-200 text-slate-600'
                      }`}>
                        {msg.senderRole === 'doctor' ? '医' : msg.senderName?.substring(0, 1) || '患'}
                      </div>
                      <div>
                        <div className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed shadow-sm whitespace-pre-wrap ${
                          msg.senderRole === 'doctor'
                            ? 'bg-primary-600 text-white rounded-tr-sm'
                            : 'bg-white text-slate-800 border border-slate-200 rounded-tl-sm'
                        }`}>
                          {msg.content}
                        </div>
                        <p className={`text-xs text-slate-400 mt-1 ${msg.senderRole === 'doctor' ? 'text-right' : ''}`}>
                          {formatTime(msg.createdAt)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Input Area */}
            <div className="p-4 bg-white border-t border-slate-100">
              <div className="relative">
                <input
                  type="text"
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={handleKeyPress}
                  placeholder="输入消息..."
                  className="w-full pl-4 pr-12 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:bg-white transition-all text-sm"
                />
                <button
                  onClick={handleSend}
                  disabled={!input.trim() || sending}
                  className="absolute right-2 top-1.5 p-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <Send size={16} />
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-slate-400">
            <div className="text-center">
              <MessageSquare size={48} className="mx-auto mb-4 text-slate-300" />
              <h3 className="font-medium text-slate-500 mb-1">选择一个会话开始聊天</h3>
              <p className="text-sm">您可以在患者详情页点击"发消息"发起新会话</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
