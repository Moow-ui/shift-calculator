import React, { useState } from 'react';
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  format,
  isSameMonth,
  getDay,
  addMonths,
  subMonths,
} from 'date-fns';
import { Config, ShiftPreset, WorkDay } from '../types/payroll';
import {
  ChevronLeft,
  ChevronRight,
  Trash2,
  Plus,
  Clock,
  ChevronDown,
  ChevronUp,
  Edit3,
  Check,
  AlertCircle,
  Coins,
  FileCheck2,
  Eye,
  EyeOff,
  DollarSign,
} from 'lucide-react';
import { DateEditModal } from './DateEditModal';
import { getMinimumWage } from '../config/minimumWage';
import { calculateDailyWorkMinutes, formatMinutes } from '../lib/payroll';
import { getKoreanHoliday } from '../config/holidays';

interface WorkRegistrationSectionProps {
  config: Config;
  presets: ShiftPreset[];
  workDays: WorkDay[];
  baseHourlyWage: number;
  onUpdateBaseWage: (wage: number) => void;
  onChangeConfig: (updater: (prev: Config) => Config) => void;
  onUpdateWorkDays: (days: WorkDay[]) => void;
  onSetWorkDay: (workDay: WorkDay) => void;
  onDeleteWorkDay: (dateStr: string) => void;
  onAddPreset: (preset: ShiftPreset) => void;
  onUpdatePreset: (preset: ShiftPreset) => void;
  onDeletePreset: (id: string) => void;
  onGoToResult: () => void;
  onLoadSample: () => void;
}

