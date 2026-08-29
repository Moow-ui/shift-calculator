import React, { useState } from 'react';
import { ShiftPreset } from '../types/payroll';
import { Clock, Plus, Trash2, Edit3, AlertCircle, Check } from 'lucide-react';
import { getMinimumWage } from '../config/minimumWage';
import { calculateDailyWorkMinutes, formatMinutes } from '../lib/payroll';

interface PresetSectionProps {
  presets: ShiftPreset[];
  targetYear: number;
  onAddPreset: (preset: ShiftPreset) => void;
  onUpdatePreset: (preset: ShiftPreset) => void;
  onDeletePreset: (id: string) => void;
}

const PRESET_COLORS = [
  'bg-blue-500 text-white',
  'bg-emerald-500 text-white',
  'bg-violet-500 text-white',
  'bg-amber-500 text-white',
  'bg-rose-500 text-white',
  'bg-cyan-500 text-white',
];

export const PresetSection: React.FC<PresetSectionProps> = ({
  presets,
  targetYear,
  onAddPreset,
  onUpdatePreset,
  onDeletePreset,
}) => {
  const minWage = getMinimumWage(targetYear);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<ShiftPreset | null>(null);

  const startEditing = (preset: ShiftPreset) => {
    setEditingId(preset.id);
    setEditForm({ ...preset });
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditForm(null);
  };

  const saveEditing = () => {
    if (!editForm) return;
    onUpdatePreset(editForm);
    setEditingId(null);
    setEditForm(null);
  };

  const handleAddNew = () => {
    const newId = `preset-${Date.now()}`;
    const color = PRESET_COLORS[presets.length % PRESET_COLORS.length];
    const newPreset: ShiftPreset = {
      id: newId,
      label: `근무 ${presets.length + 1}`,
      startTime: '09:00',
      endTime: '18:00',
      breakMinutes: 60,
      hourlyWage: minWage,
      color,
    };
    onAddPreset(newPreset);
    startEditing(newPreset);
  };

  return (
    <section className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-4 sm:p-6">
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-sm">
            2
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Clock className="w-4 h-4 text-indigo-600" />
              근무 프리셋 관리
            </h2>
            <p className="text-xs text-slate-500">
              요일별 다른 근무시간과 시급(평일/주말 차등 등)을 등록합니다.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleAddNew}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm transition-colors touch-target"
        >
          <Plus className="w-4 h-4" />
          <span>프리셋 추가</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
        {presets.map((preset) => {
          const isEditing = editingId === preset.id;
          const { workMinutes } = calculateDailyWorkMinutes(
            preset.startTime,
            preset.endTime,
            preset.breakMinutes
          );
          const isBelowMinWage = preset.hourlyWage < minWage;

          if (isEditing && editForm) {
            return (
              <div
                key={preset.id}
                className="p-4 rounded-xl border-2 border-indigo-500 bg-indigo-50/20 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-indigo-900">프리셋 수정</span>
                  <div className="flex gap-1.5">
                    <button
                      type="button"
                      onClick={saveEditing}
                      className="p-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                      title="저장"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={cancelEditing}
                      className="p-1.5 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition-colors text-xs"
                    >
                      취소
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    프리셋 이름
                  </label>
                  <input
                    type="text"
                    value={editForm.label}
                    onChange={(e) =>
                      setEditForm((prev) => prev && { ...prev, label: e.target.value })
                    }
                    className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20"
                    placeholder="예: 평일 마감, 주말 오픈"
                  />
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      시작
                    </label>
                    <input
                      type="time"
                      value={editForm.startTime}
                      onChange={(e) =>
                        setEditForm((prev) => prev && { ...prev, startTime: e.target.value })
                      }
                      className="w-full px-2 py-1 text-xs bg-white border border-slate-200 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      종료
                    </label>
                    <input
                      type="time"
                      value={editForm.endTime}
                      onChange={(e) =>
                        setEditForm((prev) => prev && { ...prev, endTime: e.target.value })
                      }
                      className="w-full px-2 py-1 text-xs bg-white border border-slate-200 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      휴게(분)
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="10"
                      value={editForm.breakMinutes}
                      onChange={(e) =>
                        setEditForm(
                          (prev) =>
                            prev && {
                              ...prev,
                              breakMinutes: parseInt(e.target.value, 10) || 0,
                            }
                        )
                      }
                      className="w-full px-2 py-1 text-xs bg-white border border-slate-200 rounded-lg"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    시급 (원)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="10"
                    value={editForm.hourlyWage}
                    onChange={(e) =>
                      setEditForm(
                        (prev) =>
                          prev && {
                            ...prev,
                            hourlyWage: parseInt(e.target.value, 10) || 0,
                          }
                      )
                    }
                    className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg"
                  />
                  {editForm.hourlyWage < minWage && (
                    <p className="text-[11px] text-rose-600 mt-1 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      {targetYear}년 최저시급({minWage.toLocaleString()}원)보다 낮습니다.
                    </p>
                  )}
                </div>
              </div>
            );
          }

          return (
            <div
              key={preset.id}
              className="p-3.5 rounded-xl border border-slate-200/80 hover:border-slate-300 bg-white shadow-xs transition-all relative group flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-indigo-500"></span>
                    <span className="font-bold text-sm text-slate-900">{preset.label}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => startEditing(preset)}
                      className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors"
                      title="수정"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    {presets.length > 1 && (
                      <button
                        type="button"
                        onClick={() => onDeletePreset(preset.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors"
                        title="삭제"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                <div className="text-xs text-slate-600 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">근무시간:</span>
                    <span className="font-medium text-slate-800">
                      {preset.startTime} ~ {preset.endTime} (휴게 {preset.breakMinutes}분)
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">실근로:</span>
                    <span className="font-semibold text-indigo-600">
                      {formatMinutes(workMinutes)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                    <span className="text-slate-500">설정 시급:</span>
                    <span className="font-bold text-slate-900">
                      {preset.hourlyWage.toLocaleString()}원
                    </span>
                  </div>
                </div>
              </div>

              {isBelowMinWage && (
                <div className="mt-2.5 p-2 bg-rose-50 border border-rose-200/80 rounded-lg text-[11px] text-rose-700 flex items-start gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 text-rose-500 flex-shrink-0 mt-0.5" />
                  <span>
                    최저시급 미달 ({minWage.toLocaleString()}원 기준). 계약은 무효이며 최저시급으로 재계산 청구 가능합니다.
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
};
