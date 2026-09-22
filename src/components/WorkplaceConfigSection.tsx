import React from 'react';
import { Config, TaxMode } from '../types/payroll';
import { AlertTriangle, ShieldCheck, Users, Receipt, Award } from 'lucide-react';

interface WorkplaceConfigSectionProps {
  config: Config;
  onChangeConfig: (updater: (prev: Config) => Config) => void;
}

export const WorkplaceConfigSection: React.FC<WorkplaceConfigSectionProps> = ({
  config,
  onChangeConfig,
}) => {
  // 수습 게이트 경고 판별
  const probationBanner = React.useMemo(() => {
    if (!config.probation.applied) return null;
    if (config.probation.simpleLabor) {
      return {
        type: 'warning',
        title: '⚠️ 시급 감액 불가 (단순노무직종)',
        text: '편의점, 카페, 홀서빙, 패스트푸드, 주유, 청소 등 단순노무 업무는 처음 일하더라도 시급을 깎을 수 없습니다. 법정 최저시급(100%)을 전액 받아야 합니다. (최저임금법 제5조)',
      };
    }
    if (!config.probation.contractOverOneYear) {
      return {
        type: 'warning',
        title: '⚠️ 시급 감액 불가 (1년 미만 단기 알바)',
        text: '근로계약 기간이 1년 미만(예: 3개월, 6개월 단기 알바)인 경우, 수습 기간을 두더라도 시급을 10% 깎을 수 없습니다. (최저임금법 제5조)',
      };
    }
    return {
      type: 'info',
      title: '✅ 10% 감액 적용 가능 (시급의 90% 지급)',
      text: '1년 이상 계약 및 비단순노무 직종에 해당하여 수습 시작 3개월 이내 기간 동안 10% 감액(시급 90%)이 적법하게 적용됩니다. (수습기간 감액 규정)',
    };
  }, [config.probation]);

  return (
    <section id="config-section" className="space-y-4 w-full min-w-0">
      {/* ────────────────────────────────────────────────────────── */}
      {/* 👥 1. 매장 직원 수 (5인 미만 / 5인 이상) */}
      {/* ────────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-[var(--ab-line)] shadow-2xs p-3.5 sm:p-4 space-y-2.5">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-6 h-6 rounded-lg bg-[var(--ab-boss-soft)] text-[var(--ab-boss)] flex items-center justify-center font-black text-xs flex-shrink-0">
              1
            </div>
            <label className="text-xs sm:text-sm font-extrabold text-[var(--ab-text)] flex items-center gap-1.5 truncate">
              <Users className="w-4 h-4 text-[var(--ab-boss)] flex-shrink-0" />
              <span>알바하는 곳에 직원이 5명이 넘나요?</span>
            </label>
          </div>
          <span className="text-[11px] sm:text-xs font-bold text-[var(--ab-boss)] bg-[var(--ab-boss-soft)] px-2 py-0.5 rounded-full border border-blue-200 flex-shrink-0">
            상시 근로자 수
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
          <button
            type="button"
            onClick={() => onChangeConfig((prev) => ({ ...prev, employeeCount: 'UNDER_5' }))}
            className={`p-3 min-h-[44px] rounded-xl border text-left transition-all shadow-2xs ${
              config.employeeCount === 'UNDER_5'
                ? 'bg-[var(--ab-boss-soft)] border-2 border-[var(--ab-boss)] shadow-sm ring-2 ring-blue-400/20'
                : 'bg-slate-50 border-slate-300 hover:border-slate-400 hover:bg-slate-100/60'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="font-extrabold text-xs sm:text-sm text-[var(--ab-text)]">
                🏢 아니요, 5명 미만인 작은 매장이에요
              </span>
              <span
                className={`w-4 h-4 rounded-full border flex items-center justify-center flex-shrink-0 ${
                  config.employeeCount === 'UNDER_5'
                    ? 'border-[var(--ab-boss)] bg-[var(--ab-boss)] text-white'
                    : 'border-slate-400 bg-white'
                }`}
              >
                {config.employeeCount === 'UNDER_5' && (
                  <span className="w-1.5 h-1.5 rounded-full bg-white"></span>
                )}
              </span>
            </div>
            <p className="text-[12px] text-slate-600 mt-1 leading-relaxed">
              소규모 카페/편의점 등. 야간·연장 추가 수당은 없지만, <strong className="text-slate-900 font-bold">주휴수당은 100% 정상 지급</strong>됩니다!
            </p>
          </button>

          <button
            type="button"
            onClick={() => onChangeConfig((prev) => ({ ...prev, employeeCount: 'OVER_5' }))}
            className={`p-3 min-h-[44px] rounded-xl border text-left transition-all shadow-2xs ${
              config.employeeCount === 'OVER_5'
                ? 'bg-[var(--ab-boss-soft)] border-2 border-[var(--ab-boss)] shadow-sm ring-2 ring-blue-400/20'
                : 'bg-slate-50 border-slate-300 hover:border-slate-400 hover:bg-slate-100/60'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="font-extrabold text-xs sm:text-sm text-[var(--ab-text)]">
                🏬 네, 직원이 5명 이상인 큰 매장이에요
              </span>
              <span
                className={`w-4 h-4 rounded-full border flex items-center justify-center flex-shrink-0 ${
                  config.employeeCount === 'OVER_5'
                    ? 'border-[var(--ab-boss)] bg-[var(--ab-boss)] text-white'
                    : 'border-slate-400 bg-white'
                }`}
              >
                {config.employeeCount === 'OVER_5' && (
                  <span className="w-1.5 h-1.5 rounded-full bg-white"></span>
                )}
              </span>
            </div>
            <p className="text-[12px] text-slate-600 mt-1 leading-relaxed">
              밤 10시 이후 야간근무나 하루 8시간 넘게 일하면 <strong className="text-[var(--ab-boss)] font-bold">50% 가산수당(1.5배)</strong>이 발생합니다.
            </p>
          </button>
        </div>
      </div>

      {/* ────────────────────────────────────────────────────────── */}
      {/* 💰 2. 세금 및 4대보험 공제 방식 */}
      {/* ────────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-[var(--ab-line)] shadow-2xs p-3.5 sm:p-4 space-y-2.5">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-black text-xs flex-shrink-0">
              2
            </div>
            <label className="text-xs sm:text-sm font-extrabold text-[var(--ab-text)] flex items-center gap-1.5 truncate">
              <Receipt className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <span>월급에서 세금이나 보험료를 떼나요?</span>
            </label>
          </div>
          <span className="text-[11px] sm:text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 flex-shrink-0">
            세금/공제 설정
          </span>
        </div>

        <div className="pt-1">
          <select
            value={config.taxMode}
            onChange={(e) => {
              const tm = e.target.value as TaxMode;
              onChangeConfig((prev) => ({ ...prev, taxMode: tm }));
            }}
            className="w-full px-3 py-2.5 min-h-[44px] text-xs sm:text-sm bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-900 focus:ring-2 focus:ring-emerald-500/20 shadow-2xs cursor-pointer"
          >
            <option value="NONE">1. 세금 안 떼고 그대로 다 들어와요 (세전 100% 비과세)</option>
            <option value="DAILY_WORKER">2. 하루 일당 세금만 살짝 떼요 (일용근로소득세 - 하루 15만원 비과세)</option>
            <option value="INSURED">3. 4대보험에 가입되어 있어요 (국민연금·건강보험·고용보험 - 약 9.7% 공제)</option>
          </select>

          <p className="text-[12px] text-slate-500 mt-1.5 px-1">
            {config.taxMode === 'NONE' && '💡 통장에 찍히는 금액 그대로 100% 수령하는 가장 일반적인 단기/파트타임 알바 형태입니다.'}
            {config.taxMode === 'DAILY_WORKER' && '💡 하루 일당 15만원까지는 세금이 0원이며, 초과분에 대해서만 최저 세율(2.7%)로 원천징수됩니다.'}
            {config.taxMode === 'INSURED' && '💡 월 60시간 이상 근무 시 4대보험(국민연금 4.5%, 건강보험 3.545%, 고용보험 0.9% 등)이 공제됩니다.'}
          </p>
        </div>
      </div>

      {/* ────────────────────────────────────────────────────────── */}
      {/* 🎓 3. 수습기간 시급 감액 (10%) 여부 */}
      {/* ────────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-[var(--ab-line)] shadow-2xs p-3.5 sm:p-4 space-y-2.5">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-6 h-6 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center font-black text-xs flex-shrink-0">
              3
            </div>
            <label className="text-xs sm:text-sm font-extrabold text-[var(--ab-text)] flex items-center gap-1.5 truncate">
              <Award className="w-4 h-4 text-amber-600 flex-shrink-0" />
              <span>처음 일 배운다고 시급을 10% 덜 받기로 했나요?</span>
            </label>
          </div>

          <label className="relative inline-flex items-center cursor-pointer flex-shrink-0 min-h-[40px] px-1">
            <input
              type="checkbox"
              checked={config.probation.applied}
              onChange={(e) => {
                const checked = e.target.checked;
                onChangeConfig((prev) => ({
                  ...prev,
                  probation: { ...prev.probation, applied: checked },
                }));
              }}
              className="sr-only peer"
            />
            <div className="w-9 h-5 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[12px] after:left-[6px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-600"></div>
          </label>
        </div>

        <div className="pt-1">
          <div className="text-xs sm:text-sm text-slate-700">
            {config.probation.applied ? (
              <span className="text-amber-800 font-bold flex items-center gap-1">
                ⚠️ 수습 감액 설정 켜짐 — 아래 법정 감액 적법 요건을 확인하세요.
              </span>
            ) : (
              <span className="text-slate-500 font-medium">
                ✅ 수습 감액 없음: 시급 100% 전액 기준으로 계산합니다.
              </span>
            )}
          </div>

          {/* 수습 감액 켜졌을 때 세부 조건 확인 */}
          {config.probation.applied && (
            <div className="mt-3 p-3 bg-amber-50/70 rounded-xl border border-amber-300 space-y-2.5 shadow-2xs animate-fadeIn">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                <label className="flex items-start gap-2 cursor-pointer text-slate-800 bg-white p-2.5 rounded-lg border border-amber-200 shadow-2xs min-h-[44px]">
                  <input
                    type="checkbox"
                    checked={config.probation.contractOverOneYear}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      onChangeConfig((prev) => ({
                        ...prev,
                        probation: { ...prev.probation, contractOverOneYear: checked },
                      }));
                    }}
                    className="mt-0.5 w-4 h-4 rounded text-[var(--ab-boss)]"
                  />
                  <div>
                    <span className="font-extrabold text-slate-900 text-xs sm:text-sm">1년 넘게 일하기로 계약했나요?</span>
                    <p className="text-[12px] text-slate-500 mt-0.5">(1년 미만 단기 알바는 시급 감액 절대 불가)</p>
                  </div>
                </label>

                <label className="flex items-start gap-2 cursor-pointer text-slate-800 bg-white p-2.5 rounded-lg border border-amber-200 shadow-2xs min-h-[44px]">
                  <input
                    type="checkbox"
                    checked={config.probation.simpleLabor}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      onChangeConfig((prev) => ({
                        ...prev,
                        probation: { ...prev.probation, simpleLabor: checked },
                      }));
                    }}
                    className="mt-0.5 w-4 h-4 rounded text-rose-600"
                  />
                  <div>
                    <span className="font-extrabold text-slate-900 text-xs sm:text-sm">편의점, 카페, 식당 서빙, 배달 같은 일인가요?</span>
                    <p className="text-[12px] text-slate-500 mt-0.5">(단순노무직종은 수습이라도 감액 절대 불가)</p>
                  </div>
                </label>
              </div>

              {probationBanner && (
                <div
                  className={`p-3 rounded-lg text-xs flex items-start gap-2 ${
                    probationBanner.type === 'warning'
                      ? 'bg-rose-50 border border-rose-300 text-rose-900'
                      : 'bg-emerald-50 border border-emerald-300 text-emerald-900'
                  }`}
                >
                  {probationBanner.type === 'warning' ? (
                    <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
                  ) : (
                    <ShieldCheck className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                  )}
                  <div>
                    <div className="font-extrabold text-xs sm:text-sm">{probationBanner.title}</div>
                    <p className="text-[12px] leading-relaxed opacity-90 mt-0.5">{probationBanner.text}</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
};
