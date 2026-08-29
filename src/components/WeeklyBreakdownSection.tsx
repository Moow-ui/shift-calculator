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
    <section className="bg-white rounded-2xl border border-slate-300/80 shadow-md shadow-slate-200/60 p-3 sm:p-5 space-y-4 w-full min-w-0">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-200 gap-2">
        <div>
          <h3 className="font-extrabold text-xs sm:text-sm text-slate-900 flex items-center gap-1.5">
            <FileText className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span>주차별 근무 기록 및 주휴수당 계산 근거</span>
          </h3>
          <p className="text-[11px] text-slate-500 mt-0.5">
            각 주차별 15시간 달성 여부와 주휴수당 발생 내역을 투명하게 증명합니다.
          </p>
        </div>

        {/* 사장님 제출용 액션 버튼 (복사 및 인쇄) */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <button
            type="button"
            onClick={handleCopyBossText}
            className={`px-2.5 py-1.5 rounded-xl text-xs font-extrabold flex items-center gap-1 transition-all shadow-2xs border ${
              copied
                ? 'bg-emerald-600 text-white border-emerald-700'
                : 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100 active:bg-emerald-200'
            }`}
            title="사장님께 카톡 등으로 전송할 수 있는 텍스트를 복사합니다"
          >
            {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? '복사 완료!' : '정산표 텍스트 복사'}</span>
          </button>

          <button
            type="button"
            onClick={handlePrint}
            className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 rounded-xl text-xs font-bold flex items-center gap-1 transition-colors shadow-2xs"
            title="인쇄 또는 PDF로 저장합니다"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>PDF/인쇄</span>
          </button>
        </div>
      </div>

      <div className="space-y-3 w-full min-w-0">
        {weeks.map((week) => {
          const isOpen = Boolean(openWeeks[week.weekIndex]);
          const workingDays = week.days.filter((d) => d.workMinutes > 0 || d.absent);

          return (
            <div
              key={week.weekIndex}
              className={`rounded-2xl border transition-all overflow-hidden shadow-2xs w-full min-w-0 ${
                week.totalWorkMinutes > 0
                  ? 'border-slate-300 bg-white'
                  : 'border-slate-200 bg-slate-100/60 opacity-60'
              }`}
            >
              {/* 주차 헤더 (모바일 완벽 가독성 레이아웃) */}
              <button
                type="button"
                onClick={() => toggleWeek(week.weekIndex)}
                className="w-full p-3 sm:p-4 text-left hover:bg-slate-50 transition-colors space-y-2.5"
              >
                {/* 1행: [1주차] 뱃지 + 기간 + 이번 주 급여 & 접기 아이콘 */}
                <div className="flex items-center justify-between w-full min-w-0 gap-2">
                  <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-lg font-black text-xs sm:text-sm bg-indigo-100 text-indigo-900 border border-indigo-200 flex-shrink-0">
                      {week.weekIndex}주차
                    </span>
                    <span className="text-xs sm:text-sm text-slate-600 font-bold whitespace-nowrap">
                      ({week.startDate.slice(5)} ~ {week.endDate.slice(5)})
                    </span>
                    {week.isSplitWeek && (
                      <span className="text-[10px] bg-amber-100 text-amber-900 border border-amber-300 px-1.5 py-0.2 rounded font-bold whitespace-nowrap">
                        월경계 안분 ({Math.round(week.allocationRatio * 100)}%)
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-xs sm:text-sm font-black text-indigo-700">
                      {week.totalWeeklyGrossPay.toLocaleString()}원
                    </span>
                    <div className="p-1 rounded-lg bg-slate-100 text-slate-600 border border-slate-200">
                      {isOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </div>
                  </div>
                </div>

                {/* 2행: 요약 뱃지들 (실근로, 근무일, 주휴수당 발생 여부) */}
                <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-200/80 text-xs w-full min-w-0 flex-wrap">
                  <div className="flex items-center gap-1.5 text-slate-700 text-[11px] sm:text-xs flex-wrap">
                    <span>주 실근로: <strong className="text-slate-900 font-bold">{formatMinutes(week.totalWorkMinutes)}</strong> ({week.totalWorkDaysCount}일)</span>
                    <span className="text-slate-300">·</span>
                    <span>가중시급: <strong className="text-slate-900 font-bold">{week.weightedAverageHourlyWage.toLocaleString()}원</strong></span>
                  </div>

                  <div className="text-[11px] sm:text-xs">
                    {week.weeklyHolidayEligible ? (
                      <span className="text-emerald-800 font-extrabold inline-flex items-center gap-1 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                        <span>주휴 {formatMinutes(week.weeklyHolidayMinutes)} 발생 ({week.weeklyHolidayPayMonthAllocated.toLocaleString()}원)</span>
                      </span>
                    ) : (
                      <span className="text-slate-500 font-semibold inline-flex items-center bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">
                        주휴 미발생 ({week.weeklyHolidayIneligibleReason || '15시간 미만'})
                      </span>
                    )}
                  </div>
                </div>
              </button>

              {/* 펼쳐진 상세 계산 근거 */}
              {isOpen && (
                <div className="px-3 pb-3.5 sm:px-4 sm:pb-4 pt-2.5 border-t border-slate-200 bg-slate-50/70 text-xs space-y-3 animate-fadeIn w-full min-w-0">
                  {/* 주휴수당 판정 근거 배너 */}
                  <div
                    className={`p-3 sm:p-3.5 rounded-xl border flex items-start gap-2.5 shadow-2xs ${
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
                    <div className="space-y-1 w-full min-w-0">
                      <div className="font-bold flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                        <span>
                          {week.weeklyHolidayEligible
                            ? `주휴수당: ${formatMinutes(week.weeklyHolidayMinutes)}분 × 시급 ${week.weightedAverageHourlyWage.toLocaleString()}원 = ${week.weeklyHolidayPayTotal.toLocaleString()}원`
                            : `주휴수당 미지급 (${week.weeklyHolidayIneligibleReason})`}
                        </span>
                        {week.isSplitWeek && week.weeklyHolidayEligible && (
                          <span className="text-[10px] sm:text-[11px] font-bold text-emerald-800 bg-white px-2 py-0.5 rounded-full border border-emerald-300 shadow-2xs self-start sm:self-auto">
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

                  {/* 일별 근무 목록 (모바일 카드 + 데스크톱 테이블) */}
                  {workingDays.length > 0 ? (
                    <div className="overflow-x-auto w-full">
                      <table className="w-full text-[11px] border-collapse bg-white rounded-xl overflow-hidden border border-slate-300 shadow-2xs">
                        <thead>
                          <tr className="bg-slate-100 text-slate-800 text-left border-b border-slate-300">
                            <th className="py-2 px-2.5 font-bold">날짜</th>
                            <th className="py-2 px-2.5 font-bold">근무 시간</th>
                            <th className="py-2 px-2 font-bold text-center">휴게</th>
                            <th className="py-2 px-2 font-bold text-center">실근로</th>
                            <th className="py-2 px-2.5 font-bold text-right">적용시급</th>
                            <th className="py-2 px-2.5 font-bold text-right">일 기본급</th>
                            {isOver5 && <th className="py-2 px-2.5 font-bold text-right">가산수당</th>}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                          {workingDays.map((d) => (
                            <tr
                              key={d.date}
                              className={`hover:bg-slate-50/80 transition-colors ${
                                d.absent ? 'bg-rose-50/50 text-rose-800' : ''
                              }`}
                            >
                              <td className="py-2 px-2.5 font-bold whitespace-nowrap">
                                <div className="flex items-center gap-1">
                                  <span>{d.date.slice(5)}</span>
                                  {d.isHoliday && (
                                    <span className="text-[9px] bg-rose-100 text-rose-700 px-1 rounded font-bold">
                                      휴일
                                    </span>
                                  )}
                                  {d.late && (
                                    <span className="text-[9px] bg-amber-100 text-amber-800 px-1 rounded font-bold">
                                      지각
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="py-2 px-2.5 text-slate-700 whitespace-nowrap">
                                {d.absent ? '결근' : `${d.startTime}~${d.endTime}`}
                              </td>
                              <td className="py-2 px-2 text-slate-500 text-center whitespace-nowrap">
                                {d.absent ? '-' : `${d.breakMinutes}분`}
                              </td>
                              <td className="py-2 px-2 font-bold text-slate-900 text-center whitespace-nowrap">
                                {d.absent ? '0분' : formatMinutes(d.workMinutes)}
                              </td>
                              <td className="py-2 px-2.5 text-right font-medium text-slate-700 whitespace-nowrap">
                                {d.effectiveHourlyWage.toLocaleString()}원
                              </td>
                              <td className="py-2 px-2.5 text-right font-bold text-slate-900 whitespace-nowrap">
                                {d.basePay.toLocaleString()}원
                              </td>
                              {isOver5 && (
                                <td className="py-2 px-2.5 text-right font-bold text-indigo-600 whitespace-nowrap">
                                  {(d.nightPay + d.holidayPay).toLocaleString()}원
                                </td>
                              )}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="p-3 text-center text-slate-400 bg-white rounded-xl border border-slate-200">
                      이 주차에는 등록된 근무가 없습니다.
                    </div>
                  )}

                  {/* 주차 요약 하단 바 */}
                  <div className="p-2.5 bg-white rounded-xl border border-slate-200 flex items-center justify-between text-xs font-extrabold flex-wrap gap-2">
                    <span className="text-slate-700">{week.weekIndex}주차 귀속 합계:</span>
                    <div className="flex items-center gap-3 text-right">
                      <span className="text-slate-600 font-semibold">
                        기본급: {week.basePay.toLocaleString()}원
                      </span>
                      {week.weeklyHolidayPayMonthAllocated > 0 && (
                        <span className="text-emerald-700 font-bold">
                          주휴: +{week.weeklyHolidayPayMonthAllocated.toLocaleString()}원
                        </span>
                      )}
                      {isOver5 && (week.overtimePay + week.nightPay + week.holidayPay) > 0 && (
                        <span className="text-indigo-600 font-bold">
                          가산: +{(week.overtimePay + week.nightPay + week.holidayPay).toLocaleString()}원
                        </span>
                      )}
                      <span className="text-indigo-700 text-sm font-black border-l border-slate-300 pl-2">
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
    </section>
  );
};
