import React from 'react';
import {
  Calendar,
  Calculator,
  BookOpen,
  Upload,
  Share2,
  RotateCcw,
  Smartphone,
  Monitor,
  LayoutDashboard,
} from 'lucide-react';

export type ActiveTab = 'RECORD' | 'RESULT' | 'GUIDE';
export type ViewMode = 'mobile' | 'desktop';

interface NavbarProps {
  activeTab: ActiveTab;
  onSelectTab: (tab: ActiveTab) => void;
  onOpenImport: () => void;
  onOpenShare: () => void;
  onReset: () => void;
  hasWorkDays: boolean;
  viewMode: ViewMode;
  onToggleViewMode: (mode: ViewMode) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  onSelectTab,
  onOpenImport,
  onOpenShare,
  onReset,
  hasWorkDays,
  viewMode,
  onToggleViewMode,
}) => {
  return (
    <header className="bg-white border-b border-slate-300 sticky top-0 z-30 shadow-xs w-full">
      {/* 1. 최상단 56px 공통 포털 헤더 */}
      <div className="h-[56px] border-b border-[var(--ab-line)] bg-white w-full">
        <div className="w-full max-w-4xl mx-auto h-full px-3 sm:px-4 flex items-center justify-between">
          {/* 왼쪽 ALBA&BOSS 로고 */}
          <a
            href="https://albanboss.moow-ui.workers.dev/"
            className="ab-logo flex items-center select-none"
            title="ALBA&BOSS 포털 홈으로 이동"
          >
            <span className="a">ALBA</span>
            <span className="amp">&</span>
            <span className="b">BOSS</span>
          </a>

          {/* 오른쪽 '계산기 대시보드' 링크 */}
          <a
            href="https://albanboss.moow-ui.workers.dev/"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs sm:text-[13px] font-bold text-[var(--ab-text-2)] hover:text-[var(--ab-boss)] hover:bg-[var(--ab-boss-soft)] rounded-lg transition-colors"
            title="ALBA&BOSS 계산기 대시보드로 이동"
          >
            <LayoutDashboard className="w-3.5 h-3.5 text-[var(--ab-boss)]" />
            <span>계산기 대시보드</span>
          </a>
        </div>
      </div>

      {/* 2. 도구 서브헤더 및 툴바 */}
      <div className="w-full max-w-4xl mx-auto px-3 sm:px-4">
        <div className="flex items-center justify-between py-2 border-b border-slate-100 gap-1">
          {/* 도구 이름 (헤더 아래 제목) */}
          <div className="flex items-center gap-1.5 min-w-0">
            <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-[var(--ab-boss)] text-white flex items-center justify-center font-bold text-xs flex-shrink-0 shadow-xs">
              💰
            </div>
            <h1 className="font-extrabold text-sm sm:text-base text-[var(--ab-text)] leading-tight truncate">
              알바 급여 계산기
            </h1>
          </div>

          {/* 우측 툴바 & 모바일/PC 스위처 */}
          <div className="flex items-center gap-1 flex-shrink-0">
            {/* 📱 / 💻 뷰 전환 토글 */}
            <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 shadow-2xs">
              <button
                type="button"
                onClick={() => onToggleViewMode('mobile')}
                className={`p-1 sm:px-2 sm:py-1 rounded-md text-xs font-bold flex items-center gap-1 transition-all ${
                  viewMode === 'mobile'
                    ? 'bg-white text-[var(--ab-boss)] shadow-2xs border border-slate-200 font-extrabold'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
                title="모바일 화면 뷰"
              >
                <Smartphone className="w-3.5 h-3.5" />
                <span className="text-[11px] hidden md:inline">모바일</span>
              </button>

              <button
                type="button"
                onClick={() => onToggleViewMode('desktop')}
                className={`p-1 sm:px-2 sm:py-1 rounded-md text-xs font-bold flex items-center gap-1 transition-all ${
                  viewMode === 'desktop'
                    ? 'bg-white text-[var(--ab-boss)] shadow-2xs border border-slate-200 font-extrabold'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
                title="PC 화면 뷰"
              >
                <Monitor className="w-3.5 h-3.5" />
                <span className="text-[11px] hidden md:inline">PC</span>
              </button>
            </div>

            <button
              type="button"
              onClick={onOpenImport}
              className="p-1.5 min-w-[36px] min-h-[36px] text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg border border-slate-200 shadow-2xs transition-colors flex items-center justify-center"
              title="근무표 텍스트 붙여넣기"
            >
              <Upload className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              onClick={onOpenShare}
              className="p-1.5 min-w-[36px] min-h-[36px] text-[var(--ab-boss)] bg-[var(--ab-boss-soft)] hover:bg-blue-100 rounded-lg border border-blue-200 shadow-2xs transition-colors flex items-center justify-center"
              title="내 근무표 링크 공유"
            >
              <Share2 className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              onClick={onReset}
              className="p-1.5 min-w-[36px] min-h-[36px] text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors flex items-center justify-center"
              title="초기화"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* 3. 탭 네비게이션 */}
        <nav className="grid grid-cols-3 gap-1 py-1.5 w-full">
          <button
            type="button"
            onClick={() => onSelectTab('RECORD')}
            className={`min-h-[40px] py-1.5 px-1 rounded-xl text-xs sm:text-sm font-extrabold flex items-center justify-center gap-1 transition-all touch-target w-full min-w-0 ${
              activeTab === 'RECORD'
                ? 'bg-[var(--ab-boss-soft)] text-[var(--ab-boss)] border-2 border-[var(--ab-boss)] shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70 border border-transparent'
            }`}
          >
            <Calendar className={`w-3.5 h-3.5 flex-shrink-0 ${activeTab === 'RECORD' ? 'text-[var(--ab-boss)]' : 'text-slate-400'}`} />
            <span className="truncate">1. 근무 달력</span>
          </button>

          <button
            type="button"
            onClick={() => onSelectTab('RESULT')}
            className={`min-h-[40px] py-1.5 px-1 rounded-xl text-xs sm:text-sm font-extrabold flex items-center justify-center gap-1 transition-all touch-target relative w-full min-w-0 ${
              activeTab === 'RESULT'
                ? 'bg-[var(--ab-boss-soft)] text-[var(--ab-boss)] border-2 border-[var(--ab-boss)] shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70 border border-transparent'
            }`}
          >
            <Calculator className={`w-3.5 h-3.5 flex-shrink-0 ${activeTab === 'RESULT' ? 'text-[var(--ab-boss)]' : 'text-slate-400'}`} />
            <span className="truncate">2. 급여 계산</span>
            {hasWorkDays && (
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 absolute top-1 right-1"></span>
            )}
          </button>

          <button
            type="button"
            onClick={() => onSelectTab('GUIDE')}
            className={`min-h-[40px] py-1.5 px-1 rounded-xl text-xs sm:text-sm font-extrabold flex items-center justify-center gap-1 transition-all touch-target w-full min-w-0 ${
              activeTab === 'GUIDE'
                ? 'bg-amber-50 text-amber-900 border-2 border-amber-400 shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70 border border-transparent'
            }`}
          >
            <BookOpen className={`w-3.5 h-3.5 flex-shrink-0 ${activeTab === 'GUIDE' ? 'text-amber-600' : 'text-slate-400'}`} />
            <span className="truncate">3. 알바 백과</span>
          </button>
        </nav>
      </div>
    </header>
  );
};
