/**
 * 연도별 최저시급 설정
 * 최저시급은 코드에 하드코딩하지 않고 본 파일에서 일괄 관리합니다.
 */
export const MINIMUM_WAGE: Record<number, number> = {
  2024: 9860,
  2025: 10030,
  2026: 10320,
};

export const DEFAULT_YEAR = 2026;
export const DEFAULT_MINIMUM_WAGE = MINIMUM_WAGE[DEFAULT_YEAR];

/**
 * 특정 연도의 법정 최저시급 조회
 */
export function getMinimumWage(year: number): number {
  if (MINIMUM_WAGE[year]) {
    return MINIMUM_WAGE[year];
  }
  const years = Object.keys(MINIMUM_WAGE).map(Number).sort((a, b) => a - b);
  if (year > years[years.length - 1]) {
    return MINIMUM_WAGE[years[years.length - 1]];
  }
  if (year < years[0]) {
    return MINIMUM_WAGE[years[0]];
  }
  return DEFAULT_MINIMUM_WAGE;
}
