import React, { useState } from 'react';
import {
  BookOpen,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  CheckCircle,
  ExternalLink,
} from 'lucide-react';
import { MINIMUM_WAGE } from '../config/minimumWage';

interface GuideItem {
  id: string;
  category: '주휴수당' | '5인사업장' | '수습감액' | '세금/보험' | '근무시간/시급';
  title: string;
  summary: string;
  badge?: string;
  badgeColor?: string;
  content: React.ReactNode;
}

export const LaborLawGuideSection: React.FC = () => {
  const [selectedCategory, setSelectedCategory] = useState<string>('전체');
  const [openItems, setOpenItems] = useState<Record<string, boolean>>({
    'holiday-pay': true,
    'under-5': true,
    'probation': true,
  });

  const toggleItem = (id: string) => {
    setOpenItems((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const categories = ['전체', '주휴수당', '5인사업장', '수습감액', '세금/보험', '근무시간/시급'];

  const guideItems: GuideItem[] = [
    {
      id: 'holiday-pay',
      category: '주휴수당',
      title: '주휴수당이란 무엇이고 언제 받을 수 있나요?',
      summary: '일주일에 15시간 이상 일하고 약속된 근무일에 결근이 없으면 받는 1일치 유급휴일 보너스',
      badge: '필수 상식',
      badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      content: (
        <div className="space-y-3 text-xs leading-relaxed text-slate-700">
          <p>
            근로기준법 제55조에 따라, <strong>일주일에 15시간 이상</strong> 일하기로 약속하고 정해진 근무일에 모두 출근(개근)하면 일주일에 하루치 일당을 유급 휴일 수당으로 추가 지급받아야 합니다.
          </p>
          <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200/80 space-y-1.5">
            <div className="font-bold text-emerald-900 flex items-center gap-1.5">
              <CheckCircle className="w-4 h-4 text-emerald-600" />
              주휴수당 받는 2가지 조건
            </div>
            <ul className="list-disc list-inside pl-1 text-[11px] text-emerald-800 space-y-1">
              <li><strong>1주 총 실근로시간이 15시간 이상</strong>이어야 합니다. (정확히 15시간도 포함!)</li>
              <li><strong>약속된 근무일에 결근이 없어야</strong> 합니다. (※ 지각이나 조퇴는 결근이 아니므로 주휴수당을 받을 수 있습니다!)</li>
            </ul>
          </div>
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-[11px] text-slate-600 space-y-1">
            <div className="font-bold text-slate-800">💡 계산 공식</div>
            <p>• 주 40시간 미만 근무: <code>(1주 총 일한 시간 ÷ 40) × 8 × 내 시급</code></p>
            <p>• 주 40시간 이상 근무: <code>최대 8시간분 시급</code> (아무리 많이 일해도 1주 주휴수당은 최대 8시간분까지만 발생합니다)</p>
          </div>
        </div>
      ),
    },
    {
      id: 'under-5',
      category: '5인사업장',
      title: '5인 미만 사업장 vs 5인 이상 사업장은 무엇이 다른가요?',
      summary: '가산수당(야간 50%, 연장 50%, 휴일 50%) 적용 여부가 완전히 달라집니다.',
      badge: '가장 헷갈리는 부분',
      badgeColor: 'bg-amber-50 text-amber-700 border-amber-200',
      content: (
        <div className="space-y-3 text-xs leading-relaxed text-slate-700">
          <p>
            대한민국 근로기준법은 <strong>상시 일하는 직원이 5명 미만인 소규모 사업장</strong>과 <strong>5명 이상인 사업장</strong>에 적용되는 법 조항을 다르게 규정하고 있습니다.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
              <span className="font-bold text-slate-900 block text-xs">🏢 5인 미만 사업장</span>
              <ul className="list-disc list-inside text-slate-600 space-y-1">
                <li>야간(22~06시) 근로 가산 없음 (1.0배)</li>
                <li>연장(1일 8h / 주 40h 초과) 가산 없음 (1.0배)</li>
                <li>휴일 근로 가산 없음 (1.0배)</li>
                <li><strong className="text-emerald-700">주휴수당은 5인 미만이어도 100% 지급 의무 있음!</strong></li>
              </ul>
            </div>
            <div className="p-3 bg-indigo-50/60 border border-indigo-200 rounded-xl space-y-1">
              <span className="font-bold text-indigo-900 block text-xs">🏬 5인 이상 사업장</span>
              <ul className="list-disc list-inside text-indigo-800 space-y-1">
                <li>야간근로 시 <strong>시급의 50% 추가 가산 (1.5배)</strong></li>
                <li>연장근로 시 <strong>시급의 50% 추가 가산 (1.5배)</strong></li>
                <li>유급휴일 근로 시 <strong>50%~100% 추가 가산</strong></li>
                <li>연장+야간 중복 시 최대 2.0배 지급</li>
              </ul>
            </div>
          </div>
          <p className="text-[11px] text-slate-500 bg-slate-100 p-2 rounded-lg">
            * 5인 판정 기준: 사장님(대표자)을 제외하고, 평일·주말 모든 알바생 및 직원의 연인원을 가동일수로 나누어 계산합니다.
          </p>
        </div>
      ),
    },
    {
      id: 'probation',
      category: '수습감액',
      title: '수습기간이라고 시급을 10% 깎는 것은 합법인가요?',
      summary: '편의점, 카페, 홀서빙 등 단순노무직이나 1년 미만 단기 계약은 1원도 깎을 수 없습니다!',
      badge: '불법 피해 주의',
      badgeColor: 'bg-rose-50 text-rose-700 border-rose-200',
      content: (
        <div className="space-y-3 text-xs leading-relaxed text-slate-700">
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-900 space-y-1">
            <div className="font-bold flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-rose-600" />
              아래 2가지 중 하나라도 해당되면 수습 감액은 100% 불법입니다!
            </div>
            <ul className="list-disc list-inside pl-1 text-[11px] text-rose-800 space-y-1 mt-1">
              <li><strong>단순노무직 종사자:</strong> 편의점, 카페, 패스트푸드, 홀서빙, 배달, 주유, 청소, 물류 상하차 등</li>
              <li><strong>1년 미만 단기 계약:</strong> 근로계약 기간이 1년 미만(예: 3개월, 6개월 단기 알바)인 경우</li>
            </ul>
          </div>
          <p>
            최저임금법 제5조에 따르면, 수습 10% 감액(시급의 90% 지급)은 <strong>① 근로계약 기간이 1년 이상이고 ② 단순노무직이 아니며 ③ 근무 시작 후 3개월 이내</strong>인 경우에만 예외적으로 허용됩니다.
          </p>
          <p className="text-[11px] text-slate-600">
            따라서 일반적인 알바(편의점, 카페, 식당 등)에서 "수습이라 3개월간 10% 깎는다"고 하는 것은 위법이며, 최저시급 전액을 요구할 권리가 있습니다.
          </p>
        </div>
      ),
    },
    {
      id: 'taxes',
      category: '세금/보험',
      title: '월급에서 3.3%를 떼는 게 맞나요? (4대보험 vs 일용직 vs 3.3%)',
      summary: '알바생에게 무조건 3.3%를 떼는 것은 잘못된 경우가 많습니다. 본인의 근로 형태를 확인하세요.',
      badge: '원천징수 상식',
      badgeColor: 'bg-blue-50 text-blue-700 border-blue-200',
      content: (
        <div className="space-y-3 text-xs leading-relaxed text-slate-700">
          <p>
            많은 알바 사업장에서 관행적으로 "3.3%"를 떼지만, 3.3%는 사실 <strong>프리랜서(사업소득)</strong>에 적용되는 세율입니다. 알바생은 근로자이므로 원칙적으로 일용근로소득세 또는 4대보험을 적용받아야 합니다.
          </p>
          <div className="space-y-2 text-[11px]">
            <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
              <strong className="text-slate-900 block mb-0.5">1. 일용직 근로소득세 원천징수</strong>
              <p className="text-slate-600">
                하루 일당 15만 원까지는 세금이 0원입니다. 15만 원을 초과하는 금액에 대해서만 약 2.7%의 낮은 세율이 적용되며, 하루 세금이 1,000원 미만이면 전액 면제(소액부징수)됩니다.
              </p>
            </div>
            <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
              <strong className="text-slate-900 block mb-0.5">2. 4대보험 가입 (주 15시간 / 월 60시간 이상)</strong>
              <p className="text-slate-600">
                월 60시간 이상 일하면 4대보험(국민연금, 건강보험, 고용보험 등) 의무 가입 대상이 되며, 근로자 부담금으로 월 급여의 약 9.7%가 공제됩니다. (주 15시간 미만 초단기 근로자는 가입 대상 제외)
              </p>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 'wage-rates',
      category: '근무시간/시급',
      title: '평일과 주말 시급이 다르면 주휴수당은 어떤 시급으로 계산하나요?',
      summary: '가장 높은 시급도, 가장 낮은 시급도 아닌 "가중평균시급"으로 계산하는 것이 법적 기준입니다.',
      content: (
        <div className="space-y-3 text-xs leading-relaxed text-slate-700">
          <p>
            예를 들어 평일 시급은 10,320원이고 주말 시급은 12,000원인 경우, 주휴수당을 평일 시급(10,320원)으로만 계산하면 알바생에게 불리하고, 주말 시급으로만 계산하면 사장님에게 불리합니다.
          </p>
          <div className="p-3 bg-indigo-50/50 rounded-xl border border-indigo-100 text-[11px] space-y-1">
            <div className="font-bold text-indigo-900">✨ 가중평균시급 산출 예시</div>
            <p>• 평일 15시간(10,320원) + 주말 5시간(12,000원) = 총 20시간 일하고 기본급 214,800원</p>
            <p>• <strong>가중평균시급 = 214,800원 ÷ 20시간 = 10,740원</strong></p>
            <p>• 주휴수당(4시간) = 4시간 × 10,740원 = <strong>42,960원</strong></p>
          </div>
          <p className="text-[11px] text-slate-600">
            이 계산기는 요일별로 다른 시급을 완벽하게 지원하여, 법적으로 가장 정확한 가중평균시급을 자동으로 산출합니다.
          </p>
        </div>
      ),
    },
  ];

  const filteredItems = selectedCategory === '전체'
    ? guideItems
    : guideItems.filter((item) => item.category === selectedCategory);

  return (
    <section className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-4 sm:p-6 space-y-4">
      {/* ALBA&BOSS 노무 Q&A 링크 배너 (상단 추가) */}
      <a
        href="https://albanboss.moow-ui.workers.dev/qna"
        target="_blank"
        rel="noopener noreferrer"
        className="w-full p-3 bg-[var(--ab-boss-soft)] hover:bg-blue-100 border border-blue-200 rounded-xl flex items-center justify-between text-xs sm:text-sm font-bold text-[var(--ab-boss)] transition-all shadow-2xs group"
      >
        <div className="flex items-center gap-2 min-w-0">
          <BookOpen className="w-4 h-4 text-[var(--ab-boss)] flex-shrink-0" />
          <span className="truncate">더 많은 질문은 ALBA&BOSS 노무 Q&A에서 확인하세요</span>
        </div>
        <ExternalLink className="w-3.5 h-3.5 text-[var(--ab-boss)] flex-shrink-0 group-hover:translate-x-0.5 transition-transform" />
      </a>

      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[var(--ab-boss-soft)] text-[var(--ab-boss)] flex items-center justify-center font-bold text-sm">
            📖
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-[var(--ab-boss)]" />
              알바생을 위한 쉬운 노무·세무 백과
            </h2>
            <p className="text-xs text-slate-500">
              어려운 법률 용어를 알바생 눈높이에 맞춰 쉽게 설명해 드립니다.
            </p>
          </div>
        </div>

        <span className="text-[11px] font-semibold bg-[var(--ab-boss-soft)] text-[var(--ab-boss)] px-2.5 py-1 rounded-full border border-blue-100 hidden sm:inline-block">
          2026년 최저시급 {MINIMUM_WAGE[2026]?.toLocaleString()}원 기준
        </span>
      </div>

      {/* 카테고리 필터 칩 */}
      <div className="flex flex-wrap gap-1.5">
        {categories.map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => setSelectedCategory(cat)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all min-h-[36px] ${
              selectedCategory === cat
                ? 'bg-[var(--ab-boss)] text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* 가이드 아코디언 카드 목록 */}
      <div className="space-y-3">
        {filteredItems.map((item) => {
          const isOpen = Boolean(openItems[item.id]);

          return (
            <div
              key={item.id}
              className="rounded-xl border border-slate-200/80 bg-white overflow-hidden transition-all shadow-xs"
            >
              <button
                type="button"
                onClick={() => toggleItem(item.id)}
                className="w-full p-4 flex items-start justify-between text-left hover:bg-slate-50/80 transition-colors"
              >
                <div className="space-y-1 pr-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[10px] font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md">
                      {item.category}
                    </span>
                    {item.badge && (
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${item.badgeColor}`}>
                        {item.badge}
                      </span>
                    )}
                  </div>
                  <h3 className="font-bold text-sm text-slate-900 mt-1">
                    {item.title}
                  </h3>
                  <p className="text-xs text-slate-500 line-clamp-1">
                    {item.summary}
                  </p>
                </div>

                <div className="p-1 rounded-lg bg-slate-100 text-slate-500 flex-shrink-0 mt-1">
                  {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </div>
              </button>

              {isOpen && (
                <div className="px-4 pb-4 pt-2 border-t border-slate-100 bg-slate-50/30 animate-fadeIn">
                  {item.content}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* 도움말 안내 */}
      <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-600 flex items-center justify-between">
        <span>더 궁금한 사항이나 부당한 대우가 있다면?</span>
        <a
          href="https://www.moel.go.kr"
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 font-bold text-indigo-600 hover:underline"
        >
          고용노동부 상담센터 (국번없이 1350)
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </div>
    </section>
  );
};
