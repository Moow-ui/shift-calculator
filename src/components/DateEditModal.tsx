import React, { useState, useEffect } from 'react';
import { ShiftPreset, WorkDay } from '../types/payroll';
import {
  X,
  Trash2,
  Clock,
  Sparkles,
  PartyPopper,
  Edit3,
  CheckCircle2,
  CalendarCheck,
} from 'lucide-react';
import { getMinimumWage } from '../config/minimumWage';
import { calculateDailyWorkMinutes, formatMinutes } from '../lib/payroll';
import { getKoreanHoliday } from '../config/holidays';

interface DateEditModalProps {
  isOpen: boolean;
  dateStr: string;
  targetYear: number;
  baseHourlyWage: number;
  presets: ShiftPreset[];
  existingWorkDay?: WorkDay;
  onClose: () => void;
  onSave: (workDay: WorkDay) => void;
  onDelete: (dateStr: string) => void;
}

export const DateEditModal: React.FC<DateEditModalProps> = ({
  isOpen,
  dateStr,
  targetYear,
  baseHourlyWage,
  presets,
  existingWorkDay,
  onClose,
  onSave,
  onDelete,
}) => {
  const minWage = getMinimumWage(targetYear);
  const holidayInfo = getKoreanHoliday(dateStr);
  const effectiveWage = baseHourlyWage || minWage;

  // 이미 등록된 날인 경우 기본적으로 '칭찬/요약 뷰'를 보여주고, 수정 버튼을 누르면 편집 모드로 전환
  const [isEditingMode, setIsEditingMode] = useState<boolean>(!existingWorkDay);

  const [startTime, setStartTime] = useState<string>('09:00');
  const [endTime, setEndTime] = useState<string>('18:00');
  const [breakMinutes, setBreakMinutes] = useState<number>(60);
  const [absent, setAbsent] = useState<boolean>(false);
  const [late, setLate] = useState<boolean>(false);
  const [isHoliday, setIsHoliday] = useState<boolean>(Boolean(holidayInfo));
  const [presetLabel, setPresetLabel] = useState<string>('근무');

  useEffect(() => {
    if (existingWorkDay) {
      setIsEditingMode(false); // 이미 입력된 날은 칭찬 요약 카드부터 표시
      setAbsent(Boolean(existingWorkDay.absent));
      setLate(Boolean(existingWorkDay.late));
      setIsHoliday(
        existingWorkDay.isHoliday !== undefined
          ? existingWorkDay.isHoliday
          : Boolean(holidayInfo)
      );

      const preset = existingWorkDay.presetId
        ? presets.find((p) => p.id === existingWorkDay.presetId)
        : undefined;

      setStartTime(existingWorkDay.overrides?.startTime || preset?.startTime || '09:00');
      setEndTime(existingWorkDay.overrides?.endTime || preset?.endTime || '18:00');
      setBreakMinutes(
        existingWorkDay.overrides?.breakMinutes !== undefined
          ? existingWorkDay.overrides.breakMinutes
          : preset?.breakMinutes ?? 60
      );
      setPresetLabel(existingWorkDay.overrides?.label || preset?.label || '근무');
    } else {
      // 신규 등록 시 기본 프리셋 또는 기본 시간 설정
      setIsEditingMode(true);
      const defaultPreset = presets[0];
      setStartTime(defaultPreset?.startTime || '09:00');
      setEndTime(defaultPreset?.endTime || '18:00');
      setBreakMinutes(defaultPreset?.breakMinutes ?? 60);
      setPresetLabel(defaultPreset?.label || '근무');
      setAbsent(false);
      setLate(false);
      setIsHoliday(Boolean(holidayInfo));
    }
  }, [existingWorkDay, presets, dateStr, holidayInfo]);

  if (!isOpen) return null;

  const { workMinutes } = calculateDailyWorkMinutes(
    startTime,
    endTime,
    breakMinutes
  );

  // 일당 계산 (실근로시간 × 시급)
  const earnedDailyPay = absent ? 0 : Math.round((workMinutes / 60) * effectiveWage);

  // 빠른 프리셋 적용
  const handleQuickPreset = (preset: ShiftPreset) => {
    setStartTime(preset.startTime);
    setEndTime(preset.endTime);
    setBreakMinutes(preset.breakMinutes);
    setPresetLabel(preset.label);
    setAbsent(false);
  };

  const handleSave = () => {
    const workDay: WorkDay = {
      date: dateStr,
      overrides: {
        startTime,
        endTime,
        breakMinutes,
        hourlyWage: effectiveWage,
        label: presetLabel || '근무',
      },
      absent,
      late,
      isHoliday,
    };

    onSave(workDay);
    onClose();
  };

  const handleDelete = () => {
    if (window.confirm(`${dateStr} 근무 기록을 삭제하시겠습니까?`)) {
      onDelete(dateStr);
      onClose();
    }
  };

  // 날짜 형식 예: 2026년 8월 15일 (토)
  const [yearStr, monthStr, dayStr] = dateStr.split('-');
  const dateObj = new Date(parseInt(yearStr, 10), parseInt(monthStr, 10) - 1, parseInt(dayStr, 10));
  const weekDayName = ['일', '월', '화', '수', '목', '금', '토'][dateObj.getDay()];

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-fadeIn">
      <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl border border-slate-300 overflow-hidden animate-scaleUp">
        {/* 모달 헤더 */}
        <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold text-xs shadow-xs">
              📅
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900 text-xs sm:text-sm flex items-center gap-1.5">
                <span>{parseInt(monthStr, 10)}월 {parseInt(dayStr, 10)}일 ({weekDayName})</span>
                {holidayInfo && (
                  <span className="text-[10px] font-bold text-rose-700 bg-rose-100 border border-rose-300 px-1.5 py-0.2 rounded-md flex items-center gap-0.5">
                    <PartyPopper className="w-2.5 h-2.5" />
                    {holidayInfo.name}
                  </span>
                )}
              </h3>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 1. 이미 입력된 날: 칭찬 & 보상 기록 카드 (isEditingMode === false) */}
        {!isEditingMode && existingWorkDay ? (
          <div className="p-4 sm:p-5 space-y-4 text-center">
            {/* 칭찬 카드 박스 */}
            <div className="p-4 rounded-2xl bg-gradient-to-br from-indigo-500 via-indigo-600 to-indigo-700 text-white shadow-md shadow-indigo-200 space-y-3 border border-indigo-400">
              <div className="w-12 h-12 mx-auto rounded-full bg-white/20 flex items-center justify-center text-2xl shadow-inner">
                🎉
              </div>

              {absent ? (
                <div className="space-y-1">
                  <div className="text-base font-extrabold">이날은 푹 쉬었어요! (결근)</div>
                  <p className="text-xs text-indigo-100 opacity-90">
                    약속된 근무일에 출근하지 않은 날입니다.
                  </p>
                </div>
              ) : (
                <div className="space-y-1.5">
                  <div className="text-base sm:text-lg font-black leading-snug">
                    이날은 <span className="text-amber-300 underline decoration-amber-300/60 decoration-2 underline-offset-2">{startTime} ~ {endTime}</span><br />
                    열심히 일했어요! 👏
                  </div>
                  <div className="pt-2 border-t border-indigo-400/60">
                    <span className="text-xs text-indigo-200">이날 일해서 번 돈</span>
                    <div className="text-2xl sm:text-3xl font-black text-amber-300 mt-0.5 tracking-tight">
                      {earnedDailyPay.toLocaleString()}원
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* 상세 요약 바 */}
            {!absent && (
              <div className="p-3 bg-slate-100/90 rounded-xl border border-slate-300 text-xs text-slate-700 space-y-1.5 text-left shadow-2xs">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-600">실제 일한 시간:</span>
                  <span className="font-extrabold text-slate-900">
                    {formatMinutes(workMinutes)} <span className="text-[10px] text-slate-500 font-normal">(휴게 {breakMinutes}분 제외)</span>
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-600">적용 시급:</span>
                  <span className="font-extrabold text-slate-900">{effectiveWage.toLocaleString()}원</span>
                </div>
                {isHoliday && (
                  <div className="flex items-center justify-between text-purple-700 font-bold text-[11px] pt-1 border-t border-slate-200">
                    <span>🔴 빨간날(유급휴일) 근무</span>
                    <span>휴일 가산 대상</span>
                  </div>
                )}
                {late && (
                  <div className="flex items-center justify-between text-amber-800 font-bold text-[11px]">
                    <span>⚠️ 지각/조퇴 체크됨</span>
                  </div>
                )}
              </div>
            )}

            {/* 하단 액션 버튼 (수정하기 & 삭제하기) */}
            <div className="space-y-2 pt-1">
              <button
                type="button"
                onClick={() => setIsEditingMode(true)}
                className="w-full py-2.5 px-3 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white rounded-xl font-extrabold text-xs flex items-center justify-center gap-1.5 shadow-sm transition-all"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>근무 시간 수정하기</span>
              </button>

              <div className="flex items-center justify-between gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleDelete}
                  className="px-3 py-1.5 text-xs font-bold text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-lg flex items-center gap-1 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>근무 삭제</span>
                </button>

                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-1.5 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                >
                  닫기
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* 2. 입력되지 않은 날 / 수정 모드: 출퇴근 시각 중심 UI */
          <div className="p-4 sm:p-5 space-y-3.5 max-h-[78vh] overflow-y-auto">
            {/* 공휴일 감지 시 알림 */}
            {holidayInfo && (
              <div className="p-2 bg-rose-50 border border-rose-300 rounded-xl text-xs text-rose-800 flex items-center justify-between">
                <span className="font-bold flex items-center gap-1">
                  🎉 {holidayInfo.name} (공휴일)
                </span>
                <span className="text-[10px] bg-rose-100 text-rose-800 px-2 py-0.5 rounded-md font-bold">
                  빨간날 자동인식
                </span>
              </div>
            )}

            {!absent ? (
              <>
                {/* 1. 출근 시각 & 퇴근 시각 (iOS 사파리 겹침 방지 min-w-0 적용) */}
                <div className="p-3.5 bg-slate-100/90 rounded-2xl border border-slate-300 space-y-3 shadow-2xs w-full min-w-0">
                  <div className="grid grid-cols-2 gap-3 w-full min-w-0">
                    <div className="w-full min-w-0 flex flex-col">
                      <label className="block text-xs font-extrabold text-slate-800 mb-1 flex items-center gap-1 truncate">
                        <Clock className="w-3.5 h-3.5 text-indigo-600 flex-shrink-0" />
                        <span>출근 시각</span>
                      </label>
                      <input
                        type="time"
                        value={startTime}
                        onChange={(e) => setStartTime(e.target.value)}
                        className="w-full min-w-0 px-2 py-2 text-sm font-extrabold bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500/20 text-slate-900 shadow-2xs text-center appearance-none"
                      />
                    </div>

                    <div className="w-full min-w-0 flex flex-col">
                      <label className="block text-xs font-extrabold text-slate-800 mb-1 flex items-center gap-1 truncate">
                        <Clock className="w-3.5 h-3.5 text-indigo-600 flex-shrink-0" />
                        <span>퇴근 시각</span>
                      </label>
                      <input
                        type="time"
                        value={endTime}
                        onChange={(e) => setEndTime(e.target.value)}
                        className="w-full min-w-0 px-2 py-2 text-sm font-extrabold bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500/20 text-slate-900 shadow-2xs text-center appearance-none"
                      />
                    </div>
                  </div>

                  {/* 휴게시간 입력 */}
                  <div className="pt-2 border-t border-slate-200 flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700">휴게시간 (쉬는 시간)</span>
                    <div className="flex items-center gap-1">
                      {[0, 30, 60].map((mins) => (
                        <button
                          key={mins}
                          type="button"
                          onClick={() => setBreakMinutes(mins)}
                          className={`px-2 py-0.5 rounded-lg text-xs font-bold transition-colors ${
                            breakMinutes === mins
                              ? 'bg-indigo-600 text-white shadow-2xs'
                              : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          {mins}분
                        </button>
                      ))}
                      <div className="relative w-14">
                        <input
                          type="number"
                          min="0"
                          step="10"
                          value={breakMinutes}
                          onChange={(e) => setBreakMinutes(parseInt(e.target.value, 10) || 0)}
                          className="w-full pl-1.5 pr-4 py-0.5 text-xs font-bold bg-white border border-slate-300 rounded-lg text-right shadow-2xs"
                        />
                        <span className="absolute right-1 top-1 text-[10px] text-slate-400">분</span>
                      </div>
                    </div>
                  </div>

                  {/* 실근로시간 및 예상 일당 실시간 계산 */}
                  <div className="p-2.5 bg-white rounded-xl border border-slate-300 flex items-center justify-between text-xs shadow-2xs">
                    <span className="text-slate-600 font-semibold">실제 일한 시간:</span>
                    <span className="font-extrabold text-indigo-700 text-sm">
                      {formatMinutes(workMinutes)}{' '}
                      <span className="text-[11px] font-bold text-slate-800">
                        ({earnedDailyPay.toLocaleString()}원)
                      </span>
                    </span>
                  </div>
                </div>

                {/* 2. 빠른 프리셋 선택 버튼 (있을 경우) */}
                {presets.length > 0 && (
                  <div className="space-y-1">
                    <span className="text-[11px] font-bold text-slate-500 flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-amber-500" />
                      자주 쓰는 시간으로 채우기:
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {presets.map((preset) => (
                        <button
                          key={preset.id}
                          type="button"
                          onClick={() => handleQuickPreset(preset)}
                          className="px-2.5 py-1 text-xs bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 border border-slate-300 hover:border-indigo-300 rounded-lg font-bold transition-colors"
                        >
                          {preset.label} ({preset.startTime}~{preset.endTime})
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* 3. 빨간날(유급휴일) 추가 체크 */}
                <label className="p-3 bg-purple-50/70 border border-purple-200 rounded-xl flex items-center justify-between cursor-pointer hover:bg-purple-50 transition-colors shadow-2xs">
                  <div className="flex items-center gap-2">
                    <CalendarCheck className="w-4 h-4 text-purple-600" />
                    <div>
                      <span className="font-extrabold text-xs text-purple-950">
                        빨간날(유급휴일)로 계산하기
                      </span>
                      <p className="text-[10px] text-purple-700">
                        법정공휴일 또는 주휴일에 일한 경우 가산 적용
                      </p>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={isHoliday}
                    onChange={(e) => setIsHoliday(e.target.checked)}
                    className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500 border-slate-300"
                  />
                </label>
              </>
            ) : (
              <div className="p-4 bg-rose-50 border border-rose-300 rounded-xl text-center text-xs text-rose-800 space-y-1">
                <p className="font-bold">❌ 결근으로 설정되었습니다.</p>
                <p className="text-[11px] opacity-90">
                  약속된 근무일에 출근하지 않으면 해당 주의 주휴수당이 발생하지 않습니다.
                </p>
              </div>
            )}

            {/* 4. 하단 특이사항 (결근 · 지각/조퇴) */}
            <div className="p-2.5 bg-slate-100/80 rounded-xl border border-slate-200 flex items-center justify-between text-xs">
              <span className="text-[11px] font-bold text-slate-500">특이사항:</span>
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-1 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={absent}
                    onChange={(e) => setAbsent(e.target.checked)}
                    className="w-3.5 h-3.5 rounded text-rose-600 border-slate-300"
                  />
                  <span className={`text-[11px] ${absent ? 'font-extrabold text-rose-600' : 'text-slate-600'}`}>
                    결근 (안 나감)
                  </span>
                </label>

                <label className="flex items-center gap-1 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={late}
                    onChange={(e) => setLate(e.target.checked)}
                    className="w-3.5 h-3.5 rounded text-amber-600 border-slate-300"
                  />
                  <span className={`text-[11px] ${late ? 'font-extrabold text-amber-800' : 'text-slate-600'}`}>
                    지각/조퇴
                  </span>
                </label>
              </div>
            </div>

            {/* 저장 / 취소 버튼 */}
            <div className="pt-2 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2.5 px-3 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors text-center"
              >
                취소
              </button>
              <button
                type="button"
                onClick={handleSave}
                className="flex-2 py-2.5 px-4 text-xs font-extrabold text-white bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 rounded-xl shadow-xs transition-colors flex items-center justify-center gap-1.5"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>이 날 근무 저장하기</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
