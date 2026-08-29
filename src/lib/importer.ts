import { WorkDay } from '../types/payroll';

export interface ImportResult {
  success: boolean;
  workDays: WorkDay[];
  count: number;
  errors: string[];
}

/**
 * CSV, TSV (엑셀/구글시트 복사본), 또는 JSON 형태의 근무 기록 텍스트를 파싱
 */
export function parseWorkDaysInput(text: string): ImportResult {
  const trimmed = text.trim();
  if (!trimmed) {
    return { success: false, workDays: [], count: 0, errors: ['입력된 내용이 없습니다.'] };
  }

  // JSON 형식인지 시도
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    try {
      const parsed = JSON.parse(trimmed);
      const days = Array.isArray(parsed) ? parsed : parsed.days;
      if (Array.isArray(days)) {
        const resultDays: WorkDay[] = [];
        for (const item of days) {
          if (!item.date) continue;
          resultDays.push({
            date: String(item.date).trim(),
            overrides: {
              startTime: item.start || item.startTime || '09:00',
              endTime: item.end || item.endTime || '18:00',
              breakMinutes: Number(item.breakMinutes ?? item.break ?? 0),
              hourlyWage: item.hourlyWage ? Number(item.hourlyWage) : undefined,
            },
            absent: Boolean(item.absent),
            late: Boolean(item.late),
            isHoliday: Boolean(item.isHoliday || item.holiday),
          });
        }
        return {
          success: true,
          workDays: resultDays,
          count: resultDays.length,
          errors: [],
        };
      }
    } catch {
      // JSON 파싱 실패 시 표 파서로 계속 진행
    }
  }

  // 줄 단위 분리
  const lines = trimmed
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length === 0) {
    return { success: false, workDays: [], count: 0, errors: ['유효한 데이터 행이 없습니다.'] };
  }

  // 구분자 판별 (탭 우선, 그 다음 콤마, 세미콜론)
  const firstLine = lines[0];
  let delimiter = ',';
  if (firstLine.includes('\t')) delimiter = '\t';
  else if (firstLine.includes(';')) delimiter = ';';

  // 헤더 검사
  const headerTokens = firstLine.split(delimiter).map((t) => t.trim().toLowerCase());
  let dateIdx = -1;
  let startIdx = -1;
  let endIdx = -1;
  let breakIdx = -1;
  let wageIdx = -1;
  let absentIdx = -1;
  let holidayIdx = -1;

  let hasHeader = false;
  for (let i = 0; i < headerTokens.length; i++) {
    const col = headerTokens[i];
    if (col === '날짜' || col === 'date' || col === '일자') {
      dateIdx = i;
      hasHeader = true;
    } else if (col === '시작' || col === 'start' || col === '시작시각' || col === 'starttime' || col === '출근') {
      startIdx = i;
      hasHeader = true;
    } else if (col === '종료' || col === 'end' || col === '종료시각' || col === 'endtime' || col === '퇴근') {
      endIdx = i;
      hasHeader = true;
    } else if (col === '휴게' || col === '휴게분' || col === 'break' || col === 'breakminutes' || col === '휴게시간') {
      breakIdx = i;
      hasHeader = true;
    } else if (col === '시급' || col === 'wage' || col === 'hourlywage') {
      wageIdx = i;
      hasHeader = true;
    } else if (col === '결근' || col === 'absent') {
      absentIdx = i;
      hasHeader = true;
    } else if (col === '휴일' || col === 'holiday' || col === '유급휴일') {
      holidayIdx = i;
      hasHeader = true;
    }
  }

  const dataLines = hasHeader ? lines.slice(1) : lines;
  if (!hasHeader) {
    // 기본 열 순서: 날짜, 시작, 종료, 휴게, 시급
    dateIdx = 0;
    startIdx = 1;
    endIdx = 2;
    breakIdx = 3;
    wageIdx = 4;
  }

  const resultDays: WorkDay[] = [];
  const errors: string[] = [];

  for (let rowNum = 0; rowNum < dataLines.length; rowNum++) {
    const line = dataLines[rowNum];
    const tokens = line.split(delimiter).map((t) => t.trim());
    if (tokens.length === 0 || !tokens[0]) continue;

    const rawDate = dateIdx >= 0 && dateIdx < tokens.length ? tokens[dateIdx] : '';
    // YYYY-MM-DD 또는 YYYY.MM.DD 정규화
    const dateMatch = rawDate.replace(/\./g, '-').match(/\d{4}-\d{1,2}-\d{1,2}/);
    if (!dateMatch) {
      errors.push(`행 ${rowNum + 1}: 올바른 날짜 형식(YYYY-MM-DD)이 아닙니다 (${rawDate})`);
      continue;
    }

    const [y, m, d] = dateMatch[0].split('-');
    const normalizedDate = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;

    const startTime = startIdx >= 0 && startIdx < tokens.length && tokens[startIdx] ? tokens[startIdx] : '09:00';
    const endTime = endIdx >= 0 && endIdx < tokens.length && tokens[endIdx] ? tokens[endIdx] : '18:00';
    const breakMinutes = breakIdx >= 0 && breakIdx < tokens.length ? parseInt(tokens[breakIdx], 10) || 0 : 0;
    const hourlyWage = wageIdx >= 0 && wageIdx < tokens.length && tokens[wageIdx] ? parseInt(tokens[wageIdx], 10) : undefined;
    const absent = absentIdx >= 0 && absentIdx < tokens.length ? (tokens[absentIdx] === '1' || tokens[absentIdx] === 'true' || tokens[absentIdx] === '결근' || tokens[absentIdx] === 'O') : false;
    const isHoliday = holidayIdx >= 0 && holidayIdx < tokens.length ? (tokens[holidayIdx] === '1' || tokens[holidayIdx] === 'true' || tokens[holidayIdx] === '휴일' || tokens[holidayIdx] === 'O') : false;

    resultDays.push({
      date: normalizedDate,
      overrides: {
        startTime,
        endTime,
        breakMinutes,
        hourlyWage,
      },
      absent,
      isHoliday,
    });
  }

  return {
    success: resultDays.length > 0,
    workDays: resultDays,
    count: resultDays.length,
    errors,
  };
}
