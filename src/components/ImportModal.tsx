import React, { useState } from 'react';
import { WorkDay } from '../types/payroll';
import { X, Upload, CheckCircle2, AlertCircle, FileSpreadsheet, Copy } from 'lucide-react';
import { parseWorkDaysInput } from '../lib/importer';

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (newDays: WorkDay[], mode: 'OVERWRITE' | 'MERGE') => void;
}

const SAMPLE_CSV = `날짜,시작,종료,휴게분
2026-08-03,09:00,18:00,60
2026-08-05,09:00,18:00,60
2026-08-07,09:00,18:00,60
2026-08-08,18:00,23:00,30`;

export const ImportModal: React.FC<ImportModalProps> = ({
  isOpen,
  onClose,
  onImport,
}) => {
  const [text, setText] = useState<string>('');
  const [importMode, setImportMode] = useState<'OVERWRITE' | 'MERGE'>('MERGE');
  const [parseStatus, setParseStatus] = useState<{
    success?: boolean;
    count?: number;
    errors?: string[];
  } | null>(null);

  if (!isOpen) return null;

  const handleApply = () => {
    const res = parseWorkDaysInput(text);
    if (res.success && res.workDays.length > 0) {
      onImport(res.workDays, importMode);
      onClose();
    } else {
      setParseStatus({
        success: false,
        count: 0,
        errors: res.errors.length > 0 ? res.errors : ['가져올 수 있는 데이터가 없습니다.'],
      });
    }
  };

  const handleLoadSample = () => {
    setText(SAMPLE_CSV);
    const res = parseWorkDaysInput(SAMPLE_CSV);
    setParseStatus({
      success: res.success,
      count: res.count,
      errors: res.errors,
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-xl border border-slate-200 overflow-hidden animate-scaleUp">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="w-4 h-4 text-[var(--ab-boss)]" />
            <h3 className="font-bold text-slate-900 text-sm">
              근무 기록 붙여넣기 (CSV / 엑셀 표 / JSON)
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 min-w-[36px] min-h-[36px] text-slate-400 hover:text-slate-600 rounded-lg flex items-center justify-center"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500">
              엑셀이나 구글 시트에서 복사한 표를 그대로 붙여넣을 수 있습니다.
            </span>
            <button
              type="button"
              onClick={handleLoadSample}
              className="text-xs font-semibold text-[var(--ab-boss)] hover:underline flex items-center gap-1 min-h-[36px]"
            >
              <Copy className="w-3 h-3" />
              샘플 불러오기
            </button>
          </div>

          <div>
            <textarea
              rows={7}
              value={text}
              onChange={(e) => {
                setText(e.target.value);
                setParseStatus(null);
              }}
              placeholder={`날짜,시작,종료,휴게분\n2026-08-03,09:00,18:00,60\n2026-08-05,09:00,18:00,60`}
              className="w-full p-3 text-xs font-mono bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>

          <div className="flex items-center justify-between text-xs sm:text-sm">
            <span className="font-semibold text-slate-700">반영 방식:</span>
            <div className="flex gap-2">
              <label className="flex items-center gap-1 cursor-pointer min-h-[40px]">
                <input
                  type="radio"
                  name="importMode"
                  checked={importMode === 'MERGE'}
                  onChange={() => setImportMode('MERGE')}
                  className="text-[var(--ab-boss)]"
                />
                <span>기존 근무에 병합 (추천)</span>
              </label>
              <label className="flex items-center gap-1 cursor-pointer min-h-[40px]">
                <input
                  type="radio"
                  name="importMode"
                  checked={importMode === 'OVERWRITE'}
                  onChange={() => setImportMode('OVERWRITE')}
                  className="text-[var(--ab-boss)]"
                />
                <span>덮어쓰기</span>
              </label>
            </div>
          </div>

          {/* 파싱 결과 피드백 */}
          {parseStatus && (
            <div
              className={`p-3 rounded-xl text-xs flex items-start gap-2.5 ${
                parseStatus.success
                  ? 'bg-emerald-50 border border-emerald-200 text-emerald-900'
                  : 'bg-rose-50 border border-rose-200 text-rose-900'
              }`}
            >
              {parseStatus.success ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
              )}
              <div>
                <div className="font-bold">
                  {parseStatus.success
                    ? `유효한 근무 기록 ${parseStatus.count}건 확인됨`
                    : '가져오기 오류'}
                </div>
                {parseStatus.errors && parseStatus.errors.length > 0 && (
                  <ul className="list-disc list-inside mt-1 space-y-0.5 text-[12px]">
                    {parseStatus.errors.map((err, i) => (
                      <li key={i}>{err}</li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 min-h-[40px] text-xs font-semibold text-slate-600 bg-slate-200 hover:bg-slate-300 rounded-xl transition-colors"
          >
            닫기
          </button>
          <button
            type="button"
            onClick={handleApply}
            disabled={!text.trim()}
            className="inline-flex items-center gap-1.5 px-4 py-2 min-h-[40px] text-xs font-semibold text-white bg-[var(--ab-boss)] hover:bg-[var(--ab-boss-hover)] disabled:opacity-50 rounded-xl shadow-sm transition-colors"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>근무표에 반영하기</span>
          </button>
        </div>
      </div>
    </div>
  );
};
