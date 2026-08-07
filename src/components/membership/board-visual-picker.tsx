'use client';

import React from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { 
  Users, Heart, GraduationCap, DollarSign, Calendar, Flame, Home, 
  Sparkles, ShieldCheck, Check, Crosshair, Award, Layers, Target, Compass
} from 'lucide-react';

interface BoardVisualPickerProps {
  backgroundColor: string;
  footerColor: string;
  textColor: string;
  footerTextColor: string;
  icon: string;
  onChange: (data: {
    backgroundColor?: string;
    footerColor?: string;
    textColor?: string;
    footerTextColor?: string;
    icon?: string;
  }) => void;
}

const PRESET_BG_COLORS = [
  { name: 'Slate Dark', bg: '#1e293b', footer: '#0f172a', text: '#ffffff', footerText: '#94a3b8' },
  { name: 'Emerald Gradient', bg: '#065f46', footer: '#044e37', text: '#ffffff', footerText: '#a7f3d0' },
  { name: 'Royal Indigo', bg: '#3730a3', footer: '#2e2a85', text: '#ffffff', footerText: '#c7d2fe' },
  { name: 'Crimson Wine', bg: '#881337', footer: '#6b0e2b', text: '#ffffff', footerText: '#fecdd3' },
  { name: 'Amber Sunset', bg: '#92400e', footer: '#78350f', text: '#ffffff', footerText: '#fde68a' },
  { name: 'Teal Ocean', bg: '#115e59', footer: '#0f4c47', text: '#ffffff', footerText: '#99f6e4' },
];

const AVAILABLE_ICONS = [
  { name: 'Users', Icon: Users },
  { name: 'Heart', Icon: Heart },
  { name: 'GraduationCap', Icon: GraduationCap },
  { name: 'DollarSign', Icon: DollarSign },
  { name: 'Calendar', Icon: Calendar },
  { name: 'Flame', Icon: Flame },
  { name: 'Home', Icon: Home },
  { name: 'Sparkles', Icon: Sparkles },
  { name: 'ShieldCheck', Icon: ShieldCheck },
  { name: 'Award', Icon: Award },
  { name: 'Target', Icon: Target },
];

export function BoardVisualPicker({
  backgroundColor,
  footerColor,
  textColor,
  footerTextColor,
  icon,
  onChange,
}: BoardVisualPickerProps) {
  return (
    <div className="space-y-6 bg-slate-50 dark:bg-slate-900/50 p-5 rounded-2xl border border-slate-200 dark:border-slate-800">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-black uppercase italic tracking-wider text-slate-700 dark:text-slate-300">
          Personalização Estética Independente (Estilo Eklesia)
        </h4>
        <span className="text-[10px] font-bold uppercase bg-primary/10 text-primary px-2 py-0.5 rounded-full">
          Cores & Ícone
        </span>
      </div>

      {/* Presets Rápidos */}
      <div className="space-y-2">
        <Label className="text-xs font-bold text-slate-600">Paletas Prontas Recomendadas</Label>
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
          {PRESET_BG_COLORS.map(preset => (
            <button
              key={preset.name}
              type="button"
              onClick={() => onChange({
                backgroundColor: preset.bg,
                footerColor: preset.footer,
                textColor: preset.text,
                footerTextColor: preset.footerText,
              })}
              className="group relative flex flex-col h-12 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 hover:scale-105 transition-transform"
              title={preset.name}
            >
              <div className="flex-1" style={{ backgroundColor: preset.bg }} />
              <div className="h-3" style={{ backgroundColor: preset.footer }} />
              {backgroundColor === preset.bg && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/30 text-white">
                  <Check size={14} className="stroke-[3]" />
                </div>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Seletor Fino Duplo de Cores (Fundo e Rodapé) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t pt-4 border-slate-200 dark:border-slate-800">
        <div className="space-y-3">
          <Label className="text-xs font-black uppercase text-slate-600">Bloco Principal (Corpo)</Label>
          <div className="flex gap-2 items-center">
            <input
              type="color"
              value={backgroundColor}
              onChange={e => onChange({ backgroundColor: e.target.value })}
              className="size-9 rounded-lg cursor-pointer border-0 p-0"
            />
            <Input
              value={backgroundColor}
              onChange={e => onChange({ backgroundColor: e.target.value })}
              className="h-9 text-xs font-mono"
            />
          </div>
          <div className="flex gap-2 items-center">
            <Label className="text-[11px] font-medium text-slate-500 w-24">Cor Texto:</Label>
            <input
              type="color"
              value={textColor}
              onChange={e => onChange({ textColor: e.target.value })}
              className="size-7 rounded-md cursor-pointer border-0 p-0"
            />
          </div>
        </div>

        <div className="space-y-3">
          <Label className="text-xs font-black uppercase text-slate-600">Rodapé do Cartão (Barra Inferior)</Label>
          <div className="flex gap-2 items-center">
            <input
              type="color"
              value={footerColor}
              onChange={e => onChange({ footerColor: e.target.value })}
              className="size-9 rounded-lg cursor-pointer border-0 p-0"
            />
            <Input
              value={footerColor}
              onChange={e => onChange({ footerColor: e.target.value })}
              className="h-9 text-xs font-mono"
            />
          </div>
          <div className="flex gap-2 items-center">
            <Label className="text-[11px] font-medium text-slate-500 w-24">Texto Rodapé:</Label>
            <input
              type="color"
              value={footerTextColor}
              onChange={e => onChange({ footerTextColor: e.target.value })}
              className="size-7 rounded-md cursor-pointer border-0 p-0"
            />
          </div>
        </div>
      </div>

      {/* Ícone Lucide */}
      <div className="space-y-2 border-t pt-4 border-slate-200 dark:border-slate-800">
        <Label className="text-xs font-bold text-slate-600">Ícone do Cartão</Label>
        <div className="flex flex-wrap gap-2">
          {AVAILABLE_ICONS.map(({ name, Icon }) => (
            <Button
              key={name}
              type="button"
              variant={icon === name ? 'default' : 'outline'}
              size="sm"
              onClick={() => onChange({ icon: name })}
              className="h-9 px-3 gap-1.5"
            >
              <Icon size={16} />
              <span className="text-xs font-semibold">{name}</span>
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
}