export const WorkRegistrationSection: React.FC<WorkRegistrationSectionProps> = ({
  config,
  presets,
  workDays,
  baseHourlyWage,
  onUpdateBaseWage,
  onChangeConfig,
  onUpdateWorkDays,
  onSetWorkDay,
  onDeleteWorkDay,
  onAddPreset,
  onUpdatePreset,
  onDeletePreset,
  onGoToResult,
  onLoadSample,
}) => {
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showPresetManager, setShowPresetManager] = useState(false);
  const [isWageHidden, setIsWageHidden] = useState(false);
  const [editingPresetId, setEditingPresetId] = useState<string | null>(null);
  const [presetEditForm, setPresetEditForm] = useState<ShiftPreset | null>(null);

  const minWage = getMinimumWage(config.year);

  // 달력 기준일
  const currentMonthDate = new Date(config.year, config.month - 1, 1);
  const monthStart = startOfMonth(currentMonthDate);
  const monthEnd = endOfMonth(monthStart);

  const weekStartsOnNum = config.weekStartsOn === 'SUN' ? 0 : 1;
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: weekStartsOnNum });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: weekStartsOnNum });

  const calendarDays = eachDayOfInterval({
    start: calendarStart,
    end: calendarEnd,
  });

  const workDayMap = new Map<string, WorkDay>();
  for (const wd of workDays) {
    workDayMap.set(wd.date, wd);
  }

  const presetMap = new Map<string, ShiftPreset>();
  for (const p of presets) {
    presetMap.set(p.id, p);
  }

  // 월 이동
  const handlePrevMonth = () => {
    const prev = subMonths(currentMonthDate, 1);
    onChangeConfig((c) => ({
      ...c,
      year: prev.getFullYear(),
      month: prev.getMonth() + 1,
    }));
  };

  const handleNextMonth = () => {
    const next = addMonths(currentMonthDate, 1);
    onChangeConfig((c) => ({
      ...c,
      year: next.getFullYear(),
      month: next.getMonth() + 1,
    }));
  };

  // 날짜 클릭
  const handleCellClick = (dateStr: string) => {
    setSelectedDate(dateStr);
    setIsModalOpen(true);
  };

  // 이번 달 근무 전체 삭제
  const handleClearMonth = () => {
    if (window.confirm(`${config.year}년 ${config.month}월에 등록된 모든 근무를 비우시겠습니까?`)) {
      const remaining = workDays.filter((wd) => {
        const d = new Date(wd.date);
        return !isSameMonth(d, monthStart);
      });
      onUpdateWorkDays(remaining);
    }
  };

  // 프리셋 편집 핸들러
  const startEditPreset = (preset: ShiftPreset) => {
    setEditingPresetId(preset.id);
    setPresetEditForm({ ...preset });
  };

  const saveEditPreset = () => {
    if (!presetEditForm) return;
    onUpdatePreset(presetEditForm);
    setEditingPresetId(null);
    setPresetEditForm(null);
  };

  const handleAddNewPreset = () => {
    const newPreset: ShiftPreset = {
      id: `preset-${Date.now()}`,
      label: `새 근무 ${presets.length + 1}`,
      startTime: '09:00',
      endTime: '18:00',
      breakMinutes: 60,
      hourlyWage: baseHourlyWage || minWage,
    };
    onAddPreset(newPreset);
    startEditPreset(newPreset);
  };

  const dayHeaders = config.weekStartsOn === 'SUN'
    ? ['일', '월', '화', '수', '목', '금', '토']
    : ['월', '화', '수', '목', '금', '토', '일'];

  const currentWorkDay = selectedDate ? workDayMap.get(selectedDate) : undefined;
  const currentMonthWorkCount = workDays.filter((wd) => isSameMonth(new Date(wd.date), monthStart)).length;

  return (
    <div className="space-y-3 sm:space-y-4 w-full min-w-0">
      {/* 1. 달력 메인 카드 */}
      <section className="bg-white rounded-2xl border border-slate-300/80 shadow-md shadow-slate-200/60 p-3 sm:p-5 space-y-3 sm:space-y-3.5 w-full min-w-0 overflow-hidden">
        {/* 달력 상단 바: 연/월 선택 & 내 시급 입력란 (균형 잡힌 대칭 디자인) */}
        <div className="grid grid-cols-2 gap-2 pb-2.5 border-b border-slate-200 w-full min-w-0">
          {/* 1. 연/월 선택 박스 (겹침 완전 해결: appearance-none 및 컴팩트 배치) */}
          <div className="flex items-center justify-between bg-slate-100/90 p-0.5 sm:p-1 rounded-xl border border-slate-300 shadow-2xs h-10 w-full min-w-0">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg hover:bg-white active:bg-slate-200 text-slate-700 transition-colors touch-target flex items-center justify-center flex-shrink-0"
              title="이전 달"
            >
              <ChevronLeft className="w-4 h-4 text-slate-700" />
            </button>

            <div className="flex items-center gap-1 min-w-0 justify-center">
              <select
                value={config.year}
                onChange={(e) => {
                  const y = parseInt(e.target.value, 10);
                  onChangeConfig((prev) => ({ ...prev, year: y }));
                }}
                className="appearance-none bg-transparent text-xs sm:text-sm font-extrabold text-slate-900 focus:outline-none cursor-pointer text-center px-0.5 py-1"
              >
                {[2024, 2025, 2026, 2027].map((y) => (
                  <option key={y} value={y}>
                    {y}년
                  </option>
                ))}
              </select>

              <select
                value={config.month}
                onChange={(e) => {
                  const m = parseInt(e.target.value, 10);
                  onChangeConfig((prev) => ({ ...prev, month: m }));
                }}
                className="appearance-none bg-indigo-100 text-indigo-800 px-1.5 py-0.5 rounded-lg border border-indigo-200 focus:outline-none cursor-pointer text-xs sm:text-sm font-extrabold text-center shadow-2xs"
              >
                {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                  <option key={m} value={m}>
                    {m}월
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={handleNextMonth}
              className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg hover:bg-white active:bg-slate-200 text-slate-700 transition-colors touch-target flex items-center justify-center flex-shrink-0"
              title="다음 달"
            >
              <ChevronRight className="w-4 h-4 text-slate-700" />
            </button>
          </div>

          {/* 2. 내 시급 입력 박스 (연월 선택 박스와 크기/높이/스타일 일치) */}
          <div className="flex items-center justify-between bg-slate-100/90 p-1 px-2 rounded-xl border border-slate-300 shadow-2xs h-10 w-full min-w-0">
            <span className="text-xs font-extrabold text-slate-800 flex items-center gap-1 whitespace-nowrap flex-shrink-0">
              <DollarSign className="w-3.5 h-3.5 text-indigo-600" />
              <span>시급</span>
            </span>

            <div className="flex items-center gap-1 min-w-0 flex-1 justify-end">
              {isWageHidden ? (
                <div className="px-2 py-0.5 text-xs sm:text-sm font-extrabold bg-white border border-slate-300 rounded-lg text-slate-400 tracking-widest text-center shadow-2xs flex-1 max-w-[70px] sm:max-w-[85px]">
                  •••••
                </div>
              ) : (
                <div className="flex items-center flex-1 justify-end min-w-0">
                  <input
                    type="number"
                    min="0"
                    step="100"
                    value={baseHourlyWage}
                    onChange={(e) => onUpdateBaseWage(parseInt(e.target.value, 10) || 0)}
                    className="w-full max-w-[62px] sm:max-w-[80px] px-1 py-0.5 text-xs sm:text-sm font-extrabold bg-white border border-slate-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-indigo-500/20 text-right shadow-2xs"
                  />
                  <span className="text-[11px] sm:text-xs font-bold text-slate-600 ml-0.5 flex-shrink-0">원</span>
                </div>
              )}

              <button
                type="button"
                onClick={() => setIsWageHidden((v) => !v)}
                className={`p-1 rounded-lg border text-xs font-bold flex items-center justify-center transition-all flex-shrink-0 ${
                  isWageHidden
                    ? 'bg-indigo-50 border-indigo-300 text-indigo-700 shadow-2xs'
                    : 'bg-white border-slate-300 text-slate-600 hover:text-slate-900 shadow-2xs'
                }`}
                title={isWageHidden ? '시급 보이기' : '시급 가리기 (주변 시선 차단)'}
              >
                {isWageHidden ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>
        </div>

        {/* 달력 상단 액션 바: [✨ 1초 예시 채우기] 와 [🗑️ 비우기] 만 깔끔하게 배치 */}
        <div className="flex items-center justify-between gap-1.5 w-full min-w-0">
          <button
            type="button"
            onClick={onLoadSample}
            className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-extrabold text-amber-950 bg-amber-200/90 hover:bg-amber-300 active:bg-amber-400 border border-amber-400/90 rounded-xl shadow-xs transition-all touch-target"
            title="테스트용 평일+주말+공휴일 알바 예시를 채웁니다"
          >
            <FileCheck2 className="w-3.5 h-3.5 text-amber-800 flex-shrink-0" />
            <span>✨ 1초 예시 채워보기</span>
          </button>

          <button
            type="button"
            onClick={handleClearMonth}
            className="inline-flex items-center justify-center gap-1 px-3 py-2 text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 active:bg-rose-200 border border-rose-200 rounded-xl shadow-2xs transition-all touch-target flex-shrink-0"
            title="이번 달 근무 전체 비우기"
          >
            <Trash2 className="w-3.5 h-3.5 text-rose-600" />
            <span>비우기</span>
          </button>
        </div>

        {/* 달력 요일 헤더 */}
        <div className="grid grid-cols-7 gap-0.5 sm:gap-1 text-center bg-slate-100/90 py-1 px-0.5 rounded-xl border border-slate-200 w-full">
          {dayHeaders.map((header, idx) => {
            const isSun = (config.weekStartsOn === 'SUN' && idx === 0) || (config.weekStartsOn === 'MON' && idx === 6);
            const isSat = (config.weekStartsOn === 'SUN' && idx === 6) || (config.weekStartsOn === 'MON' && idx === 5);
            return (
              <div
                key={header}
                className={`text-[11px] sm:text-xs font-extrabold ${
                  isSun ? 'text-rose-600' : isSat ? 'text-blue-600' : 'text-slate-700'
                }`}
              >
                {header}
              </div>
            );
          })}
        </div>

        {/* 달력 날짜 그리드 (모바일 100% 핏) */}
        <div className="grid grid-cols-7 gap-0.5 sm:gap-1.5 w-full">
          {calendarDays.map((dayDate) => {
            const dateStr = format(dayDate, 'yyyy-MM-dd');
            const isCurrMonth = isSameMonth(dayDate, monthStart);
            const dayNum = format(dayDate, 'd');
            const dayOfWeek = getDay(dayDate);
            const isSun = dayOfWeek === 0;
            const isSat = dayOfWeek === 6;
            const holiday = getKoreanHoliday(dateStr);

            const work = workDayMap.get(dateStr);
            const preset = work?.presetId ? presetMap.get(work.presetId) : undefined;
            const startTime = work?.overrides?.startTime || preset?.startTime || '09:00';
            const endTime = work?.overrides?.endTime || preset?.endTime || '18:00';
            const breakMin = work?.overrides?.breakMinutes !== undefined ? work.overrides.breakMinutes : (preset?.breakMinutes ?? 60);

            const { workMinutes } = calculateDailyWorkMinutes(startTime, endTime, breakMin);
            const workHoursNum = Math.round((workMinutes / 60) * 10) / 10;

            return (
              <button
                key={dateStr}
                type="button"
                onClick={() => handleCellClick(dateStr)}
                className={`min-h-[50px] sm:min-h-[82px] p-0.5 sm:p-2 rounded-lg sm:rounded-xl text-left flex flex-col justify-between transition-all touch-target relative group w-full min-w-0 overflow-hidden ${
                  !isCurrMonth
                    ? 'bg-slate-100/60 border border-slate-200 text-slate-400 opacity-40'
                    : work
                    ? 'bg-indigo-50/60 border-2 border-indigo-500 shadow-2xs'
                    : holiday
                    ? 'bg-rose-50/40 border border-rose-300 hover:border-rose-400 text-slate-800 shadow-2xs'
                    : 'bg-white border border-slate-300 hover:border-indigo-400 text-slate-800 shadow-2xs'
                }`}
              >
                {/* 상단: 날짜 번호 + 공휴일 표시 */}
                <div className="flex items-start justify-between w-full min-w-0 leading-none">
                  <span
                    className={`text-[11px] sm:text-sm font-extrabold ${
                      !isCurrMonth
                        ? 'text-slate-400'
                        : holiday || isSun
                        ? 'text-rose-600'
                        : isSat
                        ? 'text-blue-600'
                        : 'text-slate-900'
                    }`}
                  >
                    {dayNum}
                  </span>

                  {/* 공휴일 표시: 모바일은 2글자 배지 */}
                  {holiday && isCurrMonth && (
                    <span
                      className="text-[8px] sm:text-[9px] font-extrabold text-rose-700 bg-rose-100 border border-rose-300 px-0.5 py-0.2 rounded truncate max-w-[24px] sm:max-w-[70px] leading-tight"
                      title={holiday.name}
                    >
                      <span className="sm:hidden">{holiday.name.slice(0, 2)}</span>
                      <span className="hidden sm:inline">{holiday.name}</span>
                    </span>
                  )}
                </div>

                {/* 하단: 근무 상태 표시 */}
                {work ? (
                  <div className="mt-0.5 w-full min-w-0">
                    {work.absent ? (
                      <span className="block w-full text-[8px] sm:text-[10px] font-extrabold text-rose-700 bg-rose-100 border border-rose-300 rounded px-0.5 py-0.2 text-center truncate">
                        결근
                      </span>
                    ) : (
                      <>
                        {/* 모바일 뷰: 깔끔한 근무 시간 알약 배지 */}
                        <div className="sm:hidden w-full min-w-0">
                          <div className="w-full text-[9px] font-extrabold text-indigo-800 bg-indigo-100 border border-indigo-300 rounded px-0.5 py-0.2 text-center truncate flex items-center justify-center gap-0.5">
                            <span>{workHoursNum}h</span>
                            {(work.isHoliday || holiday) && (
                              <span className="w-1 h-1 rounded-full bg-rose-500 flex-shrink-0" />
                            )}
                          </div>
                        </div>

                        {/* 데스크톱 PC 뷰: 상세 시간 및 라벨 */}
                        <div className="hidden sm:block space-y-0.5 w-full min-w-0">
                          <div className="text-[10px] font-bold text-indigo-800 bg-indigo-100/90 border border-indigo-300 rounded px-1.5 py-0.5 truncate">
                            {work.overrides?.label || preset?.label || '근무'} ({workHoursNum}h)
                          </div>
                          <div className="text-[10px] text-slate-700 font-semibold truncate">
                            {startTime}~{endTime}
                          </div>
                          <div className="flex flex-wrap gap-0.5">
                            {work.late && (
                              <span className="text-[9px] bg-amber-100 text-amber-800 border border-amber-300 px-1 rounded font-bold">
                                지각
                              </span>
                            )}
                            {(work.isHoliday || holiday) && (
                              <span className="text-[9px] bg-purple-100 text-purple-800 border border-purple-300 px-1 rounded font-bold">
                                휴일
                              </span>
                            )}
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                ) : (
                  <div className="hidden group-hover:flex items-center justify-center h-full opacity-40">
                    <Plus className="w-3 h-3 text-slate-400" />
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* 달력 하단 팁 */}
        <p className="text-[10px] sm:text-[11px] text-slate-500 text-center pt-0.5">
          👉 날짜를 터치하면 출퇴근 시간과 휴게시간을 바로 적을 수 있습니다.
        </p>
      </section>

      {/* 2. 하단 아코디언 카드: "정해진 요일/시간 프리셋" */}
      <section className="bg-white rounded-2xl border border-slate-300/80 shadow-md shadow-slate-200/60 overflow-hidden transition-all w-full min-w-0">
        <button
          type="button"
          onClick={() => setShowPresetManager((v) => !v)}
          className="w-full p-3 sm:p-4 flex items-center justify-between text-left hover:bg-slate-50 transition-colors"
        >
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold border border-indigo-100 flex-shrink-0">
              <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
            <div className="min-w-0">
              <h3 className="font-extrabold text-xs sm:text-sm text-slate-900 flex items-center gap-1.5 flex-wrap">
                <span>정해진 요일/시간 프리셋</span>
                <span className="text-[10px] sm:text-[11px] font-semibold text-indigo-700 bg-indigo-50 px-1.5 py-0.2 rounded-full border border-indigo-200">
                  {presets.length}개
                </span>
              </h3>
              <p className="text-[11px] text-slate-500 truncate">
                평일 마감, 주말 오픈처럼 자주 일하는 출퇴근 시간을 미리 등록해두세요.
              </p>
            </div>
          </div>

          <div className="p-1 rounded-lg bg-slate-100 text-slate-600 border border-slate-200 flex-shrink-0">
            {showPresetManager ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </div>
        </button>

        {showPresetManager && (
          <div className="p-3 sm:p-4 pt-2 border-t border-slate-200 bg-slate-50/70 space-y-3 animate-fadeIn w-full min-w-0">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800">등록된 근무 프리셋 목록</span>
              <button
                type="button"
                onClick={handleAddNewPreset}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>프리셋 추가</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3 w-full">
              {presets.map((preset) => {
                const isEditing = editingPresetId === preset.id;
                const { workMinutes } = calculateDailyWorkMinutes(
                  preset.startTime,
                  preset.endTime,
                  preset.breakMinutes
                );
                const isBelowMinWage = preset.hourlyWage < minWage;

                if (isEditing && presetEditForm) {
                  return (
                    <div
                      key={preset.id}
                      className="p-3 rounded-xl border-2 border-indigo-500 bg-white space-y-2.5 shadow-sm"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-indigo-900">프리셋 수정</span>
                        <div className="flex gap-1">
                          <button
                            type="button"
                            onClick={saveEditPreset}
                            className="p-1 bg-indigo-600 text-white rounded hover:bg-indigo-700"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingPresetId(null);
                              setPresetEditForm(null);
                            }}
                            className="px-2 py-0.5 bg-slate-200 text-slate-700 rounded text-[11px]"
                          >
                            취소
                          </button>
                        </div>
                      </div>

                      <input
                        type="text"
                        value={presetEditForm.label}
                        onChange={(e) =>
                          setPresetEditForm((p) => p && { ...p, label: e.target.value })
                        }
                        className="w-full px-2 py-1 text-xs bg-slate-50 border border-slate-300 rounded"
                        placeholder="프리셋 이름 (예: 평일 마감)"
                      />

                      <div className="grid grid-cols-3 gap-1 text-xs">
                        <div>
                          <label className="text-[10px] text-slate-500 block">시작</label>
                          <input
                            type="time"
                            value={presetEditForm.startTime}
                            onChange={(e) =>
                              setPresetEditForm((p) => p && { ...p, startTime: e.target.value })
                            }
                            className="w-full px-1 py-1 text-xs bg-slate-50 border border-slate-300 rounded"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-slate-500 block">종료</label>
                          <input
                            type="time"
                            value={presetEditForm.endTime}
                            onChange={(e) =>
                              setPresetEditForm((p) => p && { ...p, endTime: e.target.value })
                            }
                            className="w-full px-1 py-1 text-xs bg-slate-50 border border-slate-300 rounded"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-slate-500 block">휴게(분)</label>
                          <input
                            type="number"
                            min="0"
                            step="10"
                            value={presetEditForm.breakMinutes}
                            onChange={(e) =>
                              setPresetEditForm((p) => p && { ...p, breakMinutes: parseInt(e.target.value, 10) || 0 })
                            }
                            className="w-full px-1 py-1 text-xs bg-slate-50 border border-slate-300 rounded"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="text-[10px] text-slate-500 block">시급 (원)</label>
                        <input
                          type="number"
                          min="0"
                          step="100"
                          value={presetEditForm.hourlyWage}
                          onChange={(e) =>
                            setPresetEditForm((p) => p && { ...p, hourlyWage: parseInt(e.target.value, 10) || 0 })
                          }
                          className="w-full px-2 py-1 text-xs bg-slate-50 border border-slate-300 rounded"
                        />
                      </div>
                    </div>
                  );
                }

                return (
                  <div
                    key={preset.id}
                    className="p-3 bg-white rounded-xl border border-slate-300/90 shadow-2xs flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="font-extrabold text-xs text-slate-900">{preset.label}</span>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => startEditPreset(preset)}
                            className="p-1 text-slate-400 hover:text-indigo-600 rounded"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          {presets.length > 1 && (
                            <button
                              type="button"
                              onClick={() => onDeletePreset(preset.id)}
                              className="p-1 text-slate-400 hover:text-rose-600 rounded"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="text-[11px] text-slate-700 space-y-0.5">
                        <p>근무: {preset.startTime} ~ {preset.endTime} (휴게 {preset.breakMinutes}분)</p>
                        <p>실근로: <strong className="text-indigo-700 font-bold">{formatMinutes(workMinutes)}</strong></p>
                        <p>시급: <strong className="text-slate-900 font-bold">{preset.hourlyWage.toLocaleString()}원</strong></p>
                      </div>
                    </div>

                    {isBelowMinWage && (
                      <p className="text-[10px] text-rose-600 mt-2 flex items-center gap-1 font-semibold">
                        <AlertCircle className="w-3 h-3" />
                        최저시급({minWage.toLocaleString()}원)보다 낮습니다.
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </section>

      {/* 3. 하단 큰 버튼: 2번째 탭으로 이동 */}
      <div className="p-3 sm:p-4 bg-gradient-to-r from-indigo-600 to-indigo-800 rounded-2xl text-white shadow-md shadow-indigo-200 flex flex-col sm:flex-row items-center justify-between gap-2.5 sm:gap-3 w-full">
        <div className="text-center sm:text-left min-w-0">
          <div className="font-extrabold text-xs sm:text-base truncate">
            {currentMonthWorkCount > 0
              ? `이번 달 총 ${currentMonthWorkCount}일 근무 등록됨`
              : '달력 날짜를 터치해서 근무를 등록해보세요!'}
          </div>
          <p className="text-[10px] sm:text-xs text-indigo-100 mt-0.5 truncate">
            등록한 근무를 바탕으로 주휴수당과 예상 월급을 계산합니다.
          </p>
        </div>

        <button
          type="button"
          onClick={onGoToResult}
          className="w-full sm:w-auto px-4 py-2 sm:px-5 sm:py-3 bg-white text-indigo-700 hover:bg-indigo-50 active:bg-indigo-100 rounded-xl font-extrabold text-xs sm:text-sm flex items-center justify-center gap-1.5 shadow-md transition-all touch-target flex-shrink-0"
        >
          <Coins className="w-4 h-4 text-emerald-600" />
          <span>이번 달 급여 계산 결과 보기 👉</span>
        </button>
      </div>

      {/* 날짜 상세 수정 모달 */}
      {selectedDate && (
        <DateEditModal
          isOpen={isModalOpen}
          dateStr={selectedDate}
          targetYear={config.year}
          baseHourlyWage={baseHourlyWage}
          presets={presets}
          existingWorkDay={currentWorkDay}
          onClose={() => {
            setIsModalOpen(false);
            setSelectedDate(null);
          }}
          onSave={onSetWorkDay}
          onDelete={onDeleteWorkDay}
        />
      )}
    </div>
  );
};
