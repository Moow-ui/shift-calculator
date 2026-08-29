import React, { useState } from 'react';
import { WeeklyPayrollDetail, Config, PayrollResult } from '../types/payroll';
import {
  FileText,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  AlertCircle,
  Copy,
  Printer,
  Check,
  Share2,
} from 'lucide-react';
import { formatMinutes } from '../lib/payroll';

interface WeeklyBreakdownSectionProps {
  weeks: WeeklyPayrollDetail[];
  config: Config;
  result?: PayrollResult;
}

export const WeeklyBreakdownSection: React.FC<WeeklyBreakdownSectionProps> = ({
  weeks,
  config,
  result,
}) => {
  const [openWeeks, setOpenWeeks] = useState<Record<number, boolean>>({
    1: true,
    2: true,
    3: true,
    4: true,
    5: true,
    6: true,
  });
  const [copied, setCopied] = useState(false);

  const toggleWeek = (index: number) => {
    setOpenWeeks((prev) => ({ ...prev, [index]: !prev[index] }));
  };

  const isOver5 = config.employeeCount === 'OVER_5';

  // 사장님 전송용 텍스트 생성
  const generateBossReportText = () => {
    const totalDays = result?.totalWorkDaysInMonth || 0;
    const totalMinutes = result?.totalWorkMinutesInMonth || 0;
    const gross = result?.grossSalary || 0;
    const base = result?.basePayTotal || 0;
    const holiday = result?.weeklyHolidayPayTotal || 0;
    const overtime = (result?.overtimePayTotal || 0) + (result?.nightPayTotal || 0) + (result?.holidayPayTotal || 0);

    let text = `[${config.year}년 ${config.month}월 알바 급여 정산 내역]\n`;
    text += `안녕하세요 사장님! 이번 달 근무 기록 및 급여 정산 내역 전달드립니다.\n\n`;
    text += `■ 이번 달 근무 요약\n`;
    text += `- 총 근무일수: ${totalDays}일\n`;
    text += `- 총 근무시간: ${formatMinutes(totalMinutes)}\n`;
    text += `- 매장 규모: ${isOver5 ? '상시 5인 이상 사업장' : '상시 5인 미만 사업장'}\n\n`;

    text += `■ 총 지급 예상액: ${gross.toLocaleString()}원\n`;
    text += `1. 기본급: ${base.toLocaleString()}원\n`;
    text += `2. 주휴수당: ${holiday.toLocaleString()}원 (주 15시간 이상 개근 주차)\n`;
    if (isOver5 && overtime > 0) {
      text += `3. 가산수당(야간·연장·휴일): ${overtime.toLocaleString()}원\n`;
    }
    text += `------------------------------------\n\n`;

    text += `■ 주차별 근무 및 주휴수당 계산 근거\n`;
    weeks.forEach((w) => {
      const activeDays = w.days.filter((d) => d.workMinutes > 0);
      if (activeDays.length === 0) return;

      text += `▶ [${w.weekIndex}주차] (${w.startDate} ~ ${w.endDate})\n`;
      text += ` - 주 실근로시간: ${formatMinutes(w.totalWorkMinutes)} (근무 ${w.totalWorkDaysCount}일)\n`;
      if (w.weeklyHolidayEligible) {
        text += ` - 주휴수당: ${w.weeklyHolidayPayMonthAllocated.toLocaleString()}원 (${formatMinutes(w.weeklyHolidayMinutes)}분 발생, 가중시급 ${w.weightedAverageHourlyWage.toLocaleString()}원)\n`;
        if (w.isSplitWeek) {
          text += `   * 이번 달 근무일수 안분 비율: ${Math.round(w.allocationRatio * 100)}% 반영\n`;
        }
      } else {
        text += ` - 주휴수당: 0원 (${w.weeklyHolidayIneligibleReason || '15시간 미만'})\n`;
      }
      activeDays.forEach((d) => {
        text += `   • ${d.date}: ${d.startTime}~${d.endTime} (휴게 ${d.breakMinutes}분, 실근로 ${formatMinutes(d.workMinutes)})\n`;
      });
      text += `\n`;
    });

    text += `* 본 정산 내역은 근로기준법 제55조(주휴수당) 및 실제 달력 근무 기록을 바탕으로 투명하게 산출되었습니다. 확인 부탁드립니다! 감사합니다.`;
    return text;
  };

  const handleCopyBossText = async () => {
    const text = generateBossReportText();
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      const input = document.createElement('textarea');
      input.value = text;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <section className="bg-white rounded-2xl border border-slate-300/80 shadow-md shadow-slate-200/60 p-4 sm:p-5 space-y-4">
      <div className="flex items-center justify-between pb-3 border-b border-slate-200">
        <div>
          <h3 className="font-extrabold text-xs sm:text-sm text-slate-900 flex items-center gap-2">
            <FileText className="w-4 h-4 text-emerald-600" />
            주차별 근무 기록 및 주휴수당 계산 근거
          </h3>
          <p className="text-[11px] text-slate-500">
            각 주차별 15시간 달성 여부와 주휴수당 발생 내역을 사장님께 증명할 수 있습니다.
          </p>
        </div>
      </div>

      <div className="space-y-3">
        {weeks.map((week) => {
          const isOpen = Boolean(openWeeks[week.weekIndex]);
          const workingDays = week.days.filter((d) => d.workMinutes > 0 || d.absent);

          return (
            <div
              key={week.weekIndex}
              className={`rounded-xl border transition-all overflow-hidden shadow-2xs ${
                week.totalWorkMinutes > 0
                  ? 'border-slate-300 bg-white'
                  : 'border-slate-200 bg-slate-100/60 opacity-60'
              }`}
            >
              {/* 주차 헤더 (아코디언 토글) */}
              <button
                type="button"
                onClick={() => toggleWeek(week.weekIndex)}
                className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-sm text-slate-900">
                        {week.weekIndex}주차
                      </span>
                      <span className="text-xs text-slate-500 font-medium">
                        ({week.startDate} ~ {week.endDate})
                      </span>
                      {week.isSplitWeek && (
                        <span className="text-[10px] bg-amber-100 text-amber-900 border border-amber-300 px-1.5 py-0.2 rounded font-bold">
                          월 경계 안분 ({Math.round(week.allocationRatio * 100)}%)
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 mt-1 text-xs">
                      <span className="text-slate-700">
                        주 실근로: <strong className="text-slate-900 font-bold">{formatMinutes(week.totalWorkMinutes)}</strong>
                      </span>
                      <span className="text-slate-300">·</span>
                      <span className="text-slate-700">
                        근무일: <strong className="text-slate-900 font-bold">{week.totalWorkDaysCount}일</strong>
                      </span>
                      <span className="text-slate-300">·</span>
                      <span className="text-slate-700">
                        가중시급: <strong className="text-slate-900 font-bold">{week.weightedAverageHourlyWage.toLocaleString()}원</strong>
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <div className="text-sm font-extrabold text-indigo-700">
                      {week.totalWeeklyGrossPay.toLocaleString()}원
                    </div>
                    <div className="text-[11px] text-slate-500">
                      {week.weeklyHolidayEligible ? (
                        <span className="text-emerald-700 font-bold flex items-center gap-0.5 justify-end">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> 주휴 {formatMinutes(week.weeklyHolidayMinutes)} 발생
                        </span>
                      ) : (
                        <span className="text-slate-400 font-medium">
                          주휴 미발생 ({week.weeklyHolidayIneligibleReason || '근무 없음'})
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="p-1 rounded-lg bg-slate-100 text-slate-600 border border-slate-200">
                    {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </div>
                </div>
              </button>

              {/* 펼쳐진 상세 계산 근거 */}
              {isOpen && (
                <div className="px-4 pb-4 pt-2.5 border-t border-slate-200 bg-slate-50/70 text-xs space-y-3 animate-fadeIn">
                  {/* 주휴수당 판정 근거 배너 */}
                  <div
                    className={`p-3.5 rounded-xl border flex items-start gap-2.5 shadow-2xs ${
                      week.weeklyHolidayEligible
                        ? 'bg-emerald-50 border-emerald-300 text-emerald-950'
                        : 'bg-slate-100 border-slate-300 text-slate-800'
                    }`}
                  >
                    {week.weeklyHolidayEligible ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-slate-500 flex-shrink-0 mt-0.5" />
                    )}
                    <div className="space-y-1 w-full">
                      <div className="font-bold flex items-center justify-between">
                        <span>
                          {week.weeklyHolidayEligible
                            ? `주휴수당 발생: ${formatMinutes(week.weeklyHolidayMinutes)}분 × 시급 ${week.weightedAverageHourlyWage.toLocaleString()}원 = ${week.weeklyHolidayPayTotal.toLocaleString()}원`
                            : `주휴수당 미지급 (${week.weeklyHolidayIneligibleReason})`}
                        </span>
                        {week.isSplitWeek && week.weeklyHolidayEligible && (
                          <span className="text-[11px] font-bold text-emerald-800 bg-white px-2 py-0.5 rounded-full border border-emerald-300 shadow-2xs">
                            이번 달 반영액: {week.weeklyHolidayPayMonthAllocated.toLocaleString()}원 ({Math.round(week.allocationRatio * 100)}%)
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] leading-relaxed opacity-90">
                        {week.weeklyHolidayEligible
                          ? `주 소정근로시간이 15시간 이상(${formatMinutes(week.totalWorkMinutes)})이고 결근이 없어 주휴수당이 정상 발생합니다.`
                          : week.hasAbsent
                          ? '소정 근로일에 결근이 발생하여 해당 주차의 주휴수당이 발생하지 않습니다.'
                          : '주 실근로시간이 15시간 미만이므로 주휴수당 지급 대상이 아닙니다.'}
                      </p>
                      {week.isSplitWeek && (
                        <p className="text-[10px] text-amber-900 bg-amber-100 p-2 rounded-lg border border-amber-300 mt-1">
                          ⚠️ 이 주는 전월 또는 다음 달로 이어지는 주이므로, 이번 달 근무일 수({week.currentMonthWorkDaysCount}일 / 총 {week.totalWorkDaysCount}일) 비율로 안분 계산되었습니다.
                        </p>
                      )}
                    </div>
                  </div>

                  {/* 일별 근무 목록 */}
                  {workingDays.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full text-[11px] border-collapse bg-white rounded-lg overflow-hidden border border-slate-300 shadow-2xs">
                        <thead>
                          <tr className="bg-slate-100 text-slate-800 text-left border-b border-slate-300">
                            <th className="py-2.5 px-2.5 font-bold">날짜</th>
                            <th className="py-2.5 px-2.5 font-bold">근무 시간</th>
                            <th className="py-2.5 px-2.5 font-bold">휴게</th>
                            <th className="py-2.5 px-2.5 font-bold">실근로</th>
                            <th className="py-2.5 px-2.5 font-bold">적용시급</th>
                            <th className="py-2.5 px-2.5 font-bold text-right">일 기본급</th>
                            {isOver5 && <th className="py-2.5 px-2.5 font-bold text-right">가산수당</th>}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 text-slate-800">
                          {workingDays.map((d) => {
                            const dailySurcharges = d.nightPay + d.holidayPay;
                            return (
                              <tr
                                key={d.date}
                                className={`${
                                  !d.isCurrentMonth
                                    ? 'bg-slate-100/70 text-slate-400'
                                    : d.absent
                                    ? 'bg-rose-50'
                                    : 'hover:bg-indigo-50/30'
                                }`}
                              >
                                <td className="py-2 px-2.5 font-semibold flex items-center gap-1.5">
                                  <span>{d.date}</span>
                                  {!d.isCurrentMonth && (
                                    <span className="text-[9px] text-slate-500 bg-slate-200 px-1 rounded border border-slate-300">
                                      연계
                                    </span>
                                  )}
                                  {d.absent && (
                                    <span className="text-[9px] text-rose-700 font-bold bg-rose-100 border border-rose-300 px-1 rounded">
                                      결근
                                    </span>
                                  )}
                                  {d.late && (
                                    <span className="text-[9px] text-amber-800 font-bold bg-amber-100 border border-amber-300 px-1 rounded">
                                      지각
                                    </span>
                                  )}
                                </td>
                                <td className="py-2 px-2.5">
                                  {d.absent ? '-' : `${d.startTime} ~ ${d.endTime}`}
                                </td>
                                <td className="py-2 px-2.5">
                                  {d.absent ? '-' : `${d.breakMinutes}분`}
                                </td>
                                <td className="py-2 px-2.5 font-bold text-indigo-700">
                                  {d.absent ? '-' : formatMinutes(d.workMinutes)}
                                </td>
                                <td className="py-2 px-2.5 font-semibold">
                                  {d.absent ? '-' : `${d.effectiveHourlyWage.toLocaleString()}원`}
                                  {d.isProbationReduced && (
                                    <span className="text-[9px] text-indigo-700 ml-1 font-bold">(수습 90%)</span>
                                  )}
                                </td>
                                <td className="py-2 px-2.5 text-right font-bold">
                                  {d.absent ? '0원' : `${Math.floor(d.basePay).toLocaleString()}원`}
                                </td>
                                {isOver5 && (
                                  <td className="py-2 px-2.5 text-right font-bold text-indigo-700">
                                    {dailySurcharges > 0 ? `+${Math.floor(dailySurcharges).toLocaleString()}원` : '-'}
                                  </td>
                                )}
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="py-3 text-center text-slate-400 text-[11px]">
                      이 주차에는 등록된 근무가 없습니다.
                    </div>
                  )}

                  {/* 주차 소계 */}
                  <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-white rounded-xl border border-slate-300 text-xs shadow-2xs">
                    <span className="font-bold text-slate-700">
                      {week.weekIndex}주차 귀속 합계:
                    </span>
                    <div className="flex items-center gap-3 font-semibold">
                      <span>기본급: {week.basePay.toLocaleString()}원</span>
                      {week.weeklyHolidayPayMonthAllocated > 0 && (
                        <span className="text-emerald-800 font-bold">
                          + 주휴: {week.weeklyHolidayPayMonthAllocated.toLocaleString()}원
                        </span>
                      )}
                      <span className="font-extrabold text-slate-900 border-l border-slate-300 pl-3">
                        총 {week.totalWeeklyGrossPay.toLocaleString()}원
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* 사장님께 바로 보내는 전송 도구 (텍스트 복사 & PDF/인쇄 출력) */}
      <div className="p-4 bg-slate-100/90 rounded-2xl border border-slate-300/90 shadow-2xs space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <div className="font-extrabold text-xs sm:text-sm text-slate-900 flex items-center gap-1.5">
              <Share2 className="w-4 h-4 text-indigo-600" />
              사장님께 급여 내역 및 계산 근거 전달하기
            </div>
            <p className="text-[11px] text-slate-600">
              카카오톡으로 바로 보낼 수 있는 정리된 텍스트를 복사하거나, PDF 명세서로 인쇄할 수 있습니다.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {/* 1. 카톡/문자용 텍스트 복사 */}
          <button
            type="button"
            onClick={handleCopyBossText}
            className="p-3 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-xs transition-all touch-target"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 text-emerald-300" />
                <span>✅ 사장님 전송용 텍스트 복사됨!</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                <span>📋 사장님께 보낼 텍스트 복사하기 (카톡용)</span>
              </>
            )}
          </button>

          {/* 2. PDF / 인쇄용 명세서 출력 */}
          <button
            type="button"
            onClick={handlePrint}
            className="p-3 bg-white hover:bg-slate-50 text-slate-900 border border-slate-300 rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-xs transition-all touch-target"
          >
            <Printer className="w-4 h-4 text-slate-700" />
            <span>📄 PDF 저장 및 명세서 인쇄하기</span>
          </button>
        </div>
      </div>
    </section>
  );
};
