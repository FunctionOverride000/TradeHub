"use client";

import React from 'react';
import { X, CheckCircle2, AlertTriangle, TrendingUp } from 'lucide-react';
import { useLanguage } from '@/lib/LanguageContext';

type PopupProps = {
  isOpen: boolean;
  type: 'success' | 'error' | 'info';
  title: string;
  message: string;
  onClose: () => void;
};

export default function CustomPopup({ isOpen, type, title, message, onClose }: PopupProps) {
  const { t } = useLanguage();
  if (!isOpen) return null;

  const colors = {
    success: { icon: 'text-[#0ECB81]', bg: 'bg-[#0ECB81]/10', border: 'border-[#0ECB81]/20' },
    error: { icon: 'text-[#F6465D]', bg: 'bg-[#F6465D]/10', border: 'border-[#F6465D]/20' },
    info: { icon: 'text-[#FCD535]', bg: 'bg-[#FCD535]/10', border: 'border-[#FCD535]/20' }
  };

  const style = colors[type];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md transition-all duration-300 animate-in fade-in">
      <div className="bg-[#1E2329] border border-[#2B3139] w-full max-w-sm rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.5)] p-10 relative transform transition-all scale-100 overflow-hidden text-center">
        <div className={`absolute top-0 right-0 w-24 h-24 rounded-full blur-[40px] opacity-10 ${style.bg}`}></div>
        
        <button onClick={onClose} className="absolute top-6 right-6 text-[#848E9C] hover:text-white transition-colors">
          <X size={20} />
        </button>

        <div className="flex flex-col items-center relative z-10">
          <div className={`w-20 h-20 rounded-3xl flex items-center justify-center mb-6 ${style.bg} ${style.border} border shadow-lg`}>
            {type === 'success' && <CheckCircle2 className={`w-10 h-10 ${style.icon}`} />}
            {type === 'error' && <AlertTriangle className={`w-10 h-10 ${style.icon}`} />}
            {type === 'info' && <TrendingUp className={`w-10 h-10 ${style.icon}`} />}
          </div>

          <h3 className="text-2xl font-black text-[#EAECEF] mb-3 tracking-tighter uppercase italic leading-none">{title}</h3>
          <p className="text-[#848E9C] text-sm leading-relaxed mb-10 font-medium italic">
            {message}
          </p>

          <button 
            onClick={onClose}
            className="w-full bg-[#2B3139] hover:bg-[#363c45] text-[#EAECEF] py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all active:scale-95 border border-[#363c45]"
          >
            {t.auth.popup_understand}
          </button>
        </div>
      </div>
    </div>
  );
}