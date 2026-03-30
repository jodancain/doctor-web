import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Save, LayoutTemplate, Clock, Image as ImageIcon } from 'lucide-react';
import Editor from 'react-simple-wysiwyg';
import { api } from '../api';

const categories = ['饮食', '药物', '基础', '生活'] as const;

export default function ArticleEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(!!id);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    category: '饮食' as any,
    readTime: 3,
    status: '已发布' as '已发布' | '草稿',
    coverUrl: '',
    content: ''
  });

  useEffect(() => {
    if (id) {
      api.getEducationArticle(id).then(data => {
        setFormData({
          title: data.title || '',
          category: data.category || '饮食',
          readTime: data.readTime || 3,
          status: data.status || '已发布',
          coverUrl: data.coverUrl || '',
          content: data.content || ''
        });
        setLoading(false);
      }).catch(err => {
        console.error(err);
        alert('获取文章失败');
        navigate('/system/education');
      });
    }
  }, [id, navigate]);

  const handleSave = async (statusOverride?: '已发布' | '草稿') => {
    if (!formData.title) {
      alert('请输入文章标题');
      return;
    }
    if (!formData.content) {
      alert('请输入文章内容');
      return;
    }

    const payload = { ...formData };
    if (statusOverride) {
      payload.status = statusOverride;
    }

    setSaving(true);
    try {
      if (id) {
        await api.updateEducationArticle(id, payload);
      } else {
        await api.createEducationArticle(payload);
      }
      navigate('/system/education');
    } catch (error) {
      console.error(error);
      alert('保存失败');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-8 text-center text-slate-500 mt-20 text-lg">正在加载文档内容...</div>;

  return (
    <div className="flex flex-col min-h-[calc(100vh-100px)] bg-[#f8f9fa] -m-8 px-4 sm:px-8 py-6 relative">
      {/* 顶部工具栏 - 固定在顶部 */}
      <div className="sticky top-0 z-50 bg-[#f8f9fa]/80 backdrop-blur-xl pb-4 pt-4 -mt-6 flex items-center justify-between border-b border-slate-200/50 shadow-[0_4px_20px_-10px_rgba(0,0,0,0.05)]">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => navigate('/system/education')}
            className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-200/50 rounded-lg transition-colors flex items-center gap-2"
          >
            <ArrowLeft size={18} />
            <span className="text-sm font-medium">返回</span>
          </button>
          <div className="h-4 w-px bg-slate-300"></div>
          <div className="text-sm font-medium text-slate-500 flex items-center gap-2">
            <LayoutTemplate size={16} />
            {id ? '编辑在线文档' : '新建在线文档'}
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <button 
            onClick={() => handleSave('草稿')}
            disabled={saving}
            className="px-5 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors shadow-sm disabled:opacity-50"
          >
            {formData.status === '草稿' ? '保存草稿' : '转为草稿'}
          </button>
          <button 
            onClick={() => handleSave('已发布')}
            disabled={saving}
            className="px-5 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 transition-colors shadow-sm flex items-center gap-2 disabled:opacity-50"
          >
            <Save size={16} />
            {saving ? '保存中...' : (formData.status === '已发布' ? '更新发布' : '立即发布')}
          </button>
        </div>
      </div>

      {/* 文档主体编辑区 (云文档沉浸式体验) */}
      <div className="flex-1 w-full max-w-4xl mx-auto mt-4 mb-10 bg-white rounded-2xl shadow-sm border border-slate-200/60 overflow-visible relative">
        
        {/* 顶部封面图区域 (可选) */}
        {formData.coverUrl && (
          <div className="w-full h-48 sm:h-64 relative group rounded-t-2xl overflow-hidden">
            <img src={formData.coverUrl} alt="封面" className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <button 
                onClick={() => setFormData({...formData, coverUrl: ''})}
                className="px-4 py-2 bg-white/20 hover:bg-white/30 backdrop-blur-md text-white rounded-lg text-sm font-medium transition-colors"
              >
                移除封面
              </button>
            </div>
          </div>
        )}

        <div className="px-8 sm:px-16 py-10 sm:py-14">
          
          {/* 添加封面按钮 (没有封面时) */}
          {!formData.coverUrl && (
            <div className="mb-6 opacity-0 hover:opacity-100 focus-within:opacity-100 transition-opacity flex items-center gap-2">
              <ImageIcon size={16} className="text-slate-400" />
              <input 
                type="text"
                placeholder="在此粘贴封面图片URL以添加题图"
                value={formData.coverUrl}
                onChange={e => setFormData({...formData, coverUrl: e.target.value})}
                className="text-sm text-slate-500 placeholder-slate-300 outline-none w-64 bg-transparent"
              />
            </div>
          )}

          {/* 文章标题 (无边框大字号) */}
          <input 
            type="text" 
            value={formData.title}
            onChange={e => setFormData({...formData, title: e.target.value})}
            placeholder="无标题文档"
            className="w-full text-4xl sm:text-5xl font-extrabold text-slate-800 placeholder-slate-200 outline-none bg-transparent mb-8 leading-tight"
          />

          {/* 文档元信息 (分类、阅读时长) */}
          <div className="flex flex-wrap items-center gap-6 mb-10 pb-8 border-b border-slate-100">
            <div className="flex items-center gap-2 group">
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">分类</div>
              <select 
                value={formData.category}
                onChange={e => setFormData({...formData, category: e.target.value})}
                className="px-2 py-1 -ml-2 text-sm font-medium text-slate-700 bg-transparent hover:bg-slate-100 rounded outline-none cursor-pointer transition-colors"
              >
                {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
              </select>
            </div>

            <div className="flex items-center gap-2 group">
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                <Clock size={12} /> 时长
              </div>
              <div className="flex items-center">
                <input 
                  type="number" 
                  min="1"
                  value={formData.readTime}
                  onChange={e => setFormData({...formData, readTime: parseInt(e.target.value) || 1})}
                  className="w-8 px-1 py-1 -ml-1 text-sm font-medium text-slate-700 bg-transparent hover:bg-slate-100 rounded outline-none text-center transition-colors"
                />
                <span className="text-sm text-slate-500 ml-1">分钟</span>
              </div>
            </div>
            
            <div className="flex items-center gap-2 ml-auto">
              <span className={`px-2.5 py-1 text-xs font-bold rounded-full ${formData.status === '已发布' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                {formData.status}
              </span>
            </div>
          </div>

          {/* 纯净富文本编辑区 */}
          <div className="cloud-doc-editor">
            <Editor 
              value={formData.content} 
              onChange={e => setFormData({...formData, content: e.target.value})} 
              containerProps={{ style: { height: 'auto', minHeight: '600px' } }}
            />
          </div>

        </div>
      </div>

      {/* 编辑器美化样式 */}
      <style>{`
        .cloud-doc-editor {
          font-size: 16px;
          line-height: 1.8;
          color: #374151;
        }
        /* Override react-simple-wysiwyg default styles to look like Notion/Yuque */
        .rsw-editor {
          border: none !important;
          border-radius: 0 !important;
          background: transparent !important;
          overflow: visible !important;
          height: auto !important;
        }
        .rsw-toolbar {
          border: 1px solid #e2e8f0 !important;
          border-radius: 12px !important;
          background: rgba(255, 255, 255, 0.95) !important;
          backdrop-filter: blur(8px) !important;
          padding: 8px 12px !important;
          margin-bottom: 24px !important;
          position: sticky;
          top: 90px;
          z-index: 40;
          box-shadow: 0 4px 12px rgba(0,0,0,0.08);
          display: flex;
          gap: 4px;
          transform: translateY(-50%);
          margin-left: auto;
          margin-right: auto;
          max-width: max-content;
        }
        .rsw-btn {
          border-radius: 6px !important;
          transition: all 0.2s !important;
          color: #4b5563 !important;
          padding: 6px !important;
        }
        .rsw-btn:hover {
          background: #f1f5f9 !important;
          color: #0f172a !important;
        }
        .rsw-ce {
          padding: 0 !important;
          min-height: 500px !important;
          outline: none !important;
          overflow: visible !important;
        }
        .rsw-ce[contenteditable="true"] {
          min-height: 500px !important;
        }
        .rsw-ce h1, .rsw-ce h2, .rsw-ce h3 {
          font-weight: 700;
          color: #111827;
          margin-top: 1.5em;
          margin-bottom: 0.5em;
        }
        .rsw-ce h1 { font-size: 1.875rem; }
        .rsw-ce h2 { font-size: 1.5rem; }
        .rsw-ce h3 { font-size: 1.25rem; }
        .rsw-ce p {
          margin-bottom: 1.2em;
        }
        .rsw-ce img {
          max-width: 100%;
          border-radius: 8px;
          margin: 1.5em 0;
        }
        .rsw-ce ul {
          list-style-type: disc;
          padding-left: 1.5em;
          margin-bottom: 1em;
        }
        .rsw-ce ol {
          list-style-type: decimal;
          padding-left: 1.5em;
          margin-bottom: 1em;
        }
        .rsw-ce a {
          color: #2563eb;
          text-decoration: underline;
        }
        /* Custom placeholder behavior */
        .rsw-ce:empty:before {
          content: '开始编写你的文档正文 (支持直接粘贴图片或带格式的文本)...';
          color: #9ca3af;
          pointer-events: none;
          display: block;
        }
      `}</style>
    </div>
  );
}