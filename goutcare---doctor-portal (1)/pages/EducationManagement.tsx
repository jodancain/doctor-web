import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Filter, MoreHorizontal, Download, ChevronDown, Edit, Trash2, Eye, EyeOff, BookOpen, Clock, FileText, Image as ImageIcon, XCircle } from 'lucide-react';
import { api } from '../api';

interface EducationArticle {
  id: string;
  title: string;
  category: '全部' | '饮食' | '药物' | '基础' | '生活';
  readTime: number; // in minutes
  views: number;
  status: '已发布' | '草稿';
  time: string;
  coverUrl?: string;
  content?: string;
}

const categories = ['全部', '饮食', '药物', '基础', '生活'] as const;

export default function EducationManagement() {
  const navigate = useNavigate();
  const [articles, setArticles] = useState<EducationArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<typeof categories[number]>('全部');

  const fetchArticles = async () => {
    try {
      setLoading(true);
      const res = await api.getEducationArticles({ 
        category: selectedCategory === '全部' ? undefined : selectedCategory,
        q: searchTerm || undefined
      });
      setArticles(res.items || []);
    } catch (err) {
      console.error('Failed to fetch articles:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchArticles();
  }, [selectedCategory, searchTerm]);

  const handleOpenModal = (article?: EducationArticle) => {
    if (article) {
      navigate(`/system/education/edit/${article.id}`);
    } else {
      navigate('/system/education/new');
    }
  };

  const handleSave = async () => {
    // Moved to ArticleEditor
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('确定要删除这篇文章吗？')) {
      try {
        await api.deleteEducationArticle(id);
        fetchArticles();
      } catch (err) {
        console.error('Failed to delete article:', err);
        alert('删除失败，请重试');
      }
    }
  };

  const toggleStatus = async (article: EducationArticle) => {
    try {
      const newStatus = article.status === '已发布' ? '草稿' : '已发布';
      await api.updateEducationArticle(article.id, { status: newStatus });
      fetchArticles();
    } catch (err) {
      console.error('Failed to toggle status:', err);
      alert('状态切换失败，请重试');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Description */}
      <div className="bg-gradient-to-r from-primary-50 to-primary-100/50 p-6 rounded-2xl border border-primary-100/50">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-white rounded-xl shadow-sm text-primary-600">
            <BookOpen size={24} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-800 mb-1">医院宣教知识库管理</h2>
            <p className="text-slate-600 text-sm">管理和发布患者端小程序可见的健康科普内容。支持按分类发布、草稿保存和阅读量统计。</p>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-2 w-full md:w-auto">
          <button 
            onClick={() => handleOpenModal()}
            className="flex items-center justify-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 font-medium shadow-sm transition-colors text-sm whitespace-nowrap"
          >
            <Plus size={16} className="mr-2" />
            发布新文章
          </button>
        </div>

        <div className="flex flex-col md:flex-row items-center gap-2 w-full md:w-auto">
          {/* Category Tabs inside Toolbar */}
          <div className="flex bg-slate-50 p-1 rounded-lg border border-slate-100">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                  selectedCategory === cat 
                    ? 'bg-white text-primary-600 shadow-sm' 
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="relative flex-1 w-full md:w-64 ml-2">
             <Search className="absolute left-3 top-2.5 text-slate-400" size={18} />
             <input 
               type="text" 
               value={searchTerm}
               onChange={(e) => setSearchTerm(e.target.value)}
               placeholder="搜索文章标题..."
               className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
             />
          </div>
        </div>
      </div>

      {/* Grid View for Articles */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {loading ? (
          <div className="col-span-full py-20 text-center text-slate-500">正在加载文章...</div>
        ) : articles.length > 0 ? (
          articles.map((item) => (
            <div key={item.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all flex flex-col overflow-hidden group">
              {/* Cover Image Placeholder */}
              <div className="h-40 bg-slate-100 relative overflow-hidden flex items-center justify-center border-b border-slate-50">
                {item.coverUrl ? (
                  <img src={item.coverUrl} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                ) : (
                  <div className="text-slate-300 flex flex-col items-center">
                    <ImageIcon size={32} className="mb-2" />
                    <span className="text-xs font-medium">无封面图</span>
                  </div>
                )}
                
                {/* Status Badge */}
                <div className="absolute top-3 left-3 flex gap-2">
                  <span className={`px-2.5 py-1 text-xs font-bold rounded-full shadow-sm backdrop-blur-md ${
                    item.category === '饮食' ? 'bg-emerald-500/90 text-white' :
                    item.category === '药物' ? 'bg-blue-500/90 text-white' :
                    item.category === '基础' ? 'bg-purple-500/90 text-white' :
                    'bg-orange-500/90 text-white'
                  }`}>
                    {item.category}
                  </span>
                  {item.status === '草稿' && (
                    <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-slate-800/80 text-white shadow-sm backdrop-blur-md">
                      草稿
                    </span>
                  )}
                </div>
                
                {/* Actions Overlay */}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3 backdrop-blur-sm">
                  <button 
                    onClick={() => handleOpenModal(item)}
                    className="p-2 bg-white text-slate-700 rounded-full hover:bg-primary-50 hover:text-primary-600 transition-colors shadow-sm"
                    title="编辑文章"
                  >
                    <Edit size={18} />
                  </button>
                  <button 
                    onClick={() => toggleStatus(item)}
                    className="p-2 bg-white text-slate-700 rounded-full hover:bg-primary-50 hover:text-primary-600 transition-colors shadow-sm"
                    title={item.status === '已发布' ? '转为草稿' : '发布'}
                  >
                    {item.status === '已发布' ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                  <button 
                    onClick={() => handleDelete(item.id)}
                    className="p-2 bg-white text-red-600 rounded-full hover:bg-red-50 transition-colors shadow-sm"
                    title="删除文章"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
              
              <div className="p-5 flex-1 flex flex-col">
                <h3 className="text-base font-bold text-slate-800 mb-2 line-clamp-2 leading-snug group-hover:text-primary-600 transition-colors">
                  {item.title}
                </h3>
                <p className="text-sm text-slate-500 line-clamp-2 mb-4 flex-1">
                  {item.content ? item.content.replace(/<[^>]*>?/gm, '') : ''}
                </p>
                
                <div className="flex items-center justify-between text-xs text-slate-400 mt-auto pt-4 border-t border-slate-50">
                  <div className="flex items-center gap-1.5">
                    <Clock size={14} />
                    <span>{item.readTime}分钟阅读</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Eye size={14} />
                    <span>{(item.views || 0).toLocaleString()} 次浏览</span>
                  </div>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="col-span-full flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-slate-100 border-dashed">
            <FileText size={48} className="text-slate-200 mb-4" />
            <p className="text-slate-500 font-medium">没有找到相关文章</p>
            <p className="text-slate-400 text-sm mt-1">您可以点击"发布新文章"来创建内容</p>
          </div>
        )}
      </div>
    </div>
  );
}
