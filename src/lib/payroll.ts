import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  format,
  isSameMonth,
  parseISO,
  differenceInMonths,
} from 'date-fns';
import {
  Config,
  ShiftPreset,
  WorkDay,
  PayrollResult,
  WeeklyPayrollDetail,
  DailyPayrollDetail,
  TaxDeductionResult,
} from '../types/payroll';
import { getMinimumWage } from '../config/minimumWage';

/**
 * "HH:mm" 문자열을 자정 이후의 분(minute) 정수로 변환
 */
export function timeStringToMinutes(timeStr: string): number {
  if (!timeStr) return 0;
  const parts = timeStr.trim().split(':');
  if (parts.length !== 2) return 0;
  const h = parseInt(parts[0], 10) || 0;
  const m = parseInt(parts[1], 10) || 0;
  return h * 60 + m;
}

/**
 * 분 정수를 "HH:mm" 형식으로 변환
 */
export function minutesToTimeString(minutes: number): string {
  const normalized = ((minutes % 1440) + 1440) % 1440;
  const h = Math.floor(normalized / 60);
  const m = normalized % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/**
 * 분 정수를 "X시간 Y분" 또는 "X.X시간" 형식으로 변환
 */
export function formatMinutes(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (m === 0) return `${h}시간`;
  return `${h}시간 ${m}분`;
}

export function minutesToHours(minutes: number): number {
  return Number((minutes / 60).toFixed(2));
}

/**
 * 근무 시작/종료 시각과 휴게시간으로 일 실근로시간(분) 및 총구속시간(분) 계산
 * - 종료시각 <= 시작시각이면 익일 퇴근으로 간주 (+24시간 = +1440분)
 */
export function calculateDailyWorkMinutes(
  startTime: string,
  endTime: string,
  breakMinutes: number = 0
): { totalDurationMinutes: number; workMinutes: number } {
  const startM = timeStringToMinutes(startTime);
  let endM = timeStringToMinutes(endTime);

  if (endM <= startM) {
    endM += 1440; // 익일 퇴근 (+24시간)
  }

  const totalDurationMinutes = Math.max(0, endM - startM);
  const workMinutes = Math.max(0, totalDurationMinutes - breakMinutes);

  return { totalDurationMinutes, workMinutes };
}

/**
 * 야간근로시간(22:00 ~ 익일 06:00) 산출 (분 단위 정수)
 * - 겹치는 야간 구간 계산 후, 휴게시간 비례 차감 적용: 야간시간 * (실근로시간 / 총구속시간)
 */
export function calculateNightMinutes(
  startTime: string,
  endTime: string,
  breakMinutes: number = 0
): number {
  const startM = timeStringToMinutes(startTime);
  let endM = timeStringToMinutes(endTime);

  if (endM <= startM) {
    endM += 1440;
  }

  const totalDurationMinutes = Math.max(0, endM - startM);
  const workMinutes = Math.max(0, totalDurationMinutes - breakMinutes);

  if (totalDurationMinutes === 0 || workMinutes === 0) return 0;

  // 야간 구간 후보들 (분 단위):
  // 1. 전일 22:00 ~ 당일 06:00: [-120, 360]
  // 2. 당일 22:00 ~ 익일 06:00: [1320, 1800]
  // 3. 익일 22:00 ~ 익익일 06:00: [2760, 3240]
  const nightWindows: [number, number][] = [
    [-120, 360],
    [1320, 1800],
    [2760, 3240],
  ];

  let rawNightMinutes = 0;
  for (const [nStart, nEnd] of nightWindows) {
    const overlapStart = Math.max(startM, nStart);
    const overlapEnd = Math.min(endM, nEnd);
    if (overlapEnd > overlapStart) {
      rawNightMinutes += overlapEnd - overlapStart;
    }
  }

  // 휴게시간 비례 차감
  const effectiveNightMinutes = Math.round(
    rawNightMinutes * (workMinutes / totalDurationMinutes)
  );

  return Math.min(workMinutes, effectiveNightMinutes);
}

/**
 * 수습 감액 게이트 판정
 * - 게이트 조건: probation.applied && contractOverOneYear && !simpleLabor && 3개월 이내
 * - 조건 만족 시: 계약시급의 90% (최대 10% 감액)
 * - 조건 불만족 시: 감액 불가 (100% 전액)
 */
export function evaluateProbation(
  probation: Config['probation'],
  rawHourlyWage: number,
  workDateStr?: string
): {
  effectiveHourlyWage: number;
  isProbationReduced: boolean;
  warning?: string;
} {
  if (!probation.applied) {
    return {
      effectiveHourlyWage: rawHourlyWage,
      isProbationReduced: false,
    };
  }

  // 단순노무 업무 여부 검사
  if (probation.simpleLabor) {
    return {
      effectiveHourlyWage: rawHourlyWage,
      isProbationReduced: false,
      warning:
        '편의점·카페·서빙 같은 단순노무 업무는 수습 기간이라도 감액할 수 없습니다. 최저시급 전액을 받아야 합니다.',
    };
  }

  // 계약기간 1년 이상 여부 검사
  if (!probation.contractOverOneYear) {
    return {
      effectiveHourlyWage: rawHourlyWage,
      isProbationReduced: false,
      warning: '계약기간이 1년 미만이면 수습이라도 감액할 수 없습니다.',
    };
  }

  // 3개월 이내 여부 검사 (startDate 또는 monthIndex 기준)
  let isWithin3Months = true;
  if (probation.monthIndex !== undefined) {
    isWithin3Months = probation.monthIndex <= 3;
  } else if (probation.startDate && workDateStr) {
    const startDate = parseISO(probation.startDate);
    const workDate = parseISO(workDateStr);
    const monthsDiff = differenceInMonths(workDate, startDate);
    isWithin3Months = monthsDiff < 3;
  }

  if (!isWithin3Months) {
    return {
      effectiveHourlyWage: rawHourlyWage,
      isProbationReduced: false,
      warning: '수습 기간(3개월)이 경과하여 감액이 종료되었습니다.',
    };
  }

  // 감액 가능 (10% 감액 -> 90% 적용)
  const reducedWage = Math.floor(rawHourlyWage * 0.9);
  return {
    effectiveHourlyWage: reducedWage,
    isProbationReduced: true,
  };
}

/**
 * 일용직 및 4대보험 공제액 계산
 */
export function calculateDeductions(
  taxMode: Config['taxMode'],
  grossSalary: number,
  dailyPayList: number[],
  monthlyWorkMinutes: number,
  averageWeeklyWorkMinutes: number
): TaxDeductionResult {
  if (taxMode === 'NONE' || grossSalary <= 0) {
    return {
      mode: 'NONE',
      eligible: true,
      incomeTax: 0,
      localTax: 0,
      breakdown: {},
      totalDeduction: 0,
    };
  }

  if (taxMode === 'DAILY_WORKER') {
    // 일용직 원천징수:
    // 일별: 과세표준 = max(일급 - 150,000, 0)
    // 산출세액 = 과세표준 * 6%
    // 결정세액 = 산출세액 * 45% (근로소득세액공제 55% 적용)
    // 소액부징수: 결정세액 1,000원 미만이면 징수하지 않음 (0원)
    // 지방소득세 = 결정세액 * 10%
    let totalIncomeTax = 0;
    let totalLocalTax = 0;

    for (const dailyPay of dailyPayList) {
      const taxBase = Math.max(0, dailyPay - 150000);
      if (taxBase > 0) {
        const calculatedTax = taxBase * 0.06;
        const decisionTax = Math.floor(calculatedTax * 0.45);
        if (decisionTax >= 1000) {
          const localTax = Math.floor(decisionTax * 0.1);
          totalIncomeTax += decisionTax;
          totalLocalTax += localTax;
        }
      }
    }

    return {
      mode: 'DAILY_WORKER',
      eligible: true,
      incomeTax: totalIncomeTax,
      localTax: totalLocalTax,
      breakdown: {},
      totalDeduction: totalIncomeTax + totalLocalTax,
    };
  }

  if (taxMode === 'INSURED') {
    // 4대보험 가입 대상 판정:
    // 월 소정근로시간 >= 60시간(3600분) OR 주 소정근로시간 >= 15시간(900분)
    const isEligible =
      monthlyWorkMinutes >= 60 * 60 || averageWeeklyWorkMinutes >= 15 * 60;

    if (!isEligible) {
      return {
        mode: 'INSURED',
        eligible: false,
        ineligibleReason:
          '주 15시간(월 60시간) 미만은 4대보험 의무 가입 대상이 아닙니다.',
        incomeTax: 0,
        localTax: 0,
        breakdown: {},
        totalDeduction: 0,
      };
    }

    // 2026년 기준 근로자 부담분 추정 요율:
    // 국민연금: 4.75%
    // 건강보험: 3.595%
    // 장기요양: 건강보험료의 13.14% = 3.595% * 0.1314 ≈ 0.4724%
    // 고용보험: 0.9%
    const nationalPension = Math.floor(grossSalary * 0.0475);
    const healthInsurance = Math.floor(grossSalary * 0.03595);
    const longTermCare = Math.floor(grossSalary * 0.004724);
    const employmentInsurance = Math.floor(grossSalary * 0.009);

    const total =
      nationalPension + healthInsurance + longTermCare + employmentInsurance;

    return {
      mode: 'INSURED',
      eligible: true,
      incomeTax: nationalPension + healthInsurance + longTermCare,
      localTax: employmentInsurance,
      breakdown: {
        nationalPension,
        healthInsurance,
        longTermCare,
        employmentInsurance,
      },
      totalDeduction: total,
    };
  }

  return {
    mode: 'NONE',
    eligible: true,
    incomeTax: 0,
    localTax: 0,
    breakdown: {},
    totalDeduction: 0,
  };
}

/**
 * 급여 정밀 계산 메인 함수 (UI 비종속 순수 함수)
 */
export function calculatePayroll(
  config: Config,
  presets: ShiftPreset[],
  workDays: WorkDay[]
): PayrollResult {
  const minWage = getMinimumWage(config.year);
  const minWageWarnings: string[] = [];

  // 프리셋 맵 생성
  const presetMap = new Map<string, ShiftPreset>();
  for (const preset of presets) {
    presetMap.set(preset.id, preset);
    if (preset.hourlyWage < minWage) {
      const msg = `[${preset.label}] 프리셋의 시급(${preset.hourlyWage.toLocaleString()}원)이 ${config.year}년 최저시급(${minWage.toLocaleString()}원)보다 낮습니다.`;
      if (!minWageWarnings.includes(msg)) minWageWarnings.push(msg);
    }
  }

  // 워크데이 맵 생성 (date -> WorkDay)
  const workDayMap = new Map<string, WorkDay>();
  for (const wd of workDays) {
    workDayMap.set(wd.date, wd);
    if (wd.overrides?.hourlyWage && wd.overrides.hourlyWage < minWage) {
      const msg = `${wd.date} 직접 입력 시급(${wd.overrides.hourlyWage.toLocaleString()}원)이 ${config.year}년 최저시급(${minWage.toLocaleString()}원)보다 낮습니다.`;
      if (!minWageWarnings.includes(msg)) minWageWarnings.push(msg);
    }
  }

  // 달력 범위 계산 (월 시작일, 월 종료일, 주 경계 포함)
  const targetDate = new Date(config.year, config.month - 1, 1);
  const monthStart = startOfMonth(targetDate);
  const monthEnd = endOfMonth(targetDate);

  const weekStartsOnNum = config.weekStartsOn === 'SUN' ? 0 : 1;
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: weekStartsOnNum });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: weekStartsOnNum });

  const allCalendarDays = eachDayOfInterval({
    start: calendarStart,
    end: calendarEnd,
  });

  // 주(Week) 단위로 묶기
  const weekChunks: Date[][] = [];
  let currentWeek: Date[] = [];

  for (const day of allCalendarDays) {
    currentWeek.push(day);
    if (currentWeek.length === 7) {
      weekChunks.push(currentWeek);
      currentWeek = [];
    }
  }
  if (currentWeek.length > 0) {
    weekChunks.push(currentWeek);
  }

  const isOver5 = config.employeeCount === 'OVER_5';
  let overallProbationWarning: string | undefined;
  let probationEverApplied = false;

  const weeklyDetails: WeeklyPayrollDetail[] = [];
  const dailyPaysForTax: number[] = [];

  let monthlyTotalBasePay = 0;
  let monthlyTotalWeeklyHolidayPay = 0;
  let monthlyTotalOvertimePay = 0;
  let monthlyTotalNightPay = 0;
  let monthlyTotalHolidayPay = 0;
  let monthlyTotalWorkMinutes = 0;
  let monthlyTotalWorkDays = 0;

  // 각 주차별 순회 계산
  for (let wIdx = 0; wIdx < weekChunks.length; wIdx++) {
    const weekDays = weekChunks[wIdx];
    const weekStartDateStr = format(weekDays[0], 'yyyy-MM-dd');
    const weekEndDateStr = format(weekDays[weekDays.length - 1], 'yyyy-MM-dd');

    const dailyDetails: DailyPayrollDetail[] = [];
    let weekTotalWorkMinutes = 0;
    let weekCurrentMonthWorkMinutes = 0;
    let weekTotalWorkDaysCount = 0;
    let weekCurrentMonthWorkDaysCount = 0;
    let weekBasePaySum = 0;
    let weekCurrentMonthBasePaySum = 0;
    let weekNightPaySum = 0;
    let weekHolidayPaySum = 0;
    let weekNightMinutesSum = 0;
    let weekHasAbsent = false;
    let weekDailyOvertimeMinutesSum = 0;
    let currentMonthDailyOvertimeMinutesSum = 0;

    for (const dayDate of weekDays) {
      const dateStr = format(dayDate, 'yyyy-MM-dd');
      const isCurrentMonth = isSameMonth(dayDate, monthStart);
      const workEntry = workDayMap.get(dateStr);

      if (!workEntry || (!workEntry.presetId && !workEntry.overrides)) {
        // 근무가 없는 날
        dailyDetails.push({
          date: dateStr,
          isCurrentMonth,
          presetLabel: '',
          startTime: '',
          endTime: '',
          breakMinutes: 0,
          totalDurationMinutes: 0,
          workMinutes: 0,
          rawHourlyWage: 0,
          effectiveHourlyWage: 0,
          isProbationReduced: false,
          basePay: 0,
          nightMinutes: 0,
          nightPay: 0,
          overtimeMinutes: 0,
          isHoliday: false,
          holidayPay: 0,
          absent: false,
          late: false,
        });
        continue;
      }

      // 프리셋 및 오버라이드 병합
      const basePreset = workEntry.presetId
        ? presetMap.get(workEntry.presetId)
        : undefined;

      const startTime =
        workEntry.overrides?.startTime || basePreset?.startTime || '09:00';
      const endTime =
        workEntry.overrides?.endTime || basePreset?.endTime || '18:00';
      const breakMinutes =
        workEntry.overrides?.breakMinutes !== undefined
          ? workEntry.overrides.breakMinutes
          : basePreset?.breakMinutes || 0;
      const rawHourlyWage =
        workEntry.overrides?.hourlyWage !== undefined
          ? workEntry.overrides.hourlyWage
          : basePreset?.hourlyWage || minWage;
      const presetLabel =
        workEntry.overrides?.label || basePreset?.label || '근무';

      const isAbsent = Boolean(workEntry.absent);
      const isLate = Boolean(workEntry.late);
      const isHoliday = Boolean(workEntry.isHoliday);

      if (isAbsent) {
        weekHasAbsent = true;
        dailyDetails.push({
          date: dateStr,
          isCurrentMonth,
          presetLabel,
          startTime,
          endTime,
          breakMinutes,
          totalDurationMinutes: 0,
          workMinutes: 0,
          rawHourlyWage,
          effectiveHourlyWage: rawHourlyWage,
          isProbationReduced: false,
          basePay: 0,
          nightMinutes: 0,
          nightPay: 0,
          overtimeMinutes: 0,
          isHoliday,
          holidayPay: 0,
          absent: true,
          late: isLate,
        });
        continue;
      }

      // 실근로시간 계산
      const { totalDurationMinutes, workMinutes } = calculateDailyWorkMinutes(
        startTime,
        endTime,
        breakMinutes
      );

      // 수습 감액 게이트 평가
      const probationResult = evaluateProbation(
        config.probation,
        rawHourlyWage,
        dateStr
      );
      if (probationResult.warning && !overallProbationWarning) {
        overallProbationWarning = probationResult.warning;
      }
      if (probationResult.isProbationReduced) {
        probationEverApplied = true;
      }

      const effectiveHourlyWage = probationResult.effectiveHourlyWage;

      // 일 기본급 (시간 환산)
      const basePay = (workMinutes / 60) * effectiveHourlyWage;

      // 야간근로시간 및 가산 (5인 이상만)
      const nightMinutes = calculateNightMinutes(
        startTime,
        endTime,
        breakMinutes
      );
      const nightPay = isOver5
        ? (nightMinutes / 60) * effectiveHourlyWage * 0.5
        : 0;

      // 일별 8시간 초과 연장시간 (분)
      const dailyOvertimeMinutes = Math.max(0, workMinutes - 8 * 60);

      // 휴일가산액 (5인 이상만)
      let holidayPay = 0;
      if (isOver5 && isHoliday) {
        const normalHolidayMinutes = Math.min(workMinutes, 8 * 60);
        const excessHolidayMinutes = Math.max(0, workMinutes - 8 * 60);
        holidayPay =
          (normalHolidayMinutes / 60) * effectiveHourlyWage * 0.5 +
          (excessHolidayMinutes / 60) * effectiveHourlyWage * 1.0;
      }

      if (workMinutes > 0) {
        weekTotalWorkMinutes += workMinutes;
        weekTotalWorkDaysCount += 1;
        weekBasePaySum += basePay;
        weekNightMinutesSum += nightMinutes;
        weekDailyOvertimeMinutesSum += dailyOvertimeMinutes;

        if (isCurrentMonth) {
          weekCurrentMonthWorkMinutes += workMinutes;
          weekCurrentMonthWorkDaysCount += 1;
          weekCurrentMonthBasePaySum += basePay;
          weekNightPaySum += nightPay;
          weekHolidayPaySum += holidayPay;
          currentMonthDailyOvertimeMinutesSum += dailyOvertimeMinutes;
          monthlyTotalWorkMinutes += workMinutes;
          monthlyTotalWorkDays += 1;
        }
      }

      dailyDetails.push({
        date: dateStr,
        isCurrentMonth,
        presetLabel,
        startTime,
        endTime,
        breakMinutes,
        totalDurationMinutes,
        workMinutes,
        rawHourlyWage,
        effectiveHourlyWage,
        isProbationReduced: probationResult.isProbationReduced,
        basePay,
        nightMinutes,
        nightPay,
        overtimeMinutes: dailyOvertimeMinutes,
        isHoliday,
        holidayPay,
        absent: false,
        late: isLate,
      });
    }

    // 주 가중평균시급 계산
    const weightedAverageHourlyWage =
      weekTotalWorkMinutes > 0
        ? weekBasePaySum / (weekTotalWorkMinutes / 60)
        : minWage;

    // 주휴수당 판정 (§4.4)
    // 조건: 주 실근로시간 >= 15시간(900분) AND 결근 없음
    const meetsHoursCondition = weekTotalWorkMinutes >= 15 * 60;
    const weeklyHolidayEligible = meetsHoursCondition && !weekHasAbsent;

    let weeklyHolidayIneligibleReason: string | undefined;
    if (!meetsHoursCondition) {
      weeklyHolidayIneligibleReason = `주 ${minutesToHours(
        weekTotalWorkMinutes
      )}시간 → 15시간 미만`;
    } else if (weekHasAbsent) {
      weeklyHolidayIneligibleReason = '결근 발생으로 미지급';
    }

    // 주휴시간: min(주소정근로시간, 40시간) / 40 * 8시간
    let weeklyHolidayMinutes = 0;
    let weeklyHolidayPayTotal = 0;

    if (weeklyHolidayEligible) {
      const cappedWorkMinutes = Math.min(weekTotalWorkMinutes, 40 * 60);
      weeklyHolidayMinutes = (cappedWorkMinutes / (40 * 60)) * (8 * 60);
      weeklyHolidayPayTotal =
        (weeklyHolidayMinutes / 60) * weightedAverageHourlyWage;
    }

    // 월 경계 안분 비율 계산 (§4.4)
    const isSplitWeek = weekDays.some((d) => !isSameMonth(d, monthStart));
    let allocationRatio = 1.0;

    if (isSplitWeek) {
      if (weekTotalWorkDaysCount > 0) {
        allocationRatio =
          weekCurrentMonthWorkDaysCount / weekTotalWorkDaysCount;
      } else {
        allocationRatio = 0;
      }
    }

    const weeklyHolidayPayMonthAllocated =
      weeklyHolidayPayTotal * allocationRatio;

    // 주 단위 연장근로시간 계산 (§4.5 중복 방지: max(일별초과합, 주초과))
    let weekOvertimeMinutes = 0;
    let weekOvertimePay = 0;

    if (isOver5) {
      const weeklyExceedMinutes = Math.max(0, weekTotalWorkMinutes - 40 * 60);
      weekOvertimeMinutes = Math.max(
        weekDailyOvertimeMinutesSum,
        weeklyExceedMinutes
      );

      // 월 안분 반영 연장가산액
      const totalWeekOvertimePay =
        (weekOvertimeMinutes / 60) * weightedAverageHourlyWage * 0.5;

      if (isSplitWeek) {
        // 분할된 주는 이번 달 근무시간 비율로 안분
        const timeRatio =
          weekTotalWorkMinutes > 0
            ? weekCurrentMonthWorkMinutes / weekTotalWorkMinutes
            : 0;
        weekOvertimePay = totalWeekOvertimePay * timeRatio;
      } else {
        weekOvertimePay = totalWeekOvertimePay;
      }
    }

    // 이번 달 집계 누적
    monthlyTotalBasePay += weekCurrentMonthBasePaySum;
    monthlyTotalWeeklyHolidayPay += weeklyHolidayPayMonthAllocated;
    monthlyTotalOvertimePay += weekOvertimePay;
    monthlyTotalNightPay += weekNightPaySum;
    monthlyTotalHolidayPay += weekHolidayPaySum;

    const totalWeeklyGrossPay =
      weekCurrentMonthBasePaySum +
      weeklyHolidayPayMonthAllocated +
      weekOvertimePay +
      weekNightPaySum +
      weekHolidayPaySum;

    weeklyDetails.push({
      weekIndex: wIdx + 1,
      startDate: weekStartDateStr,
      endDate: weekEndDateStr,
      days: dailyDetails,
      totalWorkMinutes: weekTotalWorkMinutes,
      currentMonthWorkMinutes: weekCurrentMonthWorkMinutes,
      totalWorkDaysCount: weekTotalWorkDaysCount,
      currentMonthWorkDaysCount: weekCurrentMonthWorkDaysCount,
      hasAbsent: weekHasAbsent,
      weeklyHolidayEligible,
      weeklyHolidayIneligibleReason,
      weightedAverageHourlyWage: Math.round(weightedAverageHourlyWage),
      weeklyHolidayMinutes: Math.round(weeklyHolidayMinutes),
      weeklyHolidayPayTotal: Math.floor(weeklyHolidayPayTotal),
      weeklyHolidayPayMonthAllocated: Math.floor(weeklyHolidayPayMonthAllocated),
      allocationRatio,
      overtimeMinutes: weekOvertimeMinutes,
      overtimePay: Math.floor(weekOvertimePay),
      nightMinutes: weekNightMinutesSum,
      nightPay: Math.floor(weekNightPaySum),
      holidayPay: Math.floor(weekHolidayPaySum),
      basePay: Math.floor(weekCurrentMonthBasePaySum),
      totalWeeklyGrossPay: Math.floor(totalWeeklyGrossPay),
      isSplitWeek,
    });

    // 일용직 세금 계산을 위한 일급 목록 수집
    for (const d of dailyDetails) {
      if (d.isCurrentMonth && d.workMinutes > 0) {
        dailyPaysForTax.push(d.basePay + d.nightPay + d.holidayPay);
      }
    }
  }

  // 월 세전 총액 (원 단위 미만 절사)
  const grossSalary = Math.floor(
    monthlyTotalBasePay +
      monthlyTotalWeeklyHolidayPay +
      monthlyTotalOvertimePay +
      monthlyTotalNightPay +
      monthlyTotalHolidayPay
  );

  // 공제액 계산
  const averageWeeklyMinutes =
    weeklyDetails.length > 0
      ? weeklyDetails.reduce((sum, w) => sum + w.totalWorkMinutes, 0) /
        weeklyDetails.length
      : 0;

  const deduction = calculateDeductions(
    config.taxMode,
    grossSalary,
    dailyPaysForTax,
    monthlyTotalWorkMinutes,
    averageWeeklyMinutes
  );

  const netSalary = Math.max(0, grossSalary - deduction.totalDeduction);

  return {
    config,
    weeks: weeklyDetails,
    totalWorkDaysInMonth: monthlyTotalWorkDays,
    totalWorkMinutesInMonth: monthlyTotalWorkMinutes,
    basePayTotal: Math.floor(monthlyTotalBasePay),
    weeklyHolidayPayTotal: Math.floor(monthlyTotalWeeklyHolidayPay),
    overtimePayTotal: Math.floor(monthlyTotalOvertimePay),
    nightPayTotal: Math.floor(monthlyTotalNightPay),
    holidayPayTotal: Math.floor(monthlyTotalHolidayPay),
    grossSalary,
    deduction,
    netSalary,
    probationWarning: overallProbationWarning,
    probationApplied: probationEverApplied,
    minWageWarnings,
  };
}
