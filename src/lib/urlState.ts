import { Config, ShiftPreset, WorkDay } from '../types/payroll';

export interface AppStatePayload {
  version: number;
  config: Config;
  presets: ShiftPreset[];
  workDays: WorkDay[];
}

/**
 * 상태 객체를 URL에 안전한 Base64 문자열로 인코딩
 */
export function encodeStateToQuery(state: AppStatePayload): string {
  try {
    const jsonStr = JSON.stringify(state);
    // UTF-8 안전한 Base64 인코딩
    const encoded = encodeURIComponent(jsonStr);
    const base64 = btoa(encoded);
    return base64;
  } catch (err) {
    console.error('Failed to encode state to URL', err);
    return '';
  }
}

/**
 * URL Base64 문자열로부터 상태 객체 복원
 */
export function decodeStateFromQuery(encodedStr: string): AppStatePayload | null {
  try {
    if (!encodedStr) return null;
    const decoded = atob(encodedStr);
    const jsonStr = decodeURIComponent(decoded);
    const parsed = JSON.parse(jsonStr) as AppStatePayload;
    if (parsed && parsed.config && Array.isArray(parsed.presets)) {
      return parsed;
    }
    return null;
  } catch (err) {
    console.error('Failed to decode state from URL', err);
    return null;
  }
}
