import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Stethoscope } from 'lucide-react';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  text: string;
}

const AIChat: React.FC = () => {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      text: '您好，我是临床决策支持助手。我可以根据《中国高尿酸血症与痛风诊疗指南》为您提供治疗方案建议、药物相互作用查询或病例分析。请提供患者的简要情况。'
    }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userText = input;
    const userMsg: Message = { id: Date.now().toString(), role: 'user', text: userText };
    const responseId = (Date.now() + 1).toString();

    setMessages(prev => [...prev, userMsg, { id: responseId, role: 'assistant', text: '' }]);
    setInput('');
    setIsLoading(true);

    try {
      // 调用后端 SSE 接口（API Key 在服务端持有，不暴露给浏览器）
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          message: userText,
          history: messages.map(m => ({ role: m.role, text: m.text }))
        })
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({ error: 'AI 服务异常' }));
        throw new Error(err.error || 'AI 服务异常');
      }

      const reader = response.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let hasAssistantText = false;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const data = line.slice(6).trim();
          if (data === '[DONE]') break;

          try {
            const parsed = JSON.parse(data);
            if (parsed.error) throw new Error(parsed.error);
            if (parsed.text) {
              hasAssistantText = true;
              setMessages(prev =>
                prev.map(msg =>
                  msg.id === responseId ? { ...msg, text: msg.text + parsed.text } : msg
                )
              );
            }
          } catch (e: any) {
            if (e.message && e.message !== 'Unexpected end of JSON input') {
              throw e;
            }
          }
        }
      }

      if (!hasAssistantText) {
        setMessages(prev =>
          prev.map(msg =>
            msg.id === responseId
              ? { ...msg, text: 'AI 暂未返回有效内容，请重试一次或补充更完整病情描述。' }
              : msg
          )
        );
      }
    } catch (error: any) {
      console.error('AI Chat Error:', error);
      setMessages(prev =>
        prev.map(msg =>
          msg.id === responseId
            ? { ...msg, text: error.message || 'AI 服务连接异常，请稍后重试。' }
            : msg
        )
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 h-[calc(100vh-200px)] flex flex-col overflow-hidden">
      {/* Chat Header */}
      <div className="bg-gradient-to-r from-primary-700 to-indigo-800 p-4 text-white flex items-center gap-3">
        <div className="p-2 bg-white/20 rounded-lg">
           <Stethoscope size={20} className="text-white" />
        </div>
        <div>
           <h3 className="font-bold">CDSS 临床辅助决策系统</h3>
           <p className="text-xs text-blue-100">基于腾讯元器 AI 引擎</p>
        </div>
      </div>

      {/* Messages Area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`flex max-w-[90%] gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                msg.role === 'user' ? 'bg-slate-200' : 'bg-primary-100'
              }`}>
                {msg.role === 'user' ? <User size={16} className="text-slate-600" /> : <Bot size={16} className="text-primary-600" />}
              </div>
              <div className={`p-4 rounded-2xl text-sm leading-relaxed shadow-sm whitespace-pre-wrap ${
                msg.role === 'user'
                  ? 'bg-primary-700 text-white rounded-tr-none'
                  : 'bg-white text-slate-800 border border-slate-200 rounded-tl-none'
              }`}>
                {msg.text || (isLoading && msg.role === 'assistant' ? (
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 bg-primary-400 rounded-full animate-bounce"></span>
                    <span className="w-2 h-2 bg-primary-400 rounded-full animate-bounce delay-100"></span>
                    <span className="w-2 h-2 bg-primary-400 rounded-full animate-bounce delay-200"></span>
                  </span>
                ) : '')}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Input Area */}
      <div className="p-4 bg-white border-t border-slate-100">
        <div className="relative">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyPress}
            placeholder="输入病例特征，例如：'痛风，eGFR 40，可以用苯溴马隆吗？'"
            className="w-full pl-4 pr-12 py-4 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:bg-white transition-all shadow-inner"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className="absolute right-2 top-2 p-2 bg-primary-700 text-white rounded-lg hover:bg-primary-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-md"
          >
            <Send size={20} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default AIChat;
