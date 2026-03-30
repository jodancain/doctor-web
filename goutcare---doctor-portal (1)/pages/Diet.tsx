import React, { useState } from 'react';
import { Search, Info } from 'lucide-react';
import { FOOD_DATABASE } from '../constants';
import { FoodItem } from '../types';

const Diet: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredFood = FOOD_DATABASE.filter(item => 
    item.name.includes(searchTerm)
  );

  const getPurineColor = (level: string) => {
    switch(level) {
      case 'low': return 'bg-success text-white';
      case 'medium': return 'bg-warning text-white';
      case 'high': return 'bg-danger text-white';
      default: return 'bg-slate-200';
    }
  };

  const getPurineLabel = (level: string) => {
    switch(level) {
      case 'low': return '低嘌呤 (绿灯)';
      case 'medium': return '中嘌呤 (黄灯)';
      case 'high': return '高嘌呤 (红灯)';
      default: return '未知';
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <h3 className="text-lg font-bold text-slate-800">食物嘌呤查询</h3>
            <p className="text-sm text-slate-500">输入食物名称，快速判断是否可食用</p>
          </div>
          <div className="relative w-full md:w-64">
            <input
              type="text"
              placeholder="例如：牛肉、豆腐..."
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <Search className="absolute left-3 top-2.5 text-slate-400" size={18} />
          </div>
        </div>

        {/* Legend */}
        <div className="flex gap-4 mb-6 text-xs text-slate-600 bg-slate-50 p-3 rounded-lg">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-success"></div>
            <span>放心吃 (低)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-warning"></div>
            <span>适量吃 (中)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-danger"></div>
            <span>避免吃 (高)</span>
          </div>
        </div>

        {/* List */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredFood.map((food) => (
            <div key={food.id} className="flex items-center justify-between p-4 border border-slate-100 rounded-xl hover:shadow-md transition-shadow">
              <div>
                <h4 className="font-bold text-slate-800">{food.name}</h4>
                <p className="text-xs text-slate-400 mt-1">{food.purineValue} mg/100g</p>
              </div>
              <span className={`px-3 py-1 rounded-full text-xs font-bold shadow-sm ${getPurineColor(food.purineLevel)}`}>
                {food.purineLevel === 'low' && '绿灯行'}
                {food.purineLevel === 'medium' && '黄灯缓'}
                {food.purineLevel === 'high' && '红灯停'}
              </span>
            </div>
          ))}
          {filteredFood.length === 0 && (
            <div className="col-span-full py-10 text-center text-slate-400">
              未找到相关食物，试试其他关键词
            </div>
          )}
        </div>
      </div>

      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-2xl border border-blue-100 flex items-start gap-4">
        <div className="p-2 bg-white rounded-lg shadow-sm text-primary-600">
          <Info size={24} />
        </div>
        <div>
          <h4 className="font-bold text-primary-800 mb-2">饮食小贴士</h4>
          <p className="text-sm text-primary-700 leading-relaxed">
            控制嘌呤摄入是预防痛风发作的关键。建议每日饮水 2000ml 以上，促进尿酸排泄。
            避免饮用含糖饮料和酒精，特别是啤酒。
          </p>
        </div>
      </div>
    </div>
  );
};

export default Diet;
