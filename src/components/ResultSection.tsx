import React, { useState } from 'react';
import { PayrollResult } from '../types/payroll';
import {
  Coins,
  ShieldCheck,
  Info,
  Gift,
  Moon,
  Clock,
  CalendarCheck,
  ChevronDown,
  ChevronUp,
  HelpCircle,
  ArrowDown,
  UserCheck,
} from 'lucide-react';
import { formatMinutes } from '../lib/payroll';

interface ResultSectionProps {
  result: PayrollResult;
  onOpenConfig: () => void;
}

export const ResultSection: React.FC<ResultSectionProps> = ({
  result,
  onOpenConfig,
}) => {
  const { config, deduction } = result;
  const isOver5 = config.employeeCount === 'OVER_5';

  const [actualPayInput, setActualPayInput] = useState<string>('');
  const [showItemizedDetails, setShowItemizedDetails] = useState<boolean>(false);

  const actualPayNum = parseInt(actualPayInput.replace(/,/g, ''), 10) || 0;
  const payDiff = actualPayNum > 0 ? actualPayNum - result.netSalary : null;

  return (
    <section className="bg-white rounded-2xl border border-slate-300/80 shadow-md shadow-slate-200/60 p-3.5 sm:p-6 space-y-3.5 sm:space-y-4 w-full min-w-0 overflow-hidden">
      {/* 헤더 (모바일에서도 줄바꿈 없이 깔끔하게 한 줄 구성) */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-200 gap-1.5 w-full min-w-0">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold text-xs sm:text-sm shadow-xs shadow-indigo-200 flex-shrink-0">
            💰
          </div>
          <div className="min-w-0">
            <h2 className="text-xs sm:text-base font-extrabold text-slate-900 leading-tight truncate">
              {config.year}년 {config.month}월 예상 급여
            </h2>
            <p className="text-[10px] sm:text-xs text-slate-500 mt-0.5 truncate">
              총 {result.totalWorkDaysInMonth}일 출근 · 총 {formatMinutes(result.totalWorkMinutesInMonth)} 근무
            </p>
          </div>
        </div>

        <span className="text-[10px] sm:text-xs font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-800 border border-indigo-200 flex-shrink-0 shadow-2xs whitespace-nowrap">
          {isOver5 ? '5인 이상' : '5인 미만'}
        </span>
      </div>

      {/* 메인 급여 카드 (세전 총액 & 실수령액) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 w-full min-w-0">
        {/* 세전 총액 */}
        <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-indigo-600 via-indigo-700 to-indigo-800 text-white shadow-md shadow-indigo-200 flex flex-col justify-between border border-indigo-500 min-w-0">
          <div>
            <div className="flex items-center justify-between text-xs text-indigo-200 font-medium mb-1">
              <span className="truncate">내가 일해서 번 총 금액 (세전)</span>
              <span className="bg-white/20 text-white px-2 py-0.5 rounded-full text-[10px] font-semibold flex-shrink-0 ml-1">
                법정 합계
              </span>
            </div>
            <div className="text-2xl sm:text-4xl font-extrabold tracking-tight mt-1 truncate">
              {result.grossSalary.toLocaleString()}<span className="text-base sm:text-xl font-normal ml-1">원</span>
            </div>
          </div>

          <div className="mt-3 sm:mt-4 pt-2.5 sm:pt-3 border-t border-indigo-500/60 flex flex-wrap items-center justify-between text-[11px] sm:text-xs text-indigo-100 gap-1">
            <span>기본급: {result.basePayTotal.toLocaleString()}원</span>
            <span>주휴: {result.weeklyHolidayPayTotal.toLocaleString()}원</span>
            {isOver5 && (
              <span>가산: {(result.overtimePayTotal + result.nightPayTotal + result.holidayPayTotal).toLocaleString()}원</span>
            )}
          </div>
        </div>

        {/* 공제 후 예상 실수령액 */}
        <div className="p-4 sm:p-5 rounded-2xl bg-slate-900 text-white shadow-md shadow-slate-300 flex flex-col justify-between border border-slate-800 min-w-0">
          <div>
            <div className="flex items-center justify-between text-xs text-slate-400 font-medium mb-1">
              <span className="flex items-center gap-1 truncate">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                <span>통장 예상 실수령액</span>
              </span>
              <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full text-[10px] font-bold flex-shrink-0 ml-1">
                공제 추정
              </span>
            </div>
            <div className="text-2xl sm:text-4xl font-extrabold tracking-tight text-emerald-400 mt-1 truncate">
              {result.netSalary.toLocaleString()}<span className="text-base sm:text-xl font-normal ml-1 text-slate-300">원</span>
            </div>
          </div>

          <div className="mt-3 sm:mt-4 pt-2.5 sm:pt-3 border-t border-slate-800 flex items-center justify-between text-[11px] sm:text-xs text-slate-400">
            <span>
              예상 공제액 ({config.taxMode === 'NONE' ? '비과세' : config.taxMode === 'DAILY_WORKER' ? '일용직' : '4대보험'}):
            </span>
            <span className="font-bold text-rose-400">
              -{deduction.totalDeduction.toLocaleString()}원
            </span>
          </div>
        </div>
      </div>

      {/* 1. 급여 항목별 상세 내역 (버튼 클릭 시 펼침) */}
      <div className="rounded-2xl border border-slate-300/90 bg-slate-100/70 overflow-hidden shadow-2xs transition-all w-full min-w-0">
        <button
          type="button"
          onClick={() => setShowItemizedDetails((v) => !v)}
          className="w-full p-3 sm:p-4 flex items-center justify-between text-left hover:bg-slate-200/60 transition-colors"
        >
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold text-xs shadow-2xs flex-shrink-0">
              <Coins className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
            <div className="min-w-0">
              <h3 className="font-extrabold text-xs sm:text-sm text-slate-900 flex items-center gap-1.5 flex-wrap">
                <span>급여 세부 항목 보기</span>
                <span className="text-[10px] sm:text-[11px] font-semibold text-slate-600 bg-white px-1.5 py-0.2 rounded-full border border-slate-300 shadow-2xs">
                  기본급·주휴·야간·연장·휴일
                </span>
              </h3>
            </div>
          </div>

          <div className="flex items-center gap-1 text-[11px] sm:text-xs font-bold text-indigo-700 bg-white px-2 py-1 rounded-lg border border-slate-300 shadow-2xs flex-shrink-0">
            <span>{showItemizedDetails ? '접기' : '펼치기'}</span>
            {showItemizedDetails ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </div>
        </button>

        {showItemizedDetails && (
          <div className="p-3 sm:p-4 pt-2 border-t border-slate-300/80 bg-white space-y-2 animate-fadeIn w-full min-w-0">
            {/* 1. 기본급 */}
            <div className="p-3 rounded-xl border border-slate-300 bg-slate-50/90 flex items-center justify-between gap-1 shadow-2xs">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-slate-200 text-slate-800 flex items-center justify-center flex-shrink-0 border border-slate-300">
                  <Clock className="w-3.5 h-3.5" />
                </div>
                <div className="min-w-0">
                  <div className="font-extrabold text-xs text-slate-900 truncate">일한 시간 기본급</div>
                  <div className="text-[10px] sm:text-[11px] text-slate-600 truncate">
                    총 {formatMinutes(result.totalWorkMinutesInMonth)} × 내 시급
                  </div>
                </div>
              </div>
              <div className="text-right flex-shrink-0 pl-2">
                <div className="text-sm sm:text-base font-extrabold text-slate-900">
                  {result.basePayTotal.toLocaleString()}원
                </div>
              </div>
            </div>

            {/* 2. 주휴수당 */}
            <div className="p-3 rounded-xl border border-emerald-300 bg-emerald-50/80 flex items-center justify-between gap-1 shadow-2xs">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-emerald-200 text-emerald-800 flex items-center justify-center flex-shrink-0 border border-emerald-300">
                  <Gift className="w-3.5 h-3.5" />
                </div>
                <div className="min-w-0">
                  <div className="font-extrabold text-xs text-emerald-950 truncate flex items-center gap-1">
                    <span>주휴수당</span>
                    <span className="text-[9px] bg-emerald-200 text-emerald-900 px-1 py-0.2 rounded font-bold">
                      의무
                    </span>
                  </div>
                  <div className="text-[10px] sm:text-[11px] text-emerald-800 truncate">
                    주 15시간 이상 개근 보너스
                  </div>
                </div>
              </div>
              <div className="text-right flex-shrink-0 pl-2">
                <div className="text-sm sm:text-base font-extrabold text-emerald-900">
                  {result.weeklyHolidayPayTotal.toLocaleString()}원
                </div>
              </div>
            </div>

            {/* 3. 야간수당 */}
            <div className={`p-3 rounded-xl border flex items-center justify-between gap-1 shadow-2xs ${
              isOver5 ? 'border-violet-300 bg-violet-50/80' : 'border-slate-300 bg-slate-50/60 opacity-80'
            }`}>
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-violet-200 text-violet-800 flex items-center justify-center flex-shrink-0 border border-violet-300">
                  <Moon className="w-3.5 h-3.5" />
                </div>
                <div className="min-w-0">
                  <div className="font-extrabold text-xs text-slate-900 truncate">
                    야간수당 (밤 10시~아침 6시)
                  </div>
                  <div className="text-[10px] sm:text-[11px] text-slate-600 truncate">
                    {isOver5 ? '심야 근무 50% 추가 가산' : '5인 미만 제외'}
                  </div>
                </div>
              </div>
              <div className="text-right flex-shrink-0 pl-2">
                <div className="text-sm sm:text-base font-extrabold text-slate-900">
                  {result.nightPayTotal.toLocaleString()}원
                </div>
              </div>
            </div>

            {/* 4. 연장수당 */}
            <div className={`p-3 rounded-xl border flex items-center justify-between gap-1 shadow-2xs ${
              isOver5 ? 'border-indigo-300 bg-indigo-50/80' : 'border-slate-300 bg-slate-50/60 opacity-80'
            }`}>
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-indigo-200 text-indigo-800 flex items-center justify-center flex-shrink-0 border border-indigo-300">
                  <Clock className="w-3.5 h-3.5" />
                </div>
                <div className="min-w-0">
                  <div className="font-extrabold text-xs text-slate-900 truncate">
                    연장수당 (하루 8시간 초과)
                  </div>
                  <div className="text-[10px] sm:text-[11px] text-slate-600 truncate">
                    {isOver5 ? '8h 초과분 50% 추가 가산' : '5인 미만 제외'}
                  </div>
                </div>
              </div>
              <div className="text-right flex-shrink-0 pl-2">
                <div className="text-sm sm:text-base font-extrabold text-slate-900">
                  {result.overtimePayTotal.toLocaleString()}원
                </div>
              </div>
            </div>

            {/* 5. 휴일수당 */}
            <div className={`p-3 rounded-xl border flex items-center justify-between gap-1 shadow-2xs ${
              isOver5 ? 'border-purple-300 bg-purple-50/80' : 'border-slate-300 bg-slate-50/60 opacity-80'
            }`}>
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-purple-200 text-purple-800 flex items-center justify-center flex-shrink-0 border border-purple-300">
                  <CalendarCheck className="w-3.5 h-3.5" />
                </div>
                <div className="min-w-0">
                  <div className="font-extrabold text-xs text-slate-900 truncate">
                    휴일수당 (빨간날 근무)
                  </div>
                  <div className="text-[10px] sm:text-[11px] text-slate-600 truncate">
                    {isOver5 ? '공휴일 근무 50%~100% 가산' : '5인 미만 제외'}
                  </div>
                </div>
              </div>
              <div className="text-right flex-shrink-0 pl-2">
                <div className="text-sm sm:text-base font-extrabold text-slate-900">
                  {result.holidayPayTotal.toLocaleString()}원
                </div>
              </div>
            </div>

            {/* 6. 수습기간 적용 상태 */}
            <div className="p-3 rounded-xl border border-amber-300 bg-amber-50/70 flex items-center justify-between gap-1 shadow-2xs">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-amber-200 text-amber-800 flex items-center justify-center flex-shrink-0 border border-amber-300">
                  <UserCheck className="w-3.5 h-3.5" />
                </div>
                <div className="min-w-0">
                  <div className="font-extrabold text-xs text-slate-900 truncate">수습기간 적용 여부</div>
                  <div className="text-[10px] sm:text-[11px] text-slate-600 truncate">
                    {result.probationApplied ? '10% 감액 (90% 지급)' : '감액 없음 (100% 전액)'}
                  </div>
                </div>
              </div>
              <div className="text-right flex-shrink-0 pl-2">
                <div className={`text-xs sm:text-sm font-extrabold ${result.probationApplied ? 'text-indigo-700' : 'text-emerald-800'}`}>
                  {result.probationApplied ? '감액 적용' : '100% 지급'}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 2. 실제 통장에 입금된 금액과 비교하기 카드 */}
      <div className="p-3.5 sm:p-4 rounded-xl bg-slate-100/90 border border-slate-300/90 shadow-2xs space-y-2.5 w-full min-w-0">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 w-full min-w-0">
          <div className="min-w-0">
            <div className="font-extrabold text-xs sm:text-sm text-slate-900 flex items-center gap-1.5 truncate">
              <Coins className="w-3.5 h-3.5 text-indigo-600 flex-shrink-0" />
              <span>실제 입금액과 비교하기</span>
            </div>
            <p className="text-[10px] sm:text-[11px] text-slate-600 truncate">
              통장에 입금된 금액을 적으면 차액을 확인해드립니다.
            </p>
          </div>

          <button
            type="button"
            onClick={onOpenConfig}
            className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] sm:text-xs font-bold text-indigo-800 bg-white hover:bg-indigo-50 active:bg-indigo-100 border border-indigo-300 rounded-xl shadow-2xs transition-all self-start sm:self-auto flex-shrink-0"
          >
            <HelpCircle className="w-3.5 h-3.5 text-indigo-600" />
            <span>🤔 차액 원인 확인</span>
            <ArrowDown className="w-3 h-3 text-indigo-500" />
          </button>
        </div>

        <div className="flex items-center gap-2 pt-1 w-full min-w-0">
          <div className="relative flex-1 sm:max-w-xs min-w-0">
            <input
              type="text"
              placeholder="예: 1,250,000"
              value={actualPayInput}
              onChange={(e) => {
                const val = e.target.value.replace(/[^0-9]/g, '');
                setActualPayInput(val ? Number(val).toLocaleString() : '');
              }}
              className="w-full pl-2.5 pr-7 py-1.5 text-xs sm:text-sm bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500/20 font-bold text-slate-900 shadow-2xs"
            />
            <span className="absolute right-2.5 top-2 text-xs text-slate-400">원</span>
          </div>

          {payDiff !== null && (
            <div className="flex items-center gap-1 text-xs font-bold flex-shrink-0">
              <span
                className={`px-2 py-1.5 rounded-xl border shadow-2xs text-[11px] sm:text-xs ${
                  payDiff === 0
                    ? 'bg-emerald-100 border-emerald-300 text-emerald-900'
                    : payDiff < 0
                    ? 'bg-rose-100 border-rose-300 text-rose-800'
                    : 'bg-indigo-100 border-indigo-300 text-indigo-900'
                }`}
              >
                {payDiff > 0 ? `+${payDiff.toLocaleString()}원 더 들어옴` : `${payDiff.toLocaleString()}원 덜 들어옴`}
              </span>
            </div>
          )}
        </div>

        {/* 차액 원인 가이드 */}
        {payDiff !== null && payDiff !== 0 && (
          <div className="p-3 bg-white rounded-xl border border-slate-300 text-xs text-slate-800 space-y-1 shadow-2xs animate-fadeIn">
            <div className="font-bold text-slate-900 flex items-center gap-1">
              <Info className="w-3.5 h-3.5 text-indigo-600 flex-shrink-0" />
              월급이 계산 결과와 다를 때 확인해볼 4가지:
            </div>
            <ul className="list-disc list-inside space-y-0.5 text-[11px] text-slate-600 pl-1 leading-relaxed">
              <li>
                <strong>주휴수당 누락:</strong> 주 15시간 이상 일했는데 주휴수당({result.weeklyHolidayPayTotal.toLocaleString()}원)이 빠졌는지 확인해보세요.
              </li>
              <li>
                <strong>휴게시간 차이:</strong> 실제 쉬지 못한 시간이 휴게시간으로 빠졌는지 확인해보세요.
              </li>
              <li>
                <strong>매장 직원 수:</strong> 5명 이상 매장인데 야간·연장 수당이 빠졌는지 확인해보세요.
              </li>
              <li>
                <strong>3.3% 공제 여부:</strong> 프리랜서 사업소득세(3.3%)가 공제되었는지 확인해보세요.
              </li>
            </ul>
          </div>
        )}
      </div>

      {/* 하단 고정 법적 고지문 */}
      <div className="p-2.5 bg-slate-100 rounded-xl border border-slate-200 text-center text-[10px] sm:text-xs text-slate-600 leading-relaxed">
        <strong>⚠️ 고지:</strong> 본 계산은 근로기준법 및 최저임금법에 따른 참고용 추정치입니다. 실제 지급액 및 정밀한 세금은 근로계약서와 임금명세서를 확인하세요.
      </div>
    </section>
  );
};
