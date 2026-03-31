import React, { useState, useEffect } from 'react';
import { Search, Filter, Eye, Download, X, FileText } from 'lucide-react';
import { QuestionnaireRecord, QuestionnaireAnswer } from '../types';
import { api } from '../api';

const QuestionnaireRecords: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [records, setRecords] = useState<QuestionnaireRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRecord, setSelectedRecord] = useState<QuestionnaireRecord | null>(null);

  const fetchRecords = async () => {
    try {
      setLoading(true);
      const res = await api.getQuestionnaireRecords({ q: searchTerm || undefined });
      setRecords(res.items || []);
    } catch (err) {
      console.error('Failed to fetch questionnaire records:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => fetchRecords(), 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const filteredRecords = records;

  const renderAnswerValue = (answer: QuestionnaireAnswer) => {
    if (Array.isArray(answer.value)) {
      return answer.value.join('、');
    }
    if (answer.type === 'rating') {
      return `${answer.value} 分`;
    }
    return answer.value;
  };

  return (
    <div className="space-y-6">
      {/* Toolbar */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-2 w-full md:w-auto">
          <button
            className="flex items-center px-4 py-2 bg-white border border-slate-200 text-slate-400 rounded-lg text-sm font-medium cursor-not-allowed"
            title="筛选功能开发中"
            disabled
          >
            <Filter size={16} className="mr-2" />
            筛选记录
          </button>
          <button
            className="flex items-center px-4 py-2 bg-white border border-slate-200 text-slate-400 rounded-lg text-sm font-medium cursor-not-allowed"
            title="导出功能开发中"
            disabled
          >
            <Download size={16} className="mr-2" />
            导出数据
          </button>
        </div>

        <div className="relative w-full md:w-64">
           <Search className="absolute left-3 top-2.5 text-slate-400" size={18} />
           <input 
             type="text" 
             placeholder="搜索患者或问卷名称..." 
             value={searchTerm}
             onChange={(e) => setSearchTerm(e.target.value)}
             className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100 transition-all"
           />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase">问卷名称</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase">患者信息</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase">提交时间</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase">结果/评分</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase">结论摘要</th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-slate-500 uppercase">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                    加载中...
                  </td>
                </tr>
              ) : filteredRecords.length > 0 ? (
                filteredRecords.map((record) => (
                  <tr key={record.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-medium text-slate-800">{record.questionnaireName}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-slate-800">{record.patientName}</div>
                      <div className="text-xs text-slate-500">ID: {record.patientId}</div>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-500">
                      {record.submitDate}
                    </td>
                    <td className="px-6 py-4">
                      {record.score ? (
                        <span className="font-bold text-primary-600 text-lg">{record.score} <span className="text-xs font-normal text-slate-400">分</span></span>
                      ) : (
                        <span className="text-sm text-slate-400">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-block px-2 py-1 bg-slate-100 rounded text-xs text-slate-600">
                        {record.result}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button 
                        onClick={() => setSelectedRecord(record)}
                        className="text-primary-600 hover:text-primary-700 hover:bg-primary-50 p-2 rounded-lg transition-colors" 
                        title="查看详情"
                      >
                        <Eye size={18} />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                    没有找到匹配的记录
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {/* Pagination placeholder */}
        <div className="px-6 py-4 border-t border-slate-100 flex justify-between items-center text-sm text-slate-500">
          <div>共 {filteredRecords.length} 条记录</div>
          <div className="flex gap-2">
            <button className="px-3 py-1 border border-slate-200 rounded disabled:opacity-50 transition-colors" disabled>上一页</button>
            <button className="px-3 py-1 border border-slate-200 rounded hover:bg-slate-50 transition-colors">下一页</button>
          </div>
        </div>
      </div>

      {/* Detail Modal */}
      {selectedRecord && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary-100 text-primary-600 rounded-lg">
                  <FileText size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-800">{selectedRecord.questionnaireName}</h3>
                  <div className="text-xs text-slate-500 flex gap-3 mt-1">
                    <span>患者: {selectedRecord.patientName}</span>
                    <span>提交时间: {selectedRecord.submitDate}</span>
                  </div>
                </div>
              </div>
              <button 
                onClick={() => setSelectedRecord(null)}
                className="text-slate-400 hover:text-slate-600 p-2 hover:bg-slate-200 rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            
            {/* Modal Body */}
            <div className="p-6 overflow-y-auto flex-1 bg-slate-50/50">
              {/* Summary Card */}
              <div className="bg-white p-4 rounded-xl border border-slate-200 mb-6 flex items-center justify-between">
                <div>
                  <div className="text-sm text-slate-500 mb-1">结论摘要</div>
                  <div className="font-medium text-slate-800">{selectedRecord.result}</div>
                </div>
                {selectedRecord.score !== undefined && (
                  <div className="text-right">
                    <div className="text-sm text-slate-500 mb-1">总分</div>
                    <div className="text-2xl font-bold text-primary-600">{selectedRecord.score}</div>
                  </div>
                )}
              </div>

              {/* Answers List */}
              <h4 className="font-bold text-slate-800 mb-4 px-1">详细答卷</h4>
              <div className="space-y-4">
                {selectedRecord.answers && selectedRecord.answers.length > 0 ? (
                  selectedRecord.answers.map((answer, index) => (
                    <div key={answer.questionId} className="bg-white p-4 rounded-xl border border-slate-200">
                      <div className="flex gap-3">
                        <span className="text-slate-400 font-medium">{index + 1}.</span>
                        <div className="flex-1">
                          <div className="font-medium text-slate-800 mb-2">{answer.questionTitle}</div>
                          <div className="text-primary-600 bg-primary-50 px-3 py-2 rounded-lg inline-block text-sm font-medium">
                            {renderAnswerValue(answer)}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-slate-500 bg-white rounded-xl border border-slate-200">
                    暂无详细答题数据
                  </div>
                )}
              </div>
            </div>
            
            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-slate-100 bg-white flex justify-end">
              <button 
                onClick={() => setSelectedRecord(null)}
                className="px-6 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors font-medium"
              >
                关闭
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default QuestionnaireRecords;