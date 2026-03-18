import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Stethoscope } from 'lucide-react';
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";

interface Message {
  id: string;
  role: 'user' | 'model';
  text: string;
}

const AIChat: React.FC = () => {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'model',
      text: '您好，我是临床决策支持助手。我可以根据《中国高尿酸血症与痛风诊疗指南》为您提供治疗方案建议、药物相互作用查询或病例分析。请提供患者的简要情况。'
    }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userText = input;
    const userMsg: Message = { id: Date.now().toString(), role: 'user', text: userText };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const responseId = (Date.now() + 1).toString();
      let fullResponseText = "";

      setMessages(prev => [...prev, { id: responseId, role: 'model', text: '' }]);

      const model = 'gemini-2.5-flash';
      // UPDATED PROMPT FOR DOCTOR CONTEXT
      const systemInstruction = `You are an expert Medical AI Assistant designed for Rheumatologists treating Gout and Hyperuricemia. 
      
      Your Role:
      1. Provide evidence-based treatment suggestions citing Chinese Guidelines (2019/2023) or ACR guidelines.
      2. Analyze patient scenarios (e.g., "Patient has eGFR 45 and uric acid 600, what to prescribe?") with caution regarding renal function (Febuxostat preference vs Allopurinol).
      3. Focus on: Target Uric Acid levels (<360 or <300 umol/L), Acute flare management (NSAIDs/Colchicine/Steroids), and ULT (Urate Lowering Therapy) initiation timing.
      
      Tone: Professional, Clinical, Concise. Use medical terminology suitable for a doctor.
      Language: Chinese (Simplified).
      
      Disclaimer: You are a decision support tool. The doctor makes the final clinical decision.`;

      const chat = ai.chats.create({
        model: model,
        config: { systemInstruction },
        history: messages.map(m => ({ role: m.role, parts: [{ text: m.text }] }))
      });

      const result = await chat.sendMessageStream({ message: userText });

      for await (const chunk of result) {
        const c = chunk as GenerateContentResponse;
        if (c.text) {
          fullResponseText += c.text;
          setMessages(prev => 
            prev.map(msg => 
              msg.id === responseId ? { ...msg, text: fullResponseText } : msg
            )
          );
        }
      }

    } catch (error) {
      console.error("Gemini API Error:", error);
      setMessages(prev => [...prev, { 
        id: Date.now().toString(), 
        role: 'model', 
        text: "API连接异常，请检查网络或Key配置。" 
      }]);
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
           <p className="text-xs text-blue-100">Powered by Gemini Medical Context</p>
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
                {msg.text}
              </div>
            </div>
          </div>
        ))}
        {isLoading && messages[messages.length - 1]?.role !== 'model' && (
          <div className="flex justify-start">
             <div className="flex max-w-[80%] gap-3">
               <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0">
                 <Bot size={16} className="text-primary-600" />
               </div>
               <div className="bg-white p-4 rounded-2xl rounded-tl-none border border-slate-100 shadow-sm flex items-center gap-2">
                 <div className="w-2 h-2 bg-primary-400 rounded-full animate-bounce"></div>
                 <div className="w-2 h-2 bg-primary-400 rounded-full animate-bounce delay-100"></div>
                 <div className="w-2 h-2 bg-primary-400 rounded-full animate-bounce delay-200"></div>
               </div>
             </div>
          </div>
        )}
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
