import React from 'react';
import { Search, Filter, Eye, Download } from 'lucide-react';
import { MOCK_QUESTIONNAIRE_RECORDS } from '../constants';

const QuestionnaireRecords: React.FC = () => {
  return (
    <div className="space-y-6">
      {/* Toolbar */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-2 w-full md:w-auto">
          <button className="flex items-center px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 text-sm font-medium">
            <Filter size={16} className="mr-2" />
            筛选记录
          </button>
          <button className="flex items-center px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 text-sm font-medium">
            <Download size={16} className="mr-2" />
            导出数据
          </button>
        </div>

        <div className="relative w-full md:w-64">
           <Search className="absolute left-3 top-2.5 text-slate-400" size={18} />
           <input 
             type="text" 
             placeholder="搜索患者或问卷名称..." 
             className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
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
              {MOCK_QUESTIONNAIRE_RECORDS.map((record) => (
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
                    <button className="text-primary-600 hover:text-primary-700 hover:bg-primary-50 p-2 rounded-lg transition-colors" title="查看详情">
                      <Eye size={18} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {/* Pagination placeholder */}
        <div className="px-6 py-4 border-t border-slate-100 flex justify-between items-center text-sm text-slate-500">
          <div>共 {MOCK_QUESTIONNAIRE_RECORDS.length} 条记录</div>
          <div className="flex gap-2">
            <button className="px-3 py-1 border border-slate-200 rounded disabled:opacity-50" disabled>上一页</button>
            <button className="px-3 py-1 border border-slate-200 rounded hover:bg-slate-50">下一页</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QuestionnaireRecords;