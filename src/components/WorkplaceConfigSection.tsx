import React from 'react';
import { Config, TaxMode } from '../types/payroll';
import { AlertTriangle, ShieldCheck, UserCheck } from 'lucide-react';

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
    <section id="config-section" className="bg-white rounded-2xl border border-slate-300/80 shadow-md shadow-slate-200/60 p-4 sm:p-5 space-y-4">
      {/* 1. 알바하는 곳에 직원이 5명이 넘나요? */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs sm:text-sm font-extrabold text-slate-900 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-indigo-600"></span>
            알바하는 곳에 일하는 직원이 5명이 넘나요?
            <span className="text-[11px] text-slate-500 font-medium">(상시 근로자 5인 이상 여부)</span>
          </label>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => onChangeConfig((prev) => ({ ...prev, employeeCount: 'UNDER_5' }))}
            className={`p-3.5 rounded-xl border text-left transition-all shadow-2xs ${
              config.employeeCount === 'UNDER_5'
                ? 'bg-indigo-50/80 border-2 border-indigo-600 shadow-sm ring-2 ring-indigo-500/20'
                : 'bg-slate-100/80 border-slate-300 hover:border-slate-400'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="font-extrabold text-xs text-slate-900">
                🏢 아니요, 5명 미만인 작은 매장이에요
              </span>
              <span
                className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                  config.employeeCount === 'UNDER_5'
                    ? 'border-indigo-600 bg-indigo-600 text-white'
                    : 'border-slate-400 bg-white'
                }`}
              >
                {config.employeeCount === 'UNDER_5' && (
                  <span className="w-1.5 h-1.5 rounded-full bg-white"></span>
                )}
              </span>
            </div>
            <p className="text-[11px] text-slate-600 mt-1">
              소규모 카페/편의점 등. 야간·연장 추가 수당은 없지만, <strong>주휴수당은 100% 정상 지급</strong>됩니다! (5인 미만 사업장)
            </p>
          </button>

          <button
            type="button"
            onClick={() => onChangeConfig((prev) => ({ ...prev, employeeCount: 'OVER_5' }))}
            className={`p-3.5 rounded-xl border text-left transition-all shadow-2xs ${
              config.employeeCount === 'OVER_5'
                ? 'bg-indigo-50/80 border-2 border-indigo-600 shadow-sm ring-2 ring-indigo-500/20'
                : 'bg-slate-100/80 border-slate-300 hover:border-slate-400'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="font-extrabold text-xs text-slate-900">
                🏬 네, 직원이 5명 이상인 큰 매장이에요
              </span>
              <span
                className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                  config.employeeCount === 'OVER_5'
                    ? 'border-indigo-600 bg-indigo-600 text-white'
                    : 'border-slate-400 bg-white'
                }`}
              >
                {config.employeeCount === 'OVER_5' && (
                  <span className="w-1.5 h-1.5 rounded-full bg-white"></span>
                )}
              </span>
            </div>
            <p className="text-[11px] text-slate-600 mt-1">
              밤 10시 이후 야간근무나 하루 8시간 넘게 일하면 <strong>50% 추가 수당(1.5배)</strong>을 받습니다. (5인 이상 사업장 가산수당)
            </p>
          </button>
        </div>
      </div>

      {/* 2. 세금 및 수습 설정 (2열 그리드) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-3 border-t border-slate-200">
        {/* 세금 / 4대보험 공제 방식 */}
        <div>
          <label className="block text-xs font-bold text-slate-800 mb-1.5 flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" />
            월급에서 세금이나 보험료를 떼나요?
            <span className="text-[10px] text-slate-500 font-normal">(공제 방식)</span>
          </label>
          <select
            value={config.taxMode}
            onChange={(e) => {
              const tm = e.target.value as TaxMode;
              onChangeConfig((prev) => ({ ...prev, taxMode: tm }));
            }}
            className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500/20 shadow-2xs"
          >
            <option value="NONE">1. 세금 안 떼고 그대로 다 들어와요 (공제 없음)</option>
            <option value="DAILY_WORKER">2. 하루 일당 세금만 살짝 떼요 (일용근로소득세 - 하루 15만원 비과세)</option>
            <option value="INSURED">3. 4대보험에 가입되어 있어요 (국민연금·건강보험·고용보험 - 약 9.7% 공제)</option>
          </select>
        </div>

        {/* 수습 감액 설정 */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-bold text-slate-800 flex items-center gap-1">
              <UserCheck className="w-3.5 h-3.5 text-indigo-600" />
              처음 일 배운다고 시급을 10% 덜 받기로 했나요?
            </span>
            <label className="relative inline-flex items-center cursor-pointer">
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
              <div className="w-8 h-4 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-indigo-600"></div>
            </label>
          </div>

          <div className="text-[11px] text-slate-600">
            {config.probation.applied ? (
              <span className="text-indigo-700 font-bold">수습 기간 적용 중 (하단 단순노무 여부 확인)</span>
            ) : (
              <span>깎지 않고 내 시급 100% 전액 계산 (수습 감액 없음)</span>
            )}
          </div>
        </div>
      </div>

      {/* 수습 감액 켜졌을 때 세부 조건 확인 */}
      {config.probation.applied && (
        <div className="p-3.5 bg-slate-100/90 rounded-xl border border-slate-300 space-y-2.5 shadow-2xs animate-fadeIn">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
            <label className="flex items-start gap-2 cursor-pointer text-slate-700 bg-white p-2.5 rounded-lg border border-slate-200">
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
                className="mt-0.5 w-4 h-4 rounded text-indigo-600"
              />
              <div>
                <span className="font-bold text-slate-900">1년 넘게 일하기로 계약했나요?</span>
                <p className="text-[11px] text-slate-500">(1년 미만 단기 알바는 시급 감액 불가능)</p>
              </div>
            </label>

            <label className="flex items-start gap-2 cursor-pointer text-slate-700 bg-white p-2.5 rounded-lg border border-slate-200">
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
                <span className="font-bold text-slate-900">편의점, 카페, 식당 서빙, 배달 같은 일인가요?</span>
                <p className="text-[11px] text-slate-500">(단순노무직종은 수습이라도 시급 감액 절대 불가능)</p>
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
                <div className="font-bold">{probationBanner.title}</div>
                <p className="text-[11px] leading-relaxed opacity-90">{probationBanner.text}</p>
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
};
