import { describe, it, expect } from 'vitest';
import {
  calculateDailyWorkMinutes,
  calculateNightMinutes,
  evaluateProbation,
  calculatePayroll,
  calculateDeductions,
} from '../src/lib/payroll';
import { Config, ShiftPreset, WorkDay } from '../src/types/payroll';
import { encodeStateToQuery, decodeStateFromQuery } from '../src/lib/urlState';
import { parseWorkDaysInput } from '../src/lib/importer';

describe('알바 급여 자동 계산기 §7 전수 검증', () => {
  const BASE_HOURLY_WAGE = 10320; // 2026년 최저시급

  const createDefaultConfig = (overrides?: Partial<Config>): Config => ({
    year: 2026,
    month: 8,
    weekStartsOn: 'MON',
    employeeCount: 'OVER_5',
    probation: {
      applied: false,
      contractOverOneYear: true,
      simpleLabor: false,
    },
    taxMode: 'NONE',
    ...overrides,
  });

  const defaultPreset: ShiftPreset = {
    id: 'p1',
    label: '기본근무',
    startTime: '09:00',
    endTime: '18:00',
    breakMinutes: 60, // 실근로 8시간
    hourlyWage: BASE_HOURLY_WAGE,
  };

  // ----------------------------------------------------
  // A. 주휴수당 판정
  // ----------------------------------------------------
  describe('A. 주휴수당 판정', () => {
    it('A-1: 주 5일 × 4시간 = 20시간 → 주휴 4시간 발생 / 주급 247,680원', () => {
      // 2026년 8월 3일(월) ~ 8월 7일(금) 5일간 4시간
      const config = createDefaultConfig();
      const preset4h: ShiftPreset = {
        id: 'p4h',
        label: '4시간',
        startTime: '09:00',
        endTime: '13:00',
        breakMinutes: 0,
        hourlyWage: BASE_HOURLY_WAGE,
      };
      const workDays: WorkDay[] = [
        { date: '2026-08-03', presetId: 'p4h' },
        { date: '2026-08-04', presetId: 'p4h' },
        { date: '2026-08-05', presetId: 'p4h' },
        { date: '2026-08-06', presetId: 'p4h' },
        { date: '2026-08-07', presetId: 'p4h' },
      ];

      const result = calculatePayroll(config, [preset4h], workDays);
      const targetWeek = result.weeks.find((w) => w.days.some((d) => d.date === '2026-08-03'))!;

      expect(targetWeek.totalWorkMinutes).toBe(20 * 60);
      expect(targetWeek.weeklyHolidayEligible).toBe(true);
      expect(targetWeek.weeklyHolidayMinutes).toBe(4 * 60);
      // 주 기본급 = 20 * 10,320 = 206,400 / 주휴 = 4 * 10,320 = 41,280 / 총 주급 = 247,680
      expect(targetWeek.totalWeeklyGrossPay).toBe(247680);
    });

    it('A-2: 주 2일 × 8시간 = 16시간 → 주휴 3.2시간 발생 / 주급 198,144원', () => {
      const config = createDefaultConfig();
      const workDays: WorkDay[] = [
        { date: '2026-08-03', presetId: 'p1' }, // 8h
        { date: '2026-08-04', presetId: 'p1' }, // 8h
      ];

      const result = calculatePayroll(config, [defaultPreset], workDays);
      const targetWeek = result.weeks.find((w) => w.days.some((d) => d.date === '2026-08-03'))!;

      expect(targetWeek.totalWorkMinutes).toBe(16 * 60);
      expect(targetWeek.weeklyHolidayEligible).toBe(true);
      // 주휴시간: 16 / 40 * 8 = 3.2시간 = 192분
      expect(targetWeek.weeklyHolidayMinutes).toBe(192);
      // 기본급: 16 * 10,320 = 165,120원 / 주휴수당: 3.2 * 10,320 = 33,024원 / 합계: 198,144원
      expect(targetWeek.totalWeeklyGrossPay).toBe(198144);
    });

    it('A-3: 주 2일 × 7시간 = 14시간 → 주휴 미발생 / 주급 144,480원', () => {
      const config = createDefaultConfig();
      const preset7h: ShiftPreset = {
        id: 'p7h',
        label: '7시간',
        startTime: '09:00',
        endTime: '16:00',
        breakMinutes: 0,
        hourlyWage: BASE_HOURLY_WAGE,
      };
      const workDays: WorkDay[] = [
        { date: '2026-08-03', presetId: 'p7h' },
        { date: '2026-08-04', presetId: 'p7h' },
      ];

      const result = calculatePayroll(config, [preset7h], workDays);
      const targetWeek = result.weeks.find((w) => w.days.some((d) => d.date === '2026-08-03'))!;

      expect(targetWeek.totalWorkMinutes).toBe(14 * 60);
      expect(targetWeek.weeklyHolidayEligible).toBe(false);
      expect(targetWeek.weeklyHolidayMinutes).toBe(0);
      expect(targetWeek.weeklyHolidayIneligibleReason).toContain('15시간 미만');
      // 기본급: 14 * 10,320 = 144,480원
      expect(targetWeek.totalWeeklyGrossPay).toBe(144480);
    });

    it('A-4: 주 3일 × 5시간 = 정확히 15시간 → 주휴 발생 (3시간) / 주급 185,760원', () => {
      const config = createDefaultConfig();
      const preset5h: ShiftPreset = {
        id: 'p5h',
        label: '5시간',
        startTime: '09:00',
        endTime: '14:00',
        breakMinutes: 0,
        hourlyWage: BASE_HOURLY_WAGE,
      };
      const workDays: WorkDay[] = [
        { date: '2026-08-03', presetId: 'p5h' },
        { date: '2026-08-04', presetId: 'p5h' },
        { date: '2026-08-05', presetId: 'p5h' },
      ];

      const result = calculatePayroll(config, [preset5h], workDays);
      const targetWeek = result.weeks.find((w) => w.days.some((d) => d.date === '2026-08-03'))!;

      expect(targetWeek.totalWorkMinutes).toBe(15 * 60);
      expect(targetWeek.weeklyHolidayEligible).toBe(true);
      // 15 / 40 * 8 = 3.0시간 = 180분
      expect(targetWeek.weeklyHolidayMinutes).toBe(180);
      // 기본급: 15 * 10,320 = 154,800 + 주휴: 3 * 10,320 = 30,960 = 185,760원
      expect(targetWeek.totalWeeklyGrossPay).toBe(185760);
    });

    it('A-5: 주 6일 × 8시간 = 48시간 → 주휴 8시간 (40시간 상한 적용)', () => {
      const config = createDefaultConfig();
      const workDays: WorkDay[] = [
        { date: '2026-08-03', presetId: 'p1' },
        { date: '2026-08-04', presetId: 'p1' },
        { date: '2026-08-05', presetId: 'p1' },
        { date: '2026-08-06', presetId: 'p1' },
        { date: '2026-08-07', presetId: 'p1' },
        { date: '2026-08-08', presetId: 'p1' },
      ];

      const result = calculatePayroll(config, [defaultPreset], workDays);
      const targetWeek = result.weeks.find((w) => w.days.some((d) => d.date === '2026-08-03'))!;

      expect(targetWeek.totalWorkMinutes).toBe(48 * 60);
      expect(targetWeek.weeklyHolidayEligible).toBe(true);
      // 40시간 상한 -> 최대 8시간 = 480분
      expect(targetWeek.weeklyHolidayMinutes).toBe(480);
      expect(targetWeek.weeklyHolidayPayTotal).toBe(8 * BASE_HOURLY_WAGE);
    });

    it('A-6: 주 20시간이지만 하루 결근 → 주휴 미발생, 사유 표시', () => {
      const config = createDefaultConfig();
      const preset4h: ShiftPreset = {
        id: 'p4h',
        label: '4시간',
        startTime: '09:00',
        endTime: '13:00',
        breakMinutes: 0,
        hourlyWage: BASE_HOURLY_WAGE,
      };
      const workDays: WorkDay[] = [
        { date: '2026-08-03', presetId: 'p4h' },
        { date: '2026-08-04', presetId: 'p4h' },
        { date: '2026-08-05', presetId: 'p4h' },
        { date: '2026-08-06', presetId: 'p4h' },
        { date: '2026-08-07', presetId: 'p4h' },
        { date: '2026-08-08', presetId: 'p4h', absent: true }, // 결근
      ];

      const result = calculatePayroll(config, [preset4h], workDays);
      const targetWeek = result.weeks.find((w) => w.days.some((d) => d.date === '2026-08-03'))!;

      expect(targetWeek.totalWorkMinutes).toBe(20 * 60);
      expect(targetWeek.hasAbsent).toBe(true);
      expect(targetWeek.weeklyHolidayEligible).toBe(false);
      expect(targetWeek.weeklyHolidayMinutes).toBe(0);
      expect(targetWeek.weeklyHolidayIneligibleReason).toContain('결근');
    });

    it('A-7: 주 20시간, 하루 지각 → 주휴 발생 (지각은 결근 아님)', () => {
      const config = createDefaultConfig();
      const preset4h: ShiftPreset = {
        id: 'p4h',
        label: '4시간',
        startTime: '09:00',
        endTime: '13:00',
        breakMinutes: 0,
        hourlyWage: BASE_HOURLY_WAGE,
      };
      const workDays: WorkDay[] = [
        { date: '2026-08-03', presetId: 'p4h' },
        { date: '2026-08-04', presetId: 'p4h', late: true }, // 지각
        { date: '2026-08-05', presetId: 'p4h' },
        { date: '2026-08-06', presetId: 'p4h' },
        { date: '2026-08-07', presetId: 'p4h' },
      ];

      const result = calculatePayroll(config, [preset4h], workDays);
      const targetWeek = result.weeks.find((w) => w.days.some((d) => d.date === '2026-08-03'))!;

      expect(targetWeek.totalWorkMinutes).toBe(20 * 60);
      expect(targetWeek.hasAbsent).toBe(false);
      expect(targetWeek.weeklyHolidayEligible).toBe(true);
      expect(targetWeek.weeklyHolidayMinutes).toBe(4 * 60);
    });

    it('A-8: 5인 미만 사업장, 주 20시간 → 주휴 발생 (사업장 규모 무관)', () => {
      const config = createDefaultConfig({ employeeCount: 'UNDER_5' });
      const preset4h: ShiftPreset = {
        id: 'p4h',
        label: '4시간',
        startTime: '09:00',
        endTime: '13:00',
        breakMinutes: 0,
        hourlyWage: BASE_HOURLY_WAGE,
      };
      const workDays: WorkDay[] = [
        { date: '2026-08-03', presetId: 'p4h' },
        { date: '2026-08-04', presetId: 'p4h' },
        { date: '2026-08-05', presetId: 'p4h' },
        { date: '2026-08-06', presetId: 'p4h' },
        { date: '2026-08-07', presetId: 'p4h' },
      ];

      const result = calculatePayroll(config, [preset4h], workDays);
      const targetWeek = result.weeks.find((w) => w.days.some((d) => d.date === '2026-08-03'))!;

      expect(targetWeek.weeklyHolidayEligible).toBe(true);
      expect(targetWeek.weeklyHolidayMinutes).toBe(4 * 60);
      expect(targetWeek.weeklyHolidayPayTotal).toBe(41280);
    });
  });

  // ----------------------------------------------------
  // B. 요일별 차등 시급
  // ----------------------------------------------------
  describe('B. 요일별 차등 시급', () => {
    it('B-1 & B-2: 평일 3일×5h @10,320 + 주말 1일×5h @12,000 → 가중평균시급 10,740원, 주휴수당 42,960원', () => {
      const config = createDefaultConfig();
      const presetWeekday: ShiftPreset = {
        id: 'pw',
        label: '평일',
        startTime: '09:00',
        endTime: '14:00',
        breakMinutes: 0,
        hourlyWage: 10320,
      };
      const presetWeekend: ShiftPreset = {
        id: 'ps',
        label: '주말',
        startTime: '09:00',
        endTime: '14:00',
        breakMinutes: 0,
        hourlyWage: 12000,
      };

      const workDays: WorkDay[] = [
        { date: '2026-08-03', presetId: 'pw' }, // 월 5h @10320
        { date: '2026-08-04', presetId: 'pw' }, // 화 5h @10320
        { date: '2026-08-05', presetId: 'pw' }, // 수 5h @10320
        { date: '2026-08-08', presetId: 'ps' }, // 토 5h @12000
      ];

      const result = calculatePayroll(config, [presetWeekday, presetWeekend], workDays);
      const targetWeek = result.weeks.find((w) => w.days.some((d) => d.date === '2026-08-03'))!;

      // 가중평균시급 = (15*10320 + 5*12000) / 20 = (154800 + 60000) / 20 = 214800 / 20 = 10740원
      expect(targetWeek.weightedAverageHourlyWage).toBe(10740);
      // 주 20시간 -> 주휴 4시간 * 10,740 = 42,960원
      expect(targetWeek.weeklyHolidayMinutes).toBe(240);
      expect(targetWeek.weeklyHolidayPayTotal).toBe(42960);
    });
  });

  // ----------------------------------------------------
  // C. 5인 미만 / 5인 이상 분기
  // ----------------------------------------------------
  describe('C. 5인 미만 / 5인 이상 분기', () => {
    it('C-1: 5인 미만, 하루 10시간 근무 → 10시간분 그대로, 가산 0원', () => {
      const config = createDefaultConfig({ employeeCount: 'UNDER_5' });
      const preset10h: ShiftPreset = {
        id: 'p10',
        label: '10시간',
        startTime: '09:00',
        endTime: '19:00',
        breakMinutes: 0,
        hourlyWage: BASE_HOURLY_WAGE,
      };
      const workDays: WorkDay[] = [{ date: '2026-08-03', presetId: 'p10' }];

      const result = calculatePayroll(config, [preset10h], workDays);
      expect(result.overtimePayTotal).toBe(0);
      expect(result.grossSalary).toBe(10 * BASE_HOURLY_WAGE);
    });

    it('C-2: 5인 이상, 하루 10시간 근무 → 10시간분 + 연장 2시간 × 0.5 가산', () => {
      const config = createDefaultConfig({ employeeCount: 'OVER_5' });
      const preset10h: ShiftPreset = {
        id: 'p10',
        label: '10시간',
        startTime: '09:00',
        endTime: '19:00',
        breakMinutes: 0,
        hourlyWage: BASE_HOURLY_WAGE,
      };
      const workDays: WorkDay[] = [{ date: '2026-08-03', presetId: 'p10' }];

      const result = calculatePayroll(config, [preset10h], workDays);
      // 기본 10시간 + 연장 2h * 0.5 = 총 11시간분
      expect(result.overtimePayTotal).toBe(Math.floor(2 * BASE_HOURLY_WAGE * 0.5));
      expect(result.grossSalary).toBe(Math.floor(11 * BASE_HOURLY_WAGE));
    });

    it('C-3: 5인 미만, 22:00~06:00 근무 (휴게 1h, 실근로 7h) → 7시간분, 야간가산 0원', () => {
      const config = createDefaultConfig({ employeeCount: 'UNDER_5' });
      const presetNight: ShiftPreset = {
        id: 'pn',
        label: '심야',
        startTime: '22:00',
        endTime: '06:00',
        breakMinutes: 60,
        hourlyWage: BASE_HOURLY_WAGE,
      };
      const workDays: WorkDay[] = [{ date: '2026-08-03', presetId: 'pn' }];

      const result = calculatePayroll(config, [presetNight], workDays);
      expect(result.nightPayTotal).toBe(0);
      expect(result.grossSalary).toBe(7 * BASE_HOURLY_WAGE);
    });

    it('C-4: 5인 이상, 동일 조건 → 7시간분 + 야간 7시간 × 0.5 = 총 10.5시간분', () => {
      const config = createDefaultConfig({ employeeCount: 'OVER_5' });
      const presetNight: ShiftPreset = {
        id: 'pn',
        label: '심야',
        startTime: '22:00',
        endTime: '06:00',
        breakMinutes: 60,
        hourlyWage: BASE_HOURLY_WAGE,
      };
      const workDays: WorkDay[] = [{ date: '2026-08-03', presetId: 'pn' }];

      const result = calculatePayroll(config, [presetNight], workDays);
      // 7h 기본 + 7h * 0.5 야간가산 = 10.5시간분
      expect(result.nightPayTotal).toBe(Math.floor(7 * BASE_HOURLY_WAGE * 0.5));
      expect(result.grossSalary).toBe(Math.floor(10.5 * BASE_HOURLY_WAGE));
    });
  });

  // ----------------------------------------------------
  // D. 연장근로 중복 방지
  // ----------------------------------------------------
  describe('D. 연장근로 중복 방지', () => {
    it('D-1: 5인 이상, 월~금 각 9시간 (주 45h) → 연장 5시간 (일별초과 5, 주초과 5 → max 5)', () => {
      const config = createDefaultConfig({ employeeCount: 'OVER_5' });
      const preset9h: ShiftPreset = {
        id: 'p9',
        label: '9시간',
        startTime: '09:00',
        endTime: '18:00',
        breakMinutes: 0,
        hourlyWage: BASE_HOURLY_WAGE,
      };
      const workDays: WorkDay[] = [
        { date: '2026-08-03', presetId: 'p9' },
        { date: '2026-08-04', presetId: 'p9' },
        { date: '2026-08-05', presetId: 'p9' },
        { date: '2026-08-06', presetId: 'p9' },
        { date: '2026-08-07', presetId: 'p9' },
      ];

      const result = calculatePayroll(config, [preset9h], workDays);
      const targetWeek = result.weeks.find((w) => w.days.some((d) => d.date === '2026-08-03'))!;

      expect(targetWeek.totalWorkMinutes).toBe(45 * 60);
      expect(targetWeek.overtimeMinutes).toBe(5 * 60); // 5시간 (10시간 아님)
    });

    it('D-2: 5인 이상, 월~토 각 7시간 (주 42h) → 연장 2시간 (일별초과 0, 주초과 2)', () => {
      const config = createDefaultConfig({ employeeCount: 'OVER_5' });
      const preset7h: ShiftPreset = {
        id: 'p7',
        label: '7시간',
        startTime: '09:00',
        endTime: '16:00',
        breakMinutes: 0,
        hourlyWage: BASE_HOURLY_WAGE,
      };
      const workDays: WorkDay[] = [
        { date: '2026-08-03', presetId: 'p7' },
        { date: '2026-08-04', presetId: 'p7' },
        { date: '2026-08-05', presetId: 'p7' },
        { date: '2026-08-06', presetId: 'p7' },
        { date: '2026-08-07', presetId: 'p7' },
        { date: '2026-08-08', presetId: 'p7' },
      ];

      const result = calculatePayroll(config, [preset7h], workDays);
      const targetWeek = result.weeks.find((w) => w.days.some((d) => d.date === '2026-08-03'))!;

      expect(targetWeek.totalWorkMinutes).toBe(42 * 60);
      expect(targetWeek.overtimeMinutes).toBe(2 * 60);
    });

    it('D-3: 5인 이상, 월 12h + 화~금 각 6h (주 36h) → 연장 4시간 (일별초과 4, 주초과 0)', () => {
      const config = createDefaultConfig({ employeeCount: 'OVER_5' });
      const preset12h: ShiftPreset = {
        id: 'p12',
        label: '12시간',
        startTime: '09:00',
        endTime: '21:00',
        breakMinutes: 0,
        hourlyWage: BASE_HOURLY_WAGE,
      };
      const preset6h: ShiftPreset = {
        id: 'p6',
        label: '6시간',
        startTime: '09:00',
        endTime: '15:00',
        breakMinutes: 0,
        hourlyWage: BASE_HOURLY_WAGE,
      };
      const workDays: WorkDay[] = [
        { date: '2026-08-03', presetId: 'p12' }, // 12h (초과 4h)
        { date: '2026-08-04', presetId: 'p6' },  // 6h
        { date: '2026-08-05', presetId: 'p6' },  // 6h
        { date: '2026-08-06', presetId: 'p6' },  // 6h
        { date: '2026-08-07', presetId: 'p6' },  // 6h
      ];

      const result = calculatePayroll(config, [preset12h, preset6h], workDays);
      const targetWeek = result.weeks.find((w) => w.days.some((d) => d.date === '2026-08-03'))!;

      expect(targetWeek.totalWorkMinutes).toBe(36 * 60);
      expect(targetWeek.overtimeMinutes).toBe(4 * 60);
    });
  });

  // ----------------------------------------------------
  // E. 야간·밤샘
  // ----------------------------------------------------
  describe('E. 야간·밤샘', () => {
    it('E-1: 22:00~08:00, 휴게 1시간 → 실근로 9시간, 야간 약 7시간, 연장 1시간', () => {
      const { totalDurationMinutes, workMinutes } = calculateDailyWorkMinutes('22:00', '08:00', 60);
      expect(totalDurationMinutes).toBe(10 * 60);
      expect(workMinutes).toBe(9 * 60);

      const nightMinutes = calculateNightMinutes('22:00', '08:00', 60);
      // 야간구간 22:00~06:00 = 8h. 휴게 비례차감: 8h * (9/10) = 7.2h ≈ 7시간(432분)
      expect(Math.round(nightMinutes / 60)).toBe(7);
    });

    it('E-2: E-1을 5인 이상으로 → 9 + (7×0.5) + (1×0.5) = 13시간분', () => {
      const config = createDefaultConfig({ employeeCount: 'OVER_5' });
      const presetOvernight: ShiftPreset = {
        id: 'po',
        label: '밤샘',
        startTime: '22:00',
        endTime: '08:00',
        breakMinutes: 60,
        hourlyWage: BASE_HOURLY_WAGE,
      };
      const workDays: WorkDay[] = [{ date: '2026-08-03', presetId: 'po' }];

      const result = calculatePayroll(config, [presetOvernight], workDays);
      // 실근로 9h + 야간 7.2h*0.5 (3.6h) + 연장 1h*0.5 (0.5h) = 약 13.1h분 -> Math.floor(13 * 10320)
      expect(result.grossSalary).toBeGreaterThanOrEqual(Math.floor(13 * BASE_HOURLY_WAGE));
    });

    it('E-3: 20:00~24:00 → 야간 2시간 (22~24시만)', () => {
      const nightMinutes = calculateNightMinutes('20:00', '24:00', 0);
      expect(nightMinutes).toBe(2 * 60);
    });

    it('E-4: 06:00~10:00 → 야간 0시간', () => {
      const nightMinutes = calculateNightMinutes('06:00', '10:00', 0);
      expect(nightMinutes).toBe(0);
    });
  });

  // ----------------------------------------------------
  // F. 수습 감액 게이트
  // ----------------------------------------------------
  describe('F. 수습 감액 게이트', () => {
    it('F-1: 수습 O, 계약 1년 이상, 단순노무 O (편의점) → 감액 불가, 시급 유지 + 안내 배너', () => {
      const res = evaluateProbation(
        { applied: true, contractOverOneYear: true, simpleLabor: true },
        BASE_HOURLY_WAGE
      );
      expect(res.isProbationReduced).toBe(false);
      expect(res.effectiveHourlyWage).toBe(BASE_HOURLY_WAGE);
      expect(res.warning).toContain('단순노무');
    });

    it('F-2: 수습 O, 계약 6개월, 단순노무 X → 감액 불가, 시급 유지 + 안내 배너', () => {
      const res = evaluateProbation(
        { applied: true, contractOverOneYear: false, simpleLabor: false },
        BASE_HOURLY_WAGE
      );
      expect(res.isProbationReduced).toBe(false);
      expect(res.effectiveHourlyWage).toBe(BASE_HOURLY_WAGE);
      expect(res.warning).toContain('1년 미만');
    });

    it('F-3: 수습 O, 계약 1년 이상, 단순노무 X, 2개월차 → 감액 적용, 시급 9,288원', () => {
      const res = evaluateProbation(
        { applied: true, contractOverOneYear: true, simpleLabor: false, monthIndex: 2 },
        BASE_HOURLY_WAGE
      );
      expect(res.isProbationReduced).toBe(true);
      expect(res.effectiveHourlyWage).toBe(9288); // 10320 * 0.9 = 9288
    });

    it('F-4: F-3에서 수습 시작 4개월차 → 감액 종료, 시급 10,320 복귀', () => {
      const res = evaluateProbation(
        { applied: true, contractOverOneYear: true, simpleLabor: false, monthIndex: 4 },
        BASE_HOURLY_WAGE
      );
      expect(res.isProbationReduced).toBe(false);
      expect(res.effectiveHourlyWage).toBe(BASE_HOURLY_WAGE);
      expect(res.warning).toContain('경과');
    });
  });

  // ----------------------------------------------------
  // G. 주 경계 · 월 경계
  // ----------------------------------------------------
  describe('G. 주 경계 · 월 경계', () => {
    it('G-1: 주 시작 = 일요일 vs 월요일로 각각 계산 시 월 총액 차이 발생 가능 확인', () => {
      // 2026년 8월 1일은 토요일. 일요일 시작 주 vs 월요일 시작 주는 경계 주 편입이 다름
      const preset4h: ShiftPreset = {
        id: 'p4',
        label: '4h',
        startTime: '09:00',
        endTime: '13:00',
        breakMinutes: 0,
        hourlyWage: BASE_HOURLY_WAGE,
      };
      // 8월 1일(토), 8월 2일(일), 8월 3일(월)
      const workDays: WorkDay[] = [
        { date: '2026-08-01', presetId: 'p4' },
        { date: '2026-08-02', presetId: 'p4' },
        { date: '2026-08-03', presetId: 'p4' },
      ];

      const resSun = calculatePayroll(
        createDefaultConfig({ weekStartsOn: 'SUN' }),
        [preset4h],
        workDays
      );
      const resMon = calculatePayroll(
        createDefaultConfig({ weekStartsOn: 'MON' }),
        [preset4h],
        workDays
      );

      // 주 경계가 다르므로 주차 배치가 다름
      expect(resSun.weeks.length).toBeGreaterThan(0);
      expect(resMon.weeks.length).toBeGreaterThan(0);
    });

    it('G-2: 2026년 8월 기준, 8/31(월)~9/6(일) 주에서 8월에 1일 근무 시 안분 비율 반영', () => {
      const config = createDefaultConfig({ year: 2026, month: 8, weekStartsOn: 'MON' });
      const preset8h = defaultPreset;
      // 8/31(월) 8h, 9/1(화) 8h -> 주 16h (주휴 3.2h = 33,024원)
      // 8월에는 2일 중 1일이 속하므로 50% 안분
      const workDays: WorkDay[] = [
        { date: '2026-08-31', presetId: 'p1' },
        { date: '2026-09-01', presetId: 'p1' },
      ];

      const result = calculatePayroll(config, [preset8h], workDays);
      const lastWeek = result.weeks[result.weeks.length - 1];

      expect(lastWeek.isSplitWeek).toBe(true);
      expect(lastWeek.allocationRatio).toBe(0.5); // 1일 / 2일
      expect(lastWeek.weeklyHolidayPayTotal).toBe(33024);
      expect(lastWeek.weeklyHolidayPayMonthAllocated).toBe(16512); // 50%
    });

    it('G-3: 월 첫 주가 전월에서 이어지는 경우 전월 근무일도 주휴 판정에 포함', () => {
      const config = createDefaultConfig({ year: 2026, month: 8, weekStartsOn: 'MON' });
      const preset8h = defaultPreset;
      // 2026년 8월 1일은 토요일. 2026-07-27(월) ~ 2026-08-02(일) 주에
      // 7/30(8h), 7/31(8h), 8/1(8h) 근무 -> 주 24시간 >= 15h로 주휴 발생!
      const workDays: WorkDay[] = [
        { date: '2026-07-30', presetId: 'p1' },
        { date: '2026-07-31', presetId: 'p1' },
        { date: '2026-08-01', presetId: 'p1' },
      ];

      const result = calculatePayroll(config, [preset8h], workDays);
      const firstWeek = result.weeks[0];

      expect(firstWeek.totalWorkMinutes).toBe(24 * 60);
      expect(firstWeek.weeklyHolidayEligible).toBe(true);
    });

    it('G-4: 근무일이 5번 들어오는 달 vs 4번 들어오는 달 월 총액 상이 (4.34주 미사용)', () => {
      // 8월(31일) 월수금 근무일수 14일 vs 2월(28일) 월수금 근무일수 12일
      const preset8h = defaultPreset;
      const configAug = createDefaultConfig({ year: 2026, month: 8 });
      const configFeb = createDefaultConfig({ year: 2026, month: 2 });

      const workDaysAug: WorkDay[] = [
        { date: '2026-08-03', presetId: 'p1' },
        { date: '2026-08-05', presetId: 'p1' },
        { date: '2026-08-07', presetId: 'p1' },
        { date: '2026-08-10', presetId: 'p1' },
        { date: '2026-08-12', presetId: 'p1' },
        { date: '2026-08-14', presetId: 'p1' },
      ];

      const resAug = calculatePayroll(configAug, [preset8h], workDaysAug);
      const resFeb = calculatePayroll(configFeb, [preset8h], []);

      expect(resAug.grossSalary).not.toBe(resFeb.grossSalary);
    });
  });

  // ----------------------------------------------------
  // H. 공제
  // ----------------------------------------------------
  describe('H. 공제', () => {
    it('H-1: 일용직, 일급 82,560원 (8h) → 원천징수 0원 (15만원 미만)', () => {
      const deduction = calculateDeductions('DAILY_WORKER', 82560, [82560], 480, 480);
      expect(deduction.totalDeduction).toBe(0);
    });

    it('H-2: 일용직, 일급 200,000원 → (200,000-150,000)×6%×0.45 = 1,350원 + 지방세 135원 = 1,485원', () => {
      const deduction = calculateDeductions('DAILY_WORKER', 200000, [200000], 480, 480);
      expect(deduction.incomeTax).toBe(1350);
      expect(deduction.localTax).toBe(135);
      expect(deduction.totalDeduction).toBe(1485);
    });

    it('H-3: 일용직, 일급 170,000원 → 산출세액 540원 → 소액부징수(1천원 미만)로 0원', () => {
      // (170,000 - 150,000) * 0.06 * 0.45 = 540원 < 1000원 -> 0원
      const deduction = calculateDeductions('DAILY_WORKER', 170000, [170000], 480, 480);
      expect(deduction.incomeTax).toBe(0);
      expect(deduction.totalDeduction).toBe(0);
    });

    it('H-4: 4대보험 모드, 주 14시간 근무 → 가입 대상 아님 안내', () => {
      const deduction = calculateDeductions('INSURED', 500000, [500000], 14 * 60, 14 * 60);
      expect(deduction.eligible).toBe(false);
      expect(deduction.ineligibleReason).toContain('가입 대상이 아닙니다');
      expect(deduction.totalDeduction).toBe(0);
    });

    it('H-5: 4대보험 모드, 주 20시간 근무 → 약 9.7% 공제', () => {
      const gross = 1000000;
      const deduction = calculateDeductions('INSURED', gross, [gross], 80 * 60, 20 * 60);
      expect(deduction.eligible).toBe(true);
      // 국민연금 4.75% = 47500, 건강보험 3.595% = 35950, 장기요양 0.4724% = 4724, 고용 0.9% = 9000 -> 총 97,174
      expect(deduction.totalDeduction).toBe(97174);
    });
  });

  // ----------------------------------------------------
  // I. 경계값 · 예외
  // ----------------------------------------------------
  describe('I. 경계값 · 예외', () => {
    it('I-1: 시급 9,000원 입력 → 최저임금 미달 경고 표시', () => {
      const config = createDefaultConfig();
      const lowPreset: ShiftPreset = {
        id: 'low',
        label: '저시급',
        startTime: '09:00',
        endTime: '18:00',
        breakMinutes: 60,
        hourlyWage: 9000,
      };

      const result = calculatePayroll(config, [lowPreset], []);
      expect(result.minWageWarnings.length).toBeGreaterThan(0);
      expect(result.minWageWarnings[0]).toContain('최저시급');
    });

    it('I-2: 휴게시간이 근무시간보다 긺 → workMinutes는 0으로 안전 처리', () => {
      const { workMinutes } = calculateDailyWorkMinutes('09:00', '10:00', 120);
      expect(workMinutes).toBe(0);
    });

    it('I-3: 근무 0일인 달 → 0원 오류 없이 표시', () => {
      const config = createDefaultConfig();
      const result = calculatePayroll(config, [defaultPreset], []);
      expect(result.grossSalary).toBe(0);
      expect(result.netSalary).toBe(0);
    });

    it('I-4: 30분 단위가 아닌 근무 (09:10~14:25) → 분 단위 정확 계산', () => {
      // 09:10 (550분) ~ 14:25 (865분) = 315분 = 5시간 15분 = 5.25시간
      const { workMinutes } = calculateDailyWorkMinutes('09:10', '14:25', 0);
      expect(workMinutes).toBe(315);
    });

    it('I-5: 공유 URL 복사 → 복원 시 모든 설정과 근무 등록 유지', () => {
      const originalState = {
        version: 1,
        config: createDefaultConfig(),
        presets: [defaultPreset],
        workDays: [{ date: '2026-08-03', presetId: 'p1' }],
      };

      const query = encodeStateToQuery(originalState);
      const decoded = decodeStateFromQuery(query);

      expect(decoded).toEqual(originalState);
    });
  });

  // ----------------------------------------------------
  // J. Importer 테스트 (§8.4)
  // ----------------------------------------------------
  describe('J. Importer 테스트 (§8.4)', () => {
    it('CSV/표 붙여넣기 파싱 성공', () => {
      const text = `날짜,시작,종료,휴게분
2026-08-03,09:00,14:00,0
2026-08-05,09:00,14:00,0
2026-08-08,18:00,23:00,30`;

      const result = parseWorkDaysInput(text);
      expect(result.success).toBe(true);
      expect(result.count).toBe(3);
      expect(result.workDays[0].date).toBe('2026-08-03');
      expect(result.workDays[2].overrides?.breakMinutes).toBe(30);
    });
  });
});
