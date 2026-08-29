import React, { useState, useEffect, useMemo } from 'react';
import { Config, ShiftPreset, WorkDay } from './types/payroll';
import { getMinimumWage, DEFAULT_YEAR } from './config/minimumWage';
import { calculatePayroll } from './lib/payroll';
import { encodeStateToQuery, decodeStateFromQuery } from './lib/urlState';
import { Navbar, ActiveTab, ViewMode } from './components/Navbar';
import { WorkplaceConfigSection } from './components/WorkplaceConfigSection';
import { WorkRegistrationSection } from './components/WorkRegistrationSection';
import { WeeklyBreakdownSection } from './components/WeeklyBreakdownSection';
import { ResultSection } from './components/ResultSection';
import { LaborLawGuideSection } from './components/LaborLawGuideSection';
import { ImportModal } from './components/ImportModal';
import { ShareModal } from './components/ShareModal';
import {
  CalendarDays,
  BookOpen,
  Settings,
  FileText,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { eachDayOfInterval, startOfMonth, endOfMonth, getDay, format } from 'date-fns';
import { getKoreanHoliday } from './config/holidays';

export const App: React.FC = () => {
  const currentDate = new Date();
  const currentMonth = currentDate.getMonth() + 1;

  const [activeTab, setActiveTab] = useState<ActiveTab>('RECORD');
  const [viewMode, setViewMode] = useState<ViewMode>('mobile');
  const [baseHourlyWage, setBaseHourlyWage] = useState<number>(getMinimumWage(DEFAULT_YEAR));

  // 2번째 탭 접이식 토글 상태
  const [showConfigSettings, setShowConfigSettings] = useState<boolean>(false);
  const [showWeeklyBreakdown, setShowWeeklyBreakdown] = useState<boolean>(false);

  // 초기 프리셋
  const defaultPresets: ShiftPreset[] = [
    {
      id: 'preset-weekday',
      label: '평일',
      startTime: '09:00',
      endTime: '18:00',
      breakMinutes: 60,
      hourlyWage: getMinimumWage(DEFAULT_YEAR),
      color: 'bg-indigo-500 text-white',
    },
    {
      id: 'preset-weekend',
      label: '주말',
      startTime: '10:00',
      endTime: '15:00',
      breakMinutes: 0,
      hourlyWage: 11000,
      color: 'bg-emerald-500 text-white',
    },
  ];

  // 보편적인 기본 설정 (5인 미만 기본, 세전 100% 실수령 기본, 수습 감액 없음 기본)
  const defaultInitialConfig: Config = {
    year: DEFAULT_YEAR,
    month: currentMonth,
    weekStartsOn: 'MON',
    employeeCount: 'UNDER_5',
    probation: {
      applied: false,
      contractOverOneYear: true,
      simpleLabor: false,
    },
    taxMode: 'NONE',
  };

  const [config, setConfig] = useState<Config>(defaultInitialConfig);
  const [presets, setPresets] = useState<ShiftPreset[]>(defaultPresets);
  const [workDays, setWorkDays] = useState<WorkDay[]>([]);

  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isShareOpen, setIsShareOpen] = useState(false);

  // 기본 시급 변경 시 첫 번째 프리셋 시급도 동기화
  const handleUpdateBaseWage = (newWage: number) => {
    setBaseHourlyWage(newWage);
    setPresets((prev) =>
      prev.map((p, idx) => (idx === 0 ? { ...p, hourlyWage: newWage } : p))
    );
  };

  // URL에서 초기 상태 복원
  useEffect(() => {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const stateParam = urlParams.get('s') || window.location.hash.replace('#', '');
      if (stateParam) {
        const decoded = decodeStateFromQuery(stateParam);
        if (decoded) {
          setConfig(decoded.config);
          setPresets(decoded.presets);
          setWorkDays(decoded.workDays || []);
          if (decoded.presets?.[0]?.hourlyWage) {
            setBaseHourlyWage(decoded.presets[0].hourlyWage);
          }
        }
      }
    } catch (err) {
      console.error('URL 복원 오류', err);
    }
  }, []);

  // 프리셋 추가 / 수정 / 삭제
  const handleAddPreset = (preset: ShiftPreset) => {
    setPresets((prev) => [...prev, preset]);
  };

  const handleUpdatePreset = (updated: ShiftPreset) => {
    setPresets((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
  };

  const handleDeletePreset = (id: string) => {
    if (presets.length <= 1) {
      alert('최소 1개 이상의 프리셋이 필요합니다.');
      return;
    }
    setPresets((prev) => prev.filter((p) => p.id !== id));
  };

  // 근무 등록 / 수정 / 삭제
  const handleSetWorkDay = (newDay: WorkDay) => {
    setWorkDays((prev) => {
      const filtered = prev.filter((wd) => wd.date !== newDay.date);
      return [...filtered, newDay];
    });
  };

  const handleDeleteWorkDay = (dateStr: string) => {
    setWorkDays((prev) => prev.filter((wd) => wd.date !== dateStr));
  };

  const handleUpdateWorkDays = (newDays: WorkDay[]) => {
    setWorkDays(newDays);
  };

  // 테스트용 1초 예시 데이터 채우기 (평일 + 주말 + 공휴일 근무 포함)
  const handleLoadSample = () => {
    const monthDate = new Date(config.year, config.month - 1, 1);
    const mStart = startOfMonth(monthDate);
    const mEnd = endOfMonth(monthDate);
    const allDays = eachDayOfInterval({ start: mStart, end: mEnd });

    const sampleDays: WorkDay[] = [];
    let holidayCount = 0;

    for (const day of allDays) {
      const dayOfWeek = getDay(day);
      const dateStr = format(day, 'yyyy-MM-dd');
      const holiday = getKoreanHoliday(dateStr);

      // 1. 공휴일인 날이 있으면 공휴일 근무로 등록
      if (holiday) {
        holidayCount++;
        sampleDays.push({
          date: dateStr,
          presetId: 'preset-weekday',
          isHoliday: true,
          overrides: {
            startTime: '10:00',
            endTime: '19:00',
            breakMinutes: 60,
            hourlyWage: baseHourlyWage || getMinimumWage(config.year),
            label: `${holiday.name} 근무`,
          },
        });
        continue;
      }

      // 2. 평일: 월(1), 수(3), 금(5) -> 평일 8h
      if (dayOfWeek === 1 || dayOfWeek === 3 || dayOfWeek === 5) {
        sampleDays.push({
          date: dateStr,
          presetId: 'preset-weekday',
          isHoliday: false,
        });
      }
      // 3. 주말: 토(6) -> 주말 5h, 11000원
      else if (dayOfWeek === 6) {
        sampleDays.push({
          date: dateStr,
          presetId: 'preset-weekend',
          isHoliday: false,
        });
      }
    }

    setWorkDays(sampleDays);
    const holidayMsg = holidayCount > 0 ? ` (공휴일 ${holidayCount}일 포함)` : '';
    alert(`✨ ${config.year}년 ${config.month}월 알바 예시(평일+주말+공휴일 총 ${sampleDays.length}일${holidayMsg})가 등록되었습니다!\n'2. 급여 계산 결과' 탭에서 예상 급여와 주휴수당을 확인해보세요.`);
  };

  // Importer 반영
  const handleImportWorkDays = (imported: WorkDay[], mode: 'OVERWRITE' | 'MERGE') => {
    if (mode === 'OVERWRITE') {
      setWorkDays(imported);
    } else {
      setWorkDays((prev) => {
        const map = new Map<string, WorkDay>();
        for (const wd of prev) map.set(wd.date, wd);
        for (const wd of imported) map.set(wd.date, wd);
        return Array.from(map.values());
      });
    }
    setActiveTab('RECORD');
  };

  // 초기화
  const handleReset = () => {
    if (window.confirm('모든 설정을 기본값으로 초기화하시겠습니까?')) {
      setConfig(defaultInitialConfig);
      setPresets(defaultPresets);
      setWorkDays([]);
      window.history.replaceState({}, '', window.location.pathname);
    }
  };

  // 공유 링크 생성
  const shareUrl = useMemo(() => {
    const statePayload = {
      version: 1,
      config,
      presets,
      workDays,
    };
    const query = encodeStateToQuery(statePayload);
    const origin = window.location.origin + window.location.pathname;
    return `${origin}?s=${query}`;
  }, [config, presets, workDays]);

  // 급여 실시간 계산
  const payrollResult = useMemo(() => {
    return calculatePayroll(config, presets, workDays);
  }, [config, presets, workDays]);

  // 차액 문의 버튼 클릭 시 하단 알바 조건 변경 열고 스크롤 이동
  const handleOpenConfigFromDiff = () => {
    setShowConfigSettings(true);
    setTimeout(() => {
      const el = document.getElementById('config-section-container');
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 100);
  };

  // 뷰 모드에 따른 래퍼 클래스 (화면 100% 핏 & 가로 스크롤 완전 방지)
  const containerClass = viewMode === 'mobile'
    ? 'w-full max-w-md mx-auto min-h-screen bg-slate-50 shadow-none sm:shadow-xl sm:border-x border-slate-300/80 transition-all overflow-x-hidden'
    : 'w-full max-w-4xl mx-auto min-h-screen transition-all overflow-x-hidden';

  return (
    <div className="min-h-screen bg-slate-200/70 text-slate-900 pb-16 flex flex-col justify-between w-full overflow-x-hidden">
      <div className={containerClass}>
        <Navbar
          activeTab={activeTab}
          onSelectTab={setActiveTab}
          onOpenImport={() => setIsImportOpen(true)}
          onOpenShare={() => setIsShareOpen(true)}
          onReset={handleReset}
          hasWorkDays={workDays.length > 0}
          viewMode={viewMode}
          onToggleViewMode={setViewMode}
        />

        <main className="w-full px-2 sm:px-4 py-2.5 sm:py-4 space-y-3 sm:space-y-4 overflow-x-hidden min-w-0">
          {/* 탭 1: 근무 기록 (달력 메인) */}
          {activeTab === 'RECORD' && (
            <div className="space-y-3 sm:space-y-4 animate-fadeIn w-full min-w-0">
              <WorkRegistrationSection
                config={config}
                presets={presets}
                workDays={workDays}
                baseHourlyWage={baseHourlyWage}
                onUpdateBaseWage={handleUpdateBaseWage}
                onChangeConfig={setConfig}
                onUpdateWorkDays={handleUpdateWorkDays}
                onSetWorkDay={handleSetWorkDay}
                onDeleteWorkDay={handleDeleteWorkDay}
                onAddPreset={handleAddPreset}
                onUpdatePreset={handleUpdatePreset}
                onDeletePreset={handleDeletePreset}
                onGoToResult={() => setActiveTab('RESULT')}
                onLoadSample={handleLoadSample}
              />
            </div>
          )}

          {/* 탭 2: 급여 계산 결과 (결과 메인 + 하단 접이식 설정 및 계산근거) */}
          {activeTab === 'RESULT' && (
            <div className="space-y-3 sm:space-y-4 animate-fadeIn w-full min-w-0">
              {/* 1. 월 급여 계산 결과 카드 (메인) */}
              <ResultSection
                result={payrollResult}
                onOpenConfig={handleOpenConfigFromDiff}
              />

              {/* 2. 하단 접이식 버튼 1: 알바 조건 변경하기 (직원 5명 이상, 4대보험, 수습기간 설정) */}
              <section id="config-section-container" className="bg-white rounded-2xl border border-slate-300/80 shadow-md shadow-slate-200/60 overflow-hidden transition-all w-full min-w-0">
                <button
                  type="button"
                  onClick={() => setShowConfigSettings((v) => !v)}
                  className="w-full p-3 sm:p-4 flex items-center justify-between text-left hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                    <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold border border-indigo-100 flex-shrink-0">
                      <Settings className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-extrabold text-xs sm:text-sm text-slate-900 flex items-center gap-1.5 flex-wrap">
                        <span>⚙️ 알바 조건 변경</span>
                        <span className="text-[10px] sm:text-[11px] font-semibold text-slate-600 bg-slate-100 px-1.5 py-0.2 rounded-full border border-slate-200">
                          {config.employeeCount === 'OVER_5' ? '5인 이상' : '5인 미만'} · {config.taxMode === 'NONE' ? '비과세' : config.taxMode === 'DAILY_WORKER' ? '일용직' : '4대보험'}
                        </span>
                      </h3>
                      <p className="text-[11px] text-slate-500 truncate">
                        매장 직원 수, 4대보험 가입 여부, 수습기간을 변경합니다.
                      </p>
                    </div>
                  </div>

                  <div className="p-1 rounded-lg bg-slate-100 text-slate-600 border border-slate-200 flex-shrink-0">
                    {showConfigSettings ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </div>
                </button>

                {showConfigSettings && (
                  <div className="p-3 sm:p-4 pt-2 border-t border-slate-200 bg-slate-50/70 animate-fadeIn w-full min-w-0">
                    <WorkplaceConfigSection
                      config={config}
                      onChangeConfig={setConfig}
                    />
                  </div>
                )}
              </section>

              {/* 3. 하단 접이식 버튼 2: 주차별 계산 근거 (사장님 제출용) */}
              <section className="bg-white rounded-2xl border border-slate-300/80 shadow-md shadow-slate-200/60 overflow-hidden transition-all w-full min-w-0">
                <button
                  type="button"
                  onClick={() => setShowWeeklyBreakdown((v) => !v)}
                  className="w-full p-3 sm:p-4 flex items-center justify-between text-left hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                    <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold border border-emerald-100 flex-shrink-0">
                      <FileText className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-extrabold text-xs sm:text-sm text-slate-900 flex items-center gap-1.5 flex-wrap">
                        <span>📋 주차별 계산 근거</span>
                        <span className="text-[10px] sm:text-[11px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded-full border border-emerald-200">
                          사장님 제출용
                        </span>
                      </h3>
                      <p className="text-[11px] text-slate-500 truncate">
                        주차별 실근로시간, 주휴수당 15시간 발생 여부 증명
                      </p>
                    </div>
                  </div>

                  <div className="p-1 rounded-lg bg-slate-100 text-slate-600 border border-slate-200 flex-shrink-0">
                    {showWeeklyBreakdown ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </div>
                </button>

                {showWeeklyBreakdown && (
                  <div className="p-3 sm:p-4 pt-2 border-t border-slate-200 bg-slate-50/70 animate-fadeIn w-full min-w-0">
                    <WeeklyBreakdownSection
                      weeks={payrollResult.weeks}
                      config={config}
                      result={payrollResult}
                    />
                  </div>
                )}
              </section>

              {/* 네비게이션 버튼 */}
              <div className="flex justify-between items-center pt-2 gap-2 w-full">
                <button
                  type="button"
                  onClick={() => setActiveTab('RECORD')}
                  className="flex-1 px-2.5 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-xl text-xs font-bold flex items-center justify-center gap-1 shadow-xs transition-colors truncate touch-target"
                >
                  <CalendarDays className="w-3.5 h-3.5 text-indigo-600 flex-shrink-0" />
                  <span className="truncate">← 달력 수정</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('GUIDE')}
                  className="flex-1 px-2.5 py-2 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-xl text-xs font-bold flex items-center justify-center gap-1 shadow-xs transition-colors truncate touch-target"
                >
                  <BookOpen className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
                  <span className="truncate">상식 백과 →</span>
                </button>
              </div>
            </div>
          )}

          {/* 탭 3: 알바 상식 백과 */}
          {activeTab === 'GUIDE' && (
            <div className="space-y-3 sm:space-y-4 animate-fadeIn w-full min-w-0">
              <LaborLawGuideSection />
            </div>
          )}
        </main>
      </div>

      {/* 모달 */}
      <ImportModal
        isOpen={isImportOpen}
        onClose={() => setIsImportOpen(false)}
        onImport={handleImportWorkDays}
      />

      <ShareModal
        isOpen={isShareOpen}
        shareUrl={shareUrl}
        onClose={() => setIsShareOpen(false)}
      />
    </div>
  );
};
