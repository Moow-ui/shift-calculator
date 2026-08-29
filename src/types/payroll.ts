export type WeekStartsOn = 'SUN' | 'MON';
export type EmployeeCount = 'UNDER_5' | 'OVER_5';
export type TaxMode = 'NONE' | 'DAILY_WORKER' | 'INSURED';

export interface ProbationConfig {
  applied: boolean;
  contractOverOneYear: boolean; // 계약기간 1년 이상인가
  simpleLabor: boolean; // 단순노무업무인가 (편의점/카페/서빙/청소 등)
  startDate?: string; // 수습 시작일 (YYYY-MM-DD)
  monthIndex?: number; // 수습 개월차 (1: 1개월차, 2: 2개월차, 3: 3개월차, 4+: 4개월차 이후)
}

export interface Config {
  year: number; // 계산 대상 연도
  month: number; // 1~12
  weekStartsOn: WeekStartsOn;
  employeeCount: EmployeeCount | null; // 상시 근로자 수 (null: 미선택)
  probation: ProbationConfig;
  taxMode: TaxMode;
}

export interface ShiftPreset {
  id: string;
  label: string; // "평일", "주말" 등
  startTime: string; // "09:00"
  endTime: string; // "18:00" (익일이면 자동 판별)
  breakMinutes: number; // 휴게시간 (분)
  hourlyWage: number; // 이 프리셋의 시급
  color?: string; // UI 색상 구분
}

export interface WorkDay {
  date: string; // "YYYY-MM-DD"
  presetId?: string;
  overrides?: Partial<ShiftPreset>; // 그 날만 다르게
  absent?: boolean; // 결근 (주휴 판정에 영향)
  late?: boolean; // 지각/조퇴 (주휴 판정에 영향 없음 — 표시만)
  isHoliday?: boolean; // 유급휴일 근로 여부
  memo?: string;
}

export interface DailyPayrollDetail {
  date: string;
  isCurrentMonth: boolean;
  presetLabel: string;
  startTime: string;
  endTime: string;
  breakMinutes: number;
  totalDurationMinutes: number; // 총 구속시간 (분)
  workMinutes: number; // 실근로시간 (분)
  rawHourlyWage: number;
  effectiveHourlyWage: number; // 수습 등 감액 적용된 시급
  isProbationReduced: boolean;
  basePay: number; // 일 기본급
  nightMinutes: number; // 야간근로시간 (분)
  nightPay: number; // 야간가산액 (5인 이상만)
  overtimeMinutes: number; // 일별 8시간 초과분 (분)
  isHoliday: boolean;
  holidayPay: number; // 휴일가산액 (5인 이상만)
  absent: boolean;
  late: boolean;
}

export interface WeeklyPayrollDetail {
  weekIndex: number; // 1, 2, 3, 4, 5, 6
  startDate: string; // "YYYY-MM-DD"
  endDate: string; // "YYYY-MM-DD"
  days: DailyPayrollDetail[];
  totalWorkMinutes: number; // 주 실근로시간 (분)
  currentMonthWorkMinutes: number; // 이번 달에 속한 실근로시간 (분)
  totalWorkDaysCount: number; // 그 주 총 근무일 수 (결근 제외)
  currentMonthWorkDaysCount: number; // 이번 달에 속한 그 주 근무일 수
  hasAbsent: boolean;
  weeklyHolidayEligible: boolean; // 주휴 발생 여부
  weeklyHolidayIneligibleReason?: string; // 미발생 사유
  weightedAverageHourlyWage: number; // 가중평균시급
  weeklyHolidayMinutes: number; // 주휴시간 (분)
  weeklyHolidayPayTotal: number; // 그 주 전체 주휴수당
  weeklyHolidayPayMonthAllocated: number; // 이번 달에 안분된 주휴수당
  allocationRatio: number; // 이번 달 안분 비율 (0~1)
  overtimeMinutes: number; // 연장근로시간 (분)
  overtimePay: number; // 연장가산액 (5인 이상만)
  nightMinutes: number; // 주 야간근로시간 (분)
  nightPay: number; // 주 야간가산액 (5인 이상만)
  holidayPay: number; // 주 휴일가산액 (5인 이상만)
  basePay: number; // 주 기본급 합계
  totalWeeklyGrossPay: number; // 주 총지급액 (이번달 안분 반영)
  isSplitWeek: boolean; // 월 경계에 걸친 주인가
}

export interface TaxDeductionResult {
  mode: TaxMode;
  eligible: boolean;
  ineligibleReason?: string;
  incomeTax: number; // 소득세 (일용직)
  localTax: number; // 지방소득세
  breakdown: {
    nationalPension?: number; // 4.75%
    healthInsurance?: number; // 3.595%
    longTermCare?: number; // 0.4724%
    employmentInsurance?: number; // 0.9%
  };
  totalDeduction: number;
}

export interface PayrollResult {
  config: Config;
  weeks: WeeklyPayrollDetail[];
  totalWorkDaysInMonth: number;
  totalWorkMinutesInMonth: number;
  
  // Gross earnings breakdown
  basePayTotal: number; // 기본급 총액
  weeklyHolidayPayTotal: number; // 주휴수당 총액 (월 안분 반영)
  overtimePayTotal: number; // 연장가산 총액
  nightPayTotal: number; // 야간가산 총액
  holidayPayTotal: number; // 휴일가산 총액
  grossSalary: number; // 월 총액(세전)

  // Deductions & Net
  deduction: TaxDeductionResult;
  netSalary: number; // 실수령 예상액

  // Warnings
  probationWarning?: string;
  probationApplied: boolean;
  minWageWarnings: string[];
}
