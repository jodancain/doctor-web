import React, { useState, useEffect } from 'react';
import { Plus, Search, Edit2, Copy, Trash2, FileText, CheckCircle2, Clock, X, ArrowLeft, GripVertical, Share2, Download, Send, QrCode } from 'lucide-react';
import { Questionnaire, Question } from '../types';
import { api } from '../api';

type ViewMode = 'list' | 'edit';

const QuestionnaireDesign: React.FC = () => {
  const [questionnaires, setQuestionnaires] = useState<Questionnaire[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [editingData, setEditingData] = useState<Questionnaire | null>(null);

  // Distribution Modal State
  const [distributeModal, setDistributeModal] = useState<{isOpen: boolean, questionnaire: Questionnaire | null}>({isOpen: false, questionnaire: null});
  const [patients, setPatients] = useState<any[]>([]);
  const [selectedPatientIds, setSelectedPatientIds] = useState<string[]>([]);
  const [distributeTab, setDistributeTab] = useState<'targeted' | 'general'>('targeted');
  const [isSending, setIsSending] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'error' | 'success'; text: string } | null>(null);
  const [questionnaireToDelete, setQuestionnaireToDelete] = useState<string | null>(null);

  const showFeedback = (type: 'error' | 'success', text: string) => {
    setFeedbackMsg({ type, text });
    setTimeout(() => setFeedbackMsg(null), 4000);
  };

  const fetchQuestionnaires = async () => {
    try {
      setLoading(true);
      const res = await api.getQuestionnaires({ q: searchTerm || undefined });
      setQuestionnaires(res.items || []);
    } catch (err) {
      console.error('Failed to fetch questionnaires:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => fetchQuestionnaires(), 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const filteredQuestionnaires = questionnaires;

  const handleOpenEditor = (questionnaire?: Questionnaire) => {
    if (questionnaire) {
      // Deep copy to avoid mutating original state before save
      setEditingData(JSON.parse(JSON.stringify(questionnaire)));
    } else {
      setEditingData({
        id: `_new_${Date.now()}`,
        title: '',
        type: 'Survey',
        questionCount: 0,
        status: 'Draft',
        updateDate: new Date().toISOString().split('T')[0],
        usageCount: 0,
        questions: []
      });
    }
    setViewMode('edit');
  };

  const handleSaveQuestionnaire = async () => {
    if (!editingData) return;
    if (!editingData.title.trim()) {
      showFeedback('error', '请输入问卷标题');
      return;
    }

    try {
      const payload = {
        title: editingData.title,
        type: editingData.type,
        status: editingData.status,
        questions: editingData.questions || [],
      };

      const isNew = editingData.id.startsWith('_new_');
      if (isNew) {
        await api.createQuestionnaire(payload);
      } else {
        await api.updateQuestionnaire(editingData.id, payload);
      }

      setViewMode('list');
      setEditingData(null);
      fetchQuestionnaires();
      showFeedback('success', '问卷已保存');
    } catch (err) {
      console.error('Failed to save questionnaire:', err);
      showFeedback('error', '保存失败，请重试');
    }
  };

  const handleDelete = (id: string) => {
    setQuestionnaireToDelete(id);
  };

  const confirmDeleteQuestionnaire = async () => {
    if (!questionnaireToDelete) return;
    try {
      await api.deleteQuestionnaire(questionnaireToDelete);
      setQuestionnaireToDelete(null);
      fetchQuestionnaires();
    } catch (err) {
      console.error('Failed to delete questionnaire:', err);
      showFeedback('error', '删除失败，请重试');
    }
  };

  const handleCopy = async (questionnaire: Questionnaire) => {
    try {
      await api.createQuestionnaire({
        title: `${questionnaire.title} (副本)`,
        type: questionnaire.type,
        status: 'Draft',
        questions: questionnaire.questions || [],
      });
      fetchQuestionnaires();
      showFeedback('success', '问卷已复制');
    } catch (err) {
      console.error('Failed to copy questionnaire:', err);
      showFeedback('error', '复制失败');
    }
  };

  // --- Distribution Functions ---
  const handleOpenDistribute = async (q: Questionnaire) => {
    setDistributeModal({ isOpen: true, questionnaire: q });
    setDistributeTab('targeted');
    setSelectedPatientIds([]);
    try {
      const res = await api.getPatients({ limit: 50 });
      setPatients(res.items || []);
    } catch (err) {
      console.error('Failed to fetch patients', err);
    }
  };

  const handleSendTasks = async () => {
    if (selectedPatientIds.length === 0 || !distributeModal.questionnaire) return;
    setIsSending(true);
    try {
      const patientData = selectedPatientIds.map(pid => {
        const p = patients.find(pt => (pt._openid || pt.id) === pid);
        return { id: pid, name: p?.nickName || p?.name || '患者' };
      });
      await api.distributeQuestionnaire(distributeModal.questionnaire.id, patientData);
      setDistributeModal({ isOpen: false, questionnaire: null });
      showFeedback('success', `已成功向 ${selectedPatientIds.length} 位患者下发问卷`);
      fetchQuestionnaires();
    } catch (err) {
      console.error(err);
      showFeedback('error', '下发失败，请重试');
    } finally {
      setIsSending(false);
    }
  };

  const togglePatientSelection = (id: string) => {
    if (selectedPatientIds.includes(id)) {
      setSelectedPatientIds(selectedPatientIds.filter(pid => pid !== id));
    } else {
      setSelectedPatientIds([...selectedPatientIds, id]);
    }
  };

  const toggleAllPatients = () => {
    if (selectedPatientIds.length === patients.length) {
      setSelectedPatientIds([]);
    } else {
      setSelectedPatientIds(patients.map(p => p._openid || p.id));
    }
  };

  // --- Editor Functions ---
  const addQuestion = (type: Question['type']) => {
    if (!editingData) return;
    const newQ: Question = {
      id: `q_${Date.now()}`,
      type,
      title: '',
      required: false,
      options: type.includes('choice') ? [{ id: `opt_${Date.now()}_1`, label: '选项1' }] : undefined
    };
    setEditingData({ 
      ...editingData, 
      questions: [...(editingData.questions || []), newQ] 
    });
  };

  const updateQuestion = (id: string, updates: Partial<Question>) => {
    if (!editingData) return;
    setEditingData({
      ...editingData,
      questions: editingData.questions?.map(q => q.id === id ? { ...q, ...updates } : q)
    });
  };

  const removeQuestion = (id: string) => {
    if (!editingData) return;
    setEditingData({
      ...editingData,
      questions: editingData.questions?.filter(q => q.id !== id)
    });
  };

  if (viewMode === 'edit' && editingData) {
    return (
      <div className="space-y-6">
        {feedbackMsg && (
          <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl shadow-lg text-sm font-medium ${
            feedbackMsg.type === 'error' ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-green-50 text-green-700 border border-green-200'
          }`}>
            {feedbackMsg.text}
          </div>
        )}
        {/* Editor Top Bar */}
        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex items-center justify-between sticky top-0 z-10">
          <div className="flex items-center gap-4 flex-1">
            <button 
              onClick={() => setViewMode('list')} 
              className="p-2 hover:bg-slate-100 rounded-lg text-slate-500 transition-colors"
            >
              <ArrowLeft size={20} />
            </button>
            <input 
              value={editingData.title}
              onChange={e => setEditingData({...editingData, title: e.target.value})}
              className="text-xl font-bold text-slate-800 bg-transparent border-none outline-none focus:ring-2 focus:ring-primary-500 rounded px-2 py-1 w-full max-w-md"
              placeholder="请输入问卷标题"
            />
          </div>
          <div className="flex items-center gap-4">
            <select 
              value={editingData.type}
              onChange={e => setEditingData({...editingData, type: e.target.value as any})}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:border-primary-500"
            >
              <option value="Survey">普通调查</option>
              <option value="Scale">量表评分</option>
            </select>
            <select 
              value={editingData.status}
              onChange={e => setEditingData({...editingData, status: e.target.value as any})}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:border-primary-500"
            >
              <option value="Draft">草稿</option>
              <option value="Published">已发布</option>
            </select>
            <button 
              onClick={handleSaveQuestionnaire}
              className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 font-medium shadow-sm transition-colors"
            >
              保存问卷
            </button>
          </div>
        </div>

        {/* Questions List */}
        <div className="max-w-3xl mx-auto space-y-6 pb-20">
          {editingData.questions?.map((q, index) => (
            <div key={q.id} className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 relative group transition-all hover:border-primary-300">
              <div className="absolute right-4 top-4 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                <button onClick={() => removeQuestion(q.id)} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors" title="删除题目">
                  <Trash2 size={16} />
                </button>
              </div>
              
              <div className="flex gap-4 items-start mb-4">
                <div className="flex flex-col items-center mt-2 cursor-move text-slate-300 hover:text-slate-500">
                  <GripVertical size={16} />
                  <span className="text-sm font-bold mt-1">{index + 1}.</span>
                </div>
                <div className="flex-1 space-y-4">
                  <input 
                    value={q.title}
                    onChange={e => updateQuestion(q.id, { title: e.target.value })}
                    placeholder="请输入题目标题"
                    className="w-full text-lg font-medium text-slate-800 bg-slate-50 border border-transparent hover:border-slate-200 focus:border-primary-500 focus:bg-white outline-none rounded-lg px-3 py-2 transition-all"
                  />
                  
                  {/* Options for Choice types */}
                  {(q.type === 'single_choice' || q.type === 'multiple_choice') && (
                    <div className="space-y-2 pl-2">
                      {q.options?.map((opt, optIndex) => (
                        <div key={opt.id} className="flex items-center gap-2 group/opt">
                          <div className={`w-4 h-4 border border-slate-300 ${q.type === 'single_choice' ? 'rounded-full' : 'rounded-sm'}`}></div>
                          <input 
                            value={opt.label}
                            onChange={e => {
                              const newOpts = [...(q.options || [])];
                              newOpts[optIndex].label = e.target.value;
                              updateQuestion(q.id, { options: newOpts });
                            }}
                            className="flex-1 bg-transparent border-b border-dashed border-slate-200 focus:border-primary-500 outline-none px-1 py-1 text-sm transition-colors"
                            placeholder={`选项 ${optIndex + 1}`}
                          />
                          <button 
                            onClick={() => {
                              const newOpts = q.options?.filter(o => o.id !== opt.id);
                              updateQuestion(q.id, { options: newOpts });
                            }}
                            className="text-slate-300 hover:text-red-500 opacity-0 group-hover/opt:opacity-100 transition-opacity"
                          >
                            <X size={16} />
                          </button>
                        </div>
                      ))}
                      <button 
                        onClick={() => {
                          const newOpts = [...(q.options || []), { id: `opt_${Date.now()}`, label: `选项 ${(q.options?.length || 0) + 1}` }];
                          updateQuestion(q.id, { options: newOpts });
                        }}
                        className="text-sm text-primary-600 hover:text-primary-700 flex items-center gap-1 mt-3 px-2 py-1 rounded hover:bg-primary-50 transition-colors w-fit"
                      >
                        <Plus size={14} /> 添加选项
                      </button>
                    </div>
                  )}

                  {q.type === 'text' && (
                    <div className="pl-2">
                      <div className="w-full h-24 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-center text-slate-400 text-sm">
                        用户文本输入区
                      </div>
                    </div>
                  )}

                  {q.type === 'rating' && (
                    <div className="pl-2 flex gap-4">
                      {[1, 2, 3, 4, 5].map(star => (
                        <div key={star} className="w-10 h-10 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-500 font-medium">
                          {star}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-between items-center pt-4 border-t border-slate-100 mt-4">
                <select 
                  value={q.type}
                  onChange={e => {
                    const newType = e.target.value as any;
                    let newOpts = q.options;
                    if (newType.includes('choice') && (!newOpts || newOpts.length === 0)) {
                      newOpts = [{ id: `opt_${Date.now()}`, label: '选项1' }];
                    }
                    updateQuestion(q.id, { type: newType, options: newOpts });
                  }}
                  className="text-sm bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 outline-none focus:border-primary-500 text-slate-600"
                >
                  <option value="single_choice">单选题</option>
                  <option value="multiple_choice">多选题</option>
                  <option value="text">问答题</option>
                  <option value="rating">评分题</option>
                </select>

                <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer hover:text-slate-800">
                  <input 
                    type="checkbox" 
                    checked={q.required}
                    onChange={e => updateQuestion(q.id, { required: e.target.checked })}
                    className="rounded text-primary-600 focus:ring-primary-500 w-4 h-4"
                  />
                  此题必填
                </label>
              </div>
            </div>
          ))}

          {(!editingData.questions || editingData.questions.length === 0) && (
            <div className="text-center py-12 bg-slate-50 rounded-xl border-2 border-dashed border-slate-200">
              <p className="text-slate-500 mb-2">这份问卷还没有任何题目</p>
              <p className="text-sm text-slate-400">请使用下方工具栏添加题目</p>
            </div>
          )}

          {/* Add Question Toolbar */}
          <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex justify-center gap-4 sticky bottom-6">
            <button onClick={() => addQuestion('single_choice')} className="flex items-center gap-1 px-4 py-2 text-sm font-medium text-slate-600 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors border border-slate-200 hover:border-primary-200">
              <Plus size={16} /> 单选题
            </button>
            <button onClick={() => addQuestion('multiple_choice')} className="flex items-center gap-1 px-4 py-2 text-sm font-medium text-slate-600 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors border border-slate-200 hover:border-primary-200">
              <Plus size={16} /> 多选题
            </button>
            <button onClick={() => addQuestion('text')} className="flex items-center gap-1 px-4 py-2 text-sm font-medium text-slate-600 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors border border-slate-200 hover:border-primary-200">
              <Plus size={16} /> 问答题
            </button>
            <button onClick={() => addQuestion('rating')} className="flex items-center gap-1 px-4 py-2 text-sm font-medium text-slate-600 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors border border-slate-200 hover:border-primary-200">
              <Plus size={16} /> 评分题
            </button>
          </div>
        </div>
      </div>
    );
  }

  // --- List View ---
  return (
    <div className="space-y-6">
      {feedbackMsg && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl shadow-lg text-sm font-medium ${
          feedbackMsg.type === 'error' ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-green-50 text-green-700 border border-green-200'
        }`}>
          {feedbackMsg.text}
        </div>
      )}
      {/* Top Toolbar */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-4 w-full md:w-auto">
          <button 
            onClick={() => handleOpenEditor()}
            className="flex items-center justify-center px-4 py-2.5 bg-primary-600 text-white rounded-xl hover:bg-primary-700 font-medium shadow-sm shadow-primary-500/30 transition-colors whitespace-nowrap"
          >
            <Plus size={18} className="mr-2" />
            新建问卷
          </button>
          <div className="text-sm text-slate-500 hidden md:block">
            共 {questionnaires.length} 个问卷模板
          </div>
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
             <Search className="absolute left-3 top-2.5 text-slate-400" size={18} />
             <input 
               type="text" 
               placeholder="搜索问卷标题..." 
               value={searchTerm}
               onChange={(e) => setSearchTerm(e.target.value)}
               className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
             />
          </div>
        </div>
      </div>

      {/* Grid List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredQuestionnaires.map((item) => (
          <div key={item.id} className="bg-white rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow group overflow-hidden flex flex-col">
            <div className="p-6 flex-1">
              <div className="flex justify-between items-start mb-4">
                <div className={`p-3 rounded-xl ${item.type === 'Scale' ? 'bg-blue-50 text-blue-600' : 'bg-purple-50 text-purple-600'}`}>
                  <FileText size={24} />
                </div>
                <div className={`px-2.5 py-1 rounded-full text-xs font-medium border ${
                  item.status === 'Published' 
                    ? 'bg-green-50 text-green-700 border-green-100' 
                    : 'bg-slate-50 text-slate-500 border-slate-100'
                }`}>
                  {item.status === 'Published' ? '已发布' : '草稿'}
                </div>
              </div>
              
              <h3 
                onClick={() => handleOpenEditor(item)}
                className="text-lg font-bold text-slate-800 mb-2 group-hover:text-primary-600 transition-colors cursor-pointer"
              >
                {item.title}
              </h3>
              
              <div className="flex items-center gap-4 text-xs text-slate-500 mb-4">
                <span>{item.questionCount} 道题目</span>
                <span>•</span>
                <span>{item.type === 'Scale' ? '量表评分' : '普通调查'}</span>
              </div>

              <div className="flex items-center justify-between text-xs text-slate-400 pt-4 border-t border-slate-50">
                <div className="flex items-center">
                  <Clock size={14} className="mr-1" />
                  {item.updateDate} 更新
                </div>
                <div className="flex items-center">
                  <CheckCircle2 size={14} className="mr-1" />
                  {item.usageCount} 次使用
                </div>
              </div>
            </div>

            {/* Action Bar */}
            <div className="bg-slate-50 px-4 py-3 flex justify-between items-center border-t border-slate-100">
               <div className="flex gap-3">
                 <button 
                   onClick={() => handleOpenEditor(item)}
                   className="text-slate-500 hover:text-primary-600 text-xs font-medium flex items-center transition-colors"
                   title="编辑问卷"
                 >
                   <Edit2 size={14} className="mr-1" /> 编辑
                 </button>
                 <button 
                   onClick={() => handleCopy(item)}
                   className="text-slate-500 hover:text-primary-600 text-xs font-medium flex items-center transition-colors"
                   title="复制问卷"
                 >
                   <Copy size={14} className="mr-1" /> 复制
                 </button>
               </div>
               <div className="flex gap-3">
                 {item.status === 'Published' && (
                   <>
                     <button 
                       className="text-slate-500 hover:text-green-600 text-xs font-medium flex items-center transition-colors"
                       title="定向下发/生成链接"
                       onClick={() => handleOpenDistribute(item)}
                     >
                       <Share2 size={14} className="mr-1" /> 分发
                     </button>
                     <button 
                       className="text-slate-500 hover:text-blue-600 text-xs font-medium flex items-center transition-colors"
                       title="导出为PDF/Word文档"
                       onClick={() => showFeedback('success', '导出功能开发中，敬请期待')}
                     >
                       <Download size={14} className="mr-1" /> 导出
                     </button>
                   </>
                 )}
                 <button 
                   onClick={() => handleDelete(item.id)}
                   className="text-slate-400 hover:text-red-600 text-xs font-medium flex items-center transition-colors"
                   title="删除问卷"
                 >
                   <Trash2 size={14} />
                 </button>
               </div>
            </div>
          </div>
        ))}

        {/* Create New Card Placeholder */}
        <button 
          onClick={() => handleOpenEditor()}
          className="border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center p-6 text-slate-400 hover:border-primary-400 hover:text-primary-600 hover:bg-primary-50 transition-all min-h-[200px]"
        >
          <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mb-3 group-hover:bg-white">
            <Plus size={24} />
          </div>
          <span className="font-medium">创建新问卷</span>
        </button>
      </div>

      {/* Distribution Modal */}
      {distributeModal.isOpen && distributeModal.questionnaire && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <div>
                <h3 className="text-lg font-bold text-slate-800">分发问卷</h3>
                <p className="text-sm text-slate-500 mt-1">{distributeModal.questionnaire.title}</p>
              </div>
              <button 
                onClick={() => setDistributeModal({ isOpen: false, questionnaire: null })}
                className="text-slate-400 hover:text-slate-600 p-2 hover:bg-slate-200 rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-slate-100 px-6 pt-4 gap-6">
              <button 
                onClick={() => setDistributeTab('targeted')}
                className={`pb-3 text-sm font-medium border-b-2 transition-colors ${distributeTab === 'targeted' ? 'border-primary-600 text-primary-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
              >
                定向下发 (推荐)
              </button>
              <button 
                onClick={() => setDistributeTab('general')}
                className={`pb-3 text-sm font-medium border-b-2 transition-colors ${distributeTab === 'general' ? 'border-primary-600 text-primary-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
              >
                通用链接/二维码
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1 bg-slate-50/30">
              {distributeTab === 'targeted' && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center bg-blue-50 text-blue-700 p-3 rounded-lg text-sm">
                    <div className="flex items-center gap-2">
                      <Send size={16} />
                      <span>选中的患者将在微信收到服务通知，并在小程序“待办任务”中看到此问卷。</span>
                    </div>
                  </div>
                  
                  <div className="border border-slate-200 rounded-xl bg-white overflow-hidden">
                    <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex justify-between items-center">
                      <label className="flex items-center gap-2 text-sm font-medium text-slate-700 cursor-pointer">
                        <input 
                          type="checkbox" 
                          checked={patients.length > 0 && selectedPatientIds.length === patients.length}
                          onChange={toggleAllPatients}
                          className="rounded text-primary-600 focus:ring-primary-500 w-4 h-4"
                        />
                        全选患者 ({selectedPatientIds.length}/{patients.length})
                      </label>
                    </div>
                    <div className="max-h-64 overflow-y-auto p-2">
                      {patients.length === 0 ? (
                        <div className="text-center py-8 text-slate-400 text-sm">加载患者列表中...</div>
                      ) : (
                        <div className="grid grid-cols-2 gap-2">
                          {patients.map(p => {
                            const pid = p._openid || p.id;
                            return (
                              <label key={pid} className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${selectedPatientIds.includes(pid) ? 'border-primary-500 bg-primary-50/50' : 'border-slate-100 hover:bg-slate-50'}`}>
                                <input 
                                  type="checkbox" 
                                  checked={selectedPatientIds.includes(pid)}
                                  onChange={() => togglePatientSelection(pid)}
                                  className="rounded text-primary-600 focus:ring-primary-500 w-4 h-4"
                                />
                                <div>
                                  <div className="text-sm font-medium text-slate-800">{p.name || p.nickName}</div>
                                  <div className="text-xs text-slate-500">{p.gender === 'Male' ? '男' : '女'} · {p.age || '--'}岁</div>
                                </div>
                              </label>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex justify-end pt-4">
                    <button 
                      onClick={handleSendTasks}
                      disabled={selectedPatientIds.length === 0 || isSending}
                      className="flex items-center px-6 py-2.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 font-medium shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isSending ? '下发中...' : `确认下发 (${selectedPatientIds.length}人)`}
                    </button>
                  </div>
                </div>
              )}

              {distributeTab === 'general' && (
                <div className="space-y-6 flex flex-col items-center py-6">
                  <div className="w-48 h-48 bg-white border-2 border-slate-100 rounded-2xl flex items-center justify-center p-4 shadow-sm">
                    {/* Mock QR Code */}
                    <QrCode size={120} className="text-slate-800" />
                  </div>
                  <p className="text-sm text-slate-500 text-center max-w-sm">
                    患者可以使用微信扫一扫上方小程序码，直接进入问卷填写页面。
                  </p>
                  
                  <div className="w-full max-w-md bg-white border border-slate-200 rounded-xl p-4">
                    <div className="text-xs font-medium text-slate-500 mb-2">小程序页面路径</div>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 bg-slate-50 px-3 py-2 rounded text-sm text-slate-700 select-all">
                        pages/questionnaire/detail?id={distributeModal.questionnaire.id}
                      </code>
                      <button
                        onClick={() => {
                          const path = `pages/questionnaire/detail?id=${distributeModal.questionnaire?.id}`;
                          navigator.clipboard.writeText(path).then(
                            () => showFeedback('success', '路径已复制到剪贴板'),
                            () => showFeedback('error', '复制失败，请手动选中复制')
                          );
                        }}
                        className="p-2 text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                        title="复制路径"
                      >
                        <Copy size={18} />
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {questionnaireToDelete && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden p-6">
            <h3 className="text-lg font-bold text-slate-800 mb-2">确认删除</h3>
            <p className="text-slate-600 mb-6">确定要删除这个问卷吗？此操作不可恢复。</p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setQuestionnaireToDelete(null)}
                className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors font-medium"
              >
                取消
              </button>
              <button
                onClick={confirmDeleteQuestionnaire}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
              >
                确认删除
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default QuestionnaireDesign;