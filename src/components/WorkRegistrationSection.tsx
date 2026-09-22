import React, { useState, useRef } from 'react';
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
  Undo2,
  Paintbrush,
  Sparkles,
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

  // 🎨 프리셋 칠하기 모드 상태
  const [activePresetId, setActivePresetId] = useState<string | null>(null);
  // ↩️ 되돌리기 (Undo) 스택
  const [undoStack, setUndoStack] = useState<WorkDay[][]>([]);
  // 요일 탭 시 비활성 상태일 때 안내 툴팁 타이머
  const [headerHintMsg, setHeaderHintMsg] = useState<string | null>(null);

  // 롱프레스 (Long Press) 제스처 처리용 Ref
  const longPressTimerRef = useRef<number | null>(null);
  const isLongPressTriggeredRef = useRef<boolean>(false);

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

  const activePreset = activePresetId ? presetMap.get(activePresetId) : null;

  // 되돌리기 상태 기록
  const recordUndo = () => {
    setUndoStack((prev) => [...prev.slice(-19), [...workDays]]);
  };

  // 되돌리기 실행
  const handleUndo = () => {
    if (undoStack.length === 0) return;
    const lastState = undoStack[undoStack.length - 1];
    setUndoStack((prev) => prev.slice(0, -1));
    onUpdateWorkDays(lastState);
  };

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

  // 프리셋 칩 토글
  const handleTogglePresetChip = (presetId: string) => {
    if (activePresetId === presetId) {
      setActivePresetId(null);
    } else {
      setActivePresetId(presetId);
    }
  };

  // 날짜 셀 클릭 (칠하기 또는 모달 열기)
  const handleCellClick = (dateStr: string, isCurrMonth: boolean) => {
    if (!isCurrMonth) return;

    if (isLongPressTriggeredRef.current) {
      isLongPressTriggeredRef.current = false;
      return;
    }

    // 1. 프리셋 활성 상태: 칠하기
    if (activePresetId) {
      recordUndo();
      const existing = workDayMap.get(dateStr);
      const holiday = getKoreanHoliday(dateStr);

      if (existing && existing.presetId === activePresetId && !existing.overrides) {
        onDeleteWorkDay(dateStr);
      } else {
        onSetWorkDay({
          date: dateStr,
          presetId: activePresetId,
          isHoliday: Boolean(holiday),
        });
      }
      return;
    }

    // 2. 프리셋 비활성 상태: 기존 시간 입력 모달
    setSelectedDate(dateStr);
    setIsModalOpen(true);
  };

  // 롱프레스 시작 (모바일에서 길게 눌러 개별 수정 모달 열기)
  const handleTouchStart = (dateStr: string, isCurrMonth: boolean) => {
    if (!isCurrMonth) return;
    isLongPressTriggeredRef.current = false;
    longPressTimerRef.current = window.setTimeout(() => {
      isLongPressTriggeredRef.current = true;
      setSelectedDate(dateStr);
      setIsModalOpen(true);
    }, 450);
  };

  const handleTouchEndOrCancel = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  // 우클릭 (PC에서 개별 수정 모달 열기)
  const handleContextMenu = (e: React.MouseEvent, dateStr: string, isCurrMonth: boolean) => {
    if (!isCurrMonth) return;
    e.preventDefault();
    setSelectedDate(dateStr);
    setIsModalOpen(true);
  };

  // 요일 헤더 클릭 (요일 일괄 칠하기 / 토글)
  const handleHeaderClick = (dayOfWeekNumber: number, headerName: string) => {
    if (!activePresetId) {
      setHeaderHintMsg(`💡 아래 프리셋을 먼저 선택하시면 '${headerName}요일'을 한 번에 채울 수 있어요!`);
      setTimeout(() => setHeaderHintMsg(null), 3000);
      return;
    }

    recordUndo();

    const monthDays = eachDayOfInterval({ start: monthStart, end: monthEnd });
    const targetMonthDays = monthDays.filter((d) => getDay(d) === dayOfWeekNumber);
    const targetDateStrs = targetMonthDays.map((d) => format(d, 'yyyy-MM-dd'));

    const allFilledWithActive = targetDateStrs.every((dateStr) => {
      const wd = workDayMap.get(dateStr);
      return wd && wd.presetId === activePresetId && !wd.absent && !wd.overrides;
    });

    let updatedWorkDays = [...workDays];

    if (allFilledWithActive) {
      updatedWorkDays = updatedWorkDays.filter((wd) => !targetDateStrs.includes(wd.date));
    } else {
      updatedWorkDays = updatedWorkDays.filter((wd) => !targetDateStrs.includes(wd.date));
      for (const dateStr of targetDateStrs) {
        const holiday = getKoreanHoliday(dateStr);
        updatedWorkDays.push({
          date: dateStr,
          presetId: activePresetId,
          isHoliday: Boolean(holiday),
        });
      }
    }

    onUpdateWorkDays(updatedWorkDays);
  };

  // 이번 달 근무 전체 삭제
  const handleClearMonth = () => {
    if (window.confirm(`${config.year}년 ${config.month}월에 등록된 모든 근무를 비우시겠습니까?`)) {
      recordUndo();
      const remaining = workDays.filter((wd) => {
        const d = new Date(wd.date);
        return !isSameMonth(d, monthStart);
      });
      onUpdateWorkDays(remaining);
    }
  };

  // 1초 예시 채우기 (Undo 기록 포함)
  const handleLoadSampleWithUndo = () => {
    recordUndo();
    onLoadSample();
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
    ? [
        { name: '일', dayNum: 0 },
        { name: '월', dayNum: 1 },
        { name: '화', dayNum: 2 },
        { name: '수', dayNum: 3 },
        { name: '목', dayNum: 4 },
        { name: '금', dayNum: 5 },
        { name: '토', dayNum: 6 },
      ]
    : [
        { name: '월', dayNum: 1 },
        { name: '화', dayNum: 2 },
        { name: '수', dayNum: 3 },
        { name: '목', dayNum: 4 },
        { name: '금', dayNum: 5 },
        { name: '토', dayNum: 6 },
        { name: '일', dayNum: 0 },
      ];

  const currentWorkDay = selectedDate ? workDayMap.get(selectedDate) : undefined;
  const currentMonthWorkCount = workDays.filter((wd) => isSameMonth(new Date(wd.date), monthStart)).length;

  return (
    <div className="space-y-3 sm:space-y-4 w-full min-w-0">
      {/* 1. 달력 메인 카드 */}
      <section className="bg-white rounded-2xl border border-[var(--ab-line)] shadow-sm p-3 sm:p-5 space-y-3 sm:space-y-3.5 w-full min-w-0 overflow-hidden">
        {/* 달력 상단 바: 연/월 선택 & 내 시급 입력란 */}
        <div className="grid grid-cols-2 gap-2 pb-2.5 border-b border-[var(--ab-line)] w-full min-w-0">
          {/* 연/월 선택 박스 */}
          <div className="flex items-center justify-between bg-slate-100/90 p-0.5 sm:p-1 rounded-xl border border-[var(--ab-line)] shadow-2xs h-10 w-full min-w-0">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="w-8 h-8 rounded-lg hover:bg-white active:bg-slate-200 text-slate-700 transition-colors touch-target flex items-center justify-center flex-shrink-0 min-w-[32px] min-h-[32px]"
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
                className="appearance-none bg-transparent text-xs sm:text-sm font-extrabold text-[var(--ab-text)] focus:outline-none cursor-pointer text-center px-0.5 py-1"
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
                className="appearance-none bg-[var(--ab-boss-soft)] text-[var(--ab-boss)] px-1.5 py-0.5 rounded-lg border border-blue-200 focus:outline-none cursor-pointer text-xs sm:text-sm font-extrabold text-center shadow-2xs"
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
              className="w-8 h-8 rounded-lg hover:bg-white active:bg-slate-200 text-slate-700 transition-colors touch-target flex items-center justify-center flex-shrink-0 min-w-[32px] min-h-[32px]"
              title="다음 달"
            >
              <ChevronRight className="w-4 h-4 text-slate-700" />
            </button>
          </div>

          {/* 내 시급 입력 박스 */}
          <div className="flex items-center justify-between bg-slate-100/90 p-1 px-2 rounded-xl border border-[var(--ab-line)] shadow-2xs h-10 w-full min-w-0">
            <span className="text-xs font-extrabold text-[var(--ab-text)] flex items-center gap-1 whitespace-nowrap flex-shrink-0">
              <DollarSign className="w-3.5 h-3.5 text-[var(--ab-boss)]" />
              <span>시급</span>
            </span>

            <div className="flex items-center gap-1 min-w-0 flex-1 justify-end">
              {isWageHidden ? (
                <div className="px-2 py-0.5 text-xs sm:text-sm font-extrabold bg-white border border-[var(--ab-line)] rounded-lg text-slate-400 tracking-widest text-center shadow-2xs flex-1 max-w-[70px] sm:max-w-[85px]">
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
                    className="w-full max-w-[62px] sm:max-w-[80px] px-1 py-0.5 text-xs sm:text-sm font-extrabold bg-white border border-[var(--ab-line)] rounded-lg text-slate-900 focus:ring-2 focus:ring-blue-500/20 text-right shadow-2xs"
                  />
                  <span className="text-[12px] font-bold text-slate-600 ml-0.5 flex-shrink-0">원</span>
                </div>
              )}

              <button
                type="button"
                onClick={() => setIsWageHidden((v) => !v)}
                className={`p-1 min-w-[32px] min-h-[32px] rounded-lg border text-xs font-bold flex items-center justify-center transition-all flex-shrink-0 ${
                  isWageHidden
                    ? 'bg-[var(--ab-boss-soft)] border-blue-300 text-[var(--ab-boss)] shadow-2xs'
                    : 'bg-white border-[var(--ab-line)] text-slate-600 hover:text-slate-900 shadow-2xs'
                }`}
                title={isWageHidden ? '시급 보이기' : '시급 가리기 (주변 시선 차단)'}
              >
                {isWageHidden ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>
        </div>

        {/* 달력 상단 액션 바: [✨ 1초 예시] + [↩️ 되돌리기] + [🗑️ 비우기] */}
        <div className="flex items-center justify-between gap-1.5 w-full min-w-0">
          {/* 1초 예시 (보조 버튼 크기로 축소) */}
          <button
            type="button"
            onClick={handleLoadSampleWithUndo}
            className="inline-flex items-center justify-center gap-1.5 px-3 py-2 min-h-[40px] text-xs font-bold text-[var(--ab-text)] bg-white hover:bg-[var(--ab-bg)] active:bg-slate-100 border border-[var(--ab-line-strong)] rounded-xl shadow-2xs transition-all touch-target flex-shrink-0"
            title="테스트용 평일+주말+공휴일 알바 예시를 채웁니다"
          >
            <FileCheck2 className="w-3.5 h-3.5 text-[var(--ab-boss)] flex-shrink-0" />
            <span>1초 예시</span>
          </button>

          {/* ↩️ 되돌리기 (Undo) 버튼 */}
          <button
            type="button"
            onClick={handleUndo}
            disabled={undoStack.length === 0}
            className={`inline-flex items-center justify-center gap-1 px-3 py-2 min-h-[40px] text-xs font-bold rounded-xl border shadow-2xs transition-all touch-target flex-shrink-0 ${
              undoStack.length > 0
                ? 'bg-[var(--ab-boss-soft)] text-[var(--ab-boss)] border-blue-300 hover:bg-blue-100 active:bg-blue-200 cursor-pointer'
                : 'bg-slate-100 text-slate-400 border-slate-200 opacity-50 cursor-not-allowed'
            }`}
            title="마지막 작업 되돌리기"
          >
            <Undo2 className="w-3.5 h-3.5" />
            <span>되돌리기</span>
          </button>

          {/* 비우기 버튼 */}
          <button
            type="button"
            onClick={handleClearMonth}
            className="inline-flex items-center justify-center gap-1 px-3 py-2 min-h-[40px] text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 active:bg-rose-200 border border-rose-200 rounded-xl shadow-2xs transition-all touch-target flex-shrink-0"
            title="이번 달 근무 전체 비우기"
          >
            <Trash2 className="w-3.5 h-3.5 text-rose-600" />
            <span>비우기</span>
          </button>
        </div>

        {/* 요일 헤더 안내 툴팁 */}
        {headerHintMsg && (
          <div className="p-2 bg-[var(--ab-boss-soft)] border border-blue-200 rounded-xl text-xs text-[var(--ab-boss)] font-bold text-center animate-fadeIn">
            {headerHintMsg}
          </div>
        )}

        {/* 요일 헤더 (최소 44px 이상 터치 영역) */}
        <div className="grid grid-cols-7 gap-0.5 sm:gap-1 text-center bg-slate-100/90 p-0.5 rounded-xl border border-[var(--ab-line)] w-full">
          {dayHeaders.map((header) => {
            const isSun = header.dayNum === 0;
            const isSat = header.dayNum === 6;

            return (
              <button
                key={header.name}
                type="button"
                onClick={() => handleHeaderClick(header.dayNum, header.name)}
                className={`min-h-[44px] h-11 flex flex-col items-center justify-center rounded-lg transition-all touch-target select-none ${
                  activePresetId
                    ? 'hover:bg-blue-100 active:bg-blue-200 bg-white/70 shadow-2xs border border-blue-300 cursor-pointer'
                    : 'hover:bg-slate-200/50 cursor-pointer'
                }`}
                title={
                  activePresetId
                    ? `이번 달 모든 ${header.name}요일에 [${activePreset?.label}] 일괄 적용/해제`
                    : `${header.name}요일`
                }
              >
                <span
                  className={`text-[12px] sm:text-sm font-extrabold ${
                    isSun ? 'text-rose-600' : isSat ? 'text-blue-600' : 'text-[var(--ab-text)]'
                  }`}
                >
                  {header.name}
                </span>
                {activePresetId && (
                  <span className="text-[10px] text-[var(--ab-boss)] font-bold leading-none mt-0.5">
                    일괄
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* 달력 날짜 그리드 (최소 40px 터치 영역 & 글씨 12px 이상 말줄임) */}
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
            const hasOverrides = Boolean(work?.overrides);

            return (
              <button
                key={dateStr}
                type="button"
                onClick={() => handleCellClick(dateStr, isCurrMonth)}
                onTouchStart={() => handleTouchStart(dateStr, isCurrMonth)}
                onTouchEnd={handleTouchEndOrCancel}
                onTouchMove={handleTouchEndOrCancel}
                onContextMenu={(e) => handleContextMenu(e, dateStr, isCurrMonth)}
                className={`min-h-[56px] sm:min-h-[84px] p-1 sm:p-2 rounded-lg sm:rounded-xl text-left flex flex-col justify-between transition-all touch-target relative group w-full min-w-0 overflow-hidden select-none ${
                  !isCurrMonth
                    ? 'bg-slate-100/60 border border-slate-200 text-slate-400 opacity-40 cursor-default'
                    : work
                    ? hasOverrides
                      ? 'bg-amber-50/70 border-2 border-amber-500 shadow-2xs'
                      : 'bg-[var(--ab-boss-soft)] border-2 border-[var(--ab-boss)] shadow-2xs'
                    : holiday
                    ? 'bg-rose-50/40 border border-rose-300 hover:border-rose-400 text-slate-800 shadow-2xs'
                    : activePresetId
                    ? 'bg-white border border-[var(--ab-line)] hover:border-[var(--ab-boss)] hover:bg-[var(--ab-boss-soft)]/40 text-slate-800 shadow-2xs'
                    : 'bg-white border border-[var(--ab-line)] hover:border-[var(--ab-boss)] text-slate-800 shadow-2xs'
                }`}
              >
                {/* 상단: 날짜 번호 + 공휴일 표시 + 개별수정 뱃지 */}
                <div className="flex items-start justify-between w-full min-w-0 leading-none">
                  <span
                    className={`text-[12px] sm:text-sm font-extrabold ${
                      !isCurrMonth
                        ? 'text-slate-400'
                        : holiday || isSun
                        ? 'text-rose-600'
                        : isSat
                        ? 'text-blue-600'
                        : 'text-[var(--ab-text)]'
                    }`}
                  >
                    {dayNum}
                  </span>

                  {/* 개별 수정 날짜 표시 (연필 아이콘) */}
                  {hasOverrides && isCurrMonth && (
                    <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-0.5 rounded leading-tight" title="개별 시간 수정됨">
                      ✏️
                    </span>
                  )}

                  {/* 공휴일 표시 */}
                  {holiday && isCurrMonth && !hasOverrides && (
                    <span
                      className="text-[10px] sm:text-[11px] font-extrabold text-rose-700 bg-rose-100 border border-rose-300 px-0.5 py-0.2 rounded truncate max-w-[28px] sm:max-w-[70px] leading-tight"
                      title={holiday.name}
                    >
                      <span className="sm:hidden">{holiday.name.slice(0, 2)}</span>
                      <span className="hidden sm:inline">{holiday.name}</span>
                    </span>
                  )}
                </div>

                {/* 하단: 근무 상태 표시 (글씨 12px 이상, 말줄임 적용) */}
                {work ? (
                  <div className="mt-0.5 w-full min-w-0">
                    {work.absent ? (
                      <span className="block w-full text-[12px] font-extrabold text-rose-700 bg-rose-100 border border-rose-300 rounded px-0.5 py-0.2 text-center truncate">
                        결근
                      </span>
                    ) : (
                      <>
                        {/* 모바일 뷰: 깔끔한 12px 알약 배지 */}
                        <div className="sm:hidden w-full min-w-0">
                          <div className={`w-full text-[12px] font-extrabold rounded px-0.5 py-0.2 text-center truncate flex items-center justify-center gap-0.5 border ${
                            hasOverrides
                              ? 'text-amber-900 bg-amber-100 border-amber-300'
                              : 'text-[var(--ab-boss)] bg-[var(--ab-boss-soft)] border-blue-300'
                          }`}>
                            <span className="truncate">{workHoursNum}h</span>
                            {(work.isHoliday || holiday) && (
                              <span className="w-1.5 h-1.5 rounded-full bg-rose-500 flex-shrink-0" />
                            )}
                          </div>
                        </div>

                        {/* 데스크톱 PC 뷰: 상세 시간 및 라벨 */}
                        <div className="hidden sm:block space-y-0.5 w-full min-w-0">
                          <div className={`text-[12px] font-bold rounded px-1.5 py-0.5 truncate border ${
                            hasOverrides
                              ? 'text-amber-900 bg-amber-100 border-amber-300'
                              : 'text-[var(--ab-boss)] bg-[var(--ab-boss-soft)] border-blue-300'
                          }`}>
                            {work.overrides?.label || preset?.label || '근무'} ({workHoursNum}h)
                          </div>
                          <div className="text-[12px] text-slate-700 font-semibold truncate">
                            {startTime}~{endTime}
                          </div>
                          <div className="flex flex-wrap gap-0.5">
                            {work.late && (
                              <span className="text-[10px] bg-amber-100 text-amber-800 border border-amber-300 px-1 rounded font-bold">
                                지각
                              </span>
                            )}
                            {(work.isHoliday || holiday) && (
                              <span className="text-[10px] bg-purple-100 text-purple-800 border border-purple-300 px-1 rounded font-bold">
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

        {/* 🎨 프리셋 칠하기 칩 바 (달력 바로 아래 항상 노출) */}
        <div className="pt-2 border-t border-[var(--ab-line)] space-y-2 w-full min-w-0">
          <div className="flex items-center justify-between">
            <span className="text-xs sm:text-sm font-extrabold text-[var(--ab-text)] flex items-center gap-1.5">
              <Paintbrush className="w-3.5 h-3.5 text-[var(--ab-boss)]" />
              <span>프리셋 칠하기:</span>
              <span className="text-[11px] font-medium text-[var(--ab-text-3)] hidden xs:inline">
                (칩 선택 후 날짜나 요일 탭)
              </span>
            </span>

            <button
              type="button"
              onClick={() => setShowPresetManager((v) => !v)}
              className="text-xs font-bold text-[var(--ab-boss)] hover:underline flex items-center gap-0.5 min-h-[36px]"
            >
              <span>프리셋 관리/추가</span>
              {showPresetManager ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
          </div>

          {/* 프리셋 칩 목록 */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {presets.map((preset) => {
              const isActive = activePresetId === preset.id;
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => handleTogglePresetChip(preset.id)}
                  className={`px-3 py-1.5 min-h-[40px] rounded-xl text-xs sm:text-sm font-extrabold flex items-center gap-1.5 transition-all touch-target shadow-2xs ${
                    isActive
                      ? 'bg-[var(--ab-boss)] text-white shadow-md ring-2 ring-blue-400 border border-[var(--ab-boss)] scale-[1.02]'
                      : 'bg-white hover:bg-slate-50 text-[var(--ab-text)] border border-[var(--ab-line-strong)]'
                  }`}
                >
                  {isActive ? <Check className="w-3.5 h-3.5 text-white" /> : <Sparkles className="w-3.5 h-3.5 text-[var(--ab-boss)]" />}
                  <span className="truncate">{preset.label}</span>
                  <span className={`text-[11px] px-1 py-0.2 rounded font-normal ${isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-[var(--ab-text-2)] border border-slate-200'}`}>
                    {preset.startTime}~{preset.endTime}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 달력 하단 상태별 동적 안내 문구 */}
        <div className={`p-2.5 rounded-xl text-xs sm:text-sm text-center transition-all ${
          activePresetId
            ? 'bg-[var(--ab-boss-soft)] border border-blue-300 text-[var(--ab-boss)] font-bold'
            : 'bg-slate-100 text-slate-600'
        }`}>
          {activePresetId ? (
            <p className="leading-snug">
              🎨 <strong>[{activePreset?.label}]</strong> 적용 중 — 날짜나 요일을 탭하세요. (길게 누르면 개별 수정)
            </p>
          ) : (
            <p className="leading-snug">
              👉 날짜를 터치하면 출퇴근 시간을 바로 적을 수 있고, <strong>위 프리셋을 고르면 여러 날을 한 번에 칠할 수 있어요.</strong>
            </p>
          )}
        </div>

        {/* 프리셋 관리 아코디언 */}
        {showPresetManager && (
          <div className="p-3 sm:p-4 pt-2 border-t border-[var(--ab-line)] bg-slate-50/70 space-y-3 animate-fadeIn w-full min-w-0 rounded-xl">
            <div className="flex items-center justify-between">
              <span className="text-xs sm:text-sm font-bold text-[var(--ab-text)]">등록된 근무 프리셋 목록</span>
              <button
                type="button"
                onClick={handleAddNewPreset}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 min-h-[36px] text-xs font-bold text-white bg-[var(--ab-boss)] hover:bg-[var(--ab-boss-hover)] rounded-lg shadow-xs transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>새 프리셋 추가</span>
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
                      className="p-3 rounded-xl border-2 border-[var(--ab-boss)] bg-white space-y-2.5 shadow-sm"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-[var(--ab-boss)]">프리셋 수정</span>
                        <div className="flex gap-1">
                          <button
                            type="button"
                            onClick={saveEditPreset}
                            className="p-1 min-w-[32px] min-h-[32px] bg-[var(--ab-boss)] text-white rounded hover:bg-[var(--ab-boss-hover)] flex items-center justify-center"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingPresetId(null);
                              setPresetEditForm(null);
                            }}
                            className="px-2 py-0.5 min-h-[32px] bg-slate-200 text-slate-700 rounded text-[11px] flex items-center justify-center"
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
                        className="w-full px-2 py-1.5 text-xs sm:text-sm bg-slate-50 border border-slate-300 rounded"
                        placeholder="프리셋 이름 (예: 평일 마감)"
                      />

                      <div className="grid grid-cols-3 gap-1 text-xs">
                        <div>
                          <label className="text-[11px] text-slate-500 block">시작</label>
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
                          <label className="text-[11px] text-slate-500 block">종료</label>
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
                          <label className="text-[11px] text-slate-500 block">휴게(분)</label>
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
                        <label className="text-[11px] text-slate-500 block">시급 (원)</label>
                        <input
                          type="number"
                          min="0"
                          step="100"
                          value={presetEditForm.hourlyWage}
                          onChange={(e) =>
                            setPresetEditForm((p) => p && { ...p, hourlyWage: parseInt(e.target.value, 10) || 0 })
                          }
                          className="w-full px-2 py-1.5 text-xs sm:text-sm bg-slate-50 border border-slate-300 rounded"
                        />
                      </div>
                    </div>
                  );
                }

                return (
                  <div
                    key={preset.id}
                    className="p-3 bg-white rounded-xl border border-[var(--ab-line)] shadow-2xs flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="font-extrabold text-xs sm:text-sm text-[var(--ab-text)]">{preset.label}</span>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => startEditPreset(preset)}
                            className="p-1 min-w-[32px] min-h-[32px] text-slate-400 hover:text-[var(--ab-boss)] rounded flex items-center justify-center"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          {presets.length > 1 && (
                            <button
                              type="button"
                              onClick={() => onDeletePreset(preset.id)}
                              className="p-1 min-w-[32px] min-h-[32px] text-slate-400 hover:text-rose-600 rounded flex items-center justify-center"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="text-[12px] text-slate-700 space-y-0.5">
                        <p>근무: {preset.startTime} ~ {preset.endTime} (휴게 {preset.breakMinutes}분)</p>
                        <p>실근로: <strong className="text-[var(--ab-boss)] font-bold">{formatMinutes(workMinutes)}</strong></p>
                        <p>시급: <strong className="text-slate-900 font-bold">{preset.hourlyWage.toLocaleString()}원</strong></p>
                      </div>
                    </div>

                    {isBelowMinWage && (
                      <p className="text-[11px] text-rose-600 mt-2 flex items-center gap-1 font-semibold">
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

      {/* 2. 하단 띠: 단색 var(--ab-navy) 적용 */}
      <div className="p-3 sm:p-4 bg-[var(--ab-navy)] rounded-2xl text-white shadow-md flex flex-col sm:flex-row items-center justify-between gap-2.5 sm:gap-3 w-full">
        <div className="text-center sm:text-left min-w-0">
          <div className="font-extrabold text-xs sm:text-base truncate">
            {currentMonthWorkCount > 0
              ? `이번 달 총 ${currentMonthWorkCount}일 근무 등록됨`
              : '달력 날짜를 터치해서 근무를 등록해보세요!'}
          </div>
          <p className="text-[11px] sm:text-xs text-slate-300 mt-0.5 truncate">
            등록한 근무를 바탕으로 주휴수당과 예상 월급을 계산합니다.
          </p>
        </div>

        <button
          type="button"
          onClick={onGoToResult}
          className="w-full sm:w-auto px-4 py-2 sm:px-5 sm:py-3 min-h-[44px] bg-white text-[var(--ab-boss)] hover:bg-slate-50 active:bg-slate-100 rounded-xl font-extrabold text-xs sm:text-sm flex items-center justify-center gap-1.5 shadow-md transition-all touch-target flex-shrink-0"
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
