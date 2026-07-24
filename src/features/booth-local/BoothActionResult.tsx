import { AlertCircle, CheckCircle2 } from 'lucide-react';
import { BoothActionOutcome } from './useBoothLocal';

type BoothActionResultProps = {
  formError?: string;
  outcome?: BoothActionOutcome | null;
};

export default function BoothActionResult({ formError, outcome }: BoothActionResultProps) {
  return (
    <>
      {formError && (
        <div className="rounded-lg border border-error/30 bg-error-container p-3 text-xs font-medium text-on-error-container flex items-start gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{formError}</span>
        </div>
      )}

      {outcome && (
        <div
          className={`rounded-xl border p-3 text-xs font-medium flex items-start gap-2 ${
            outcome.ok
              ? 'border-success/30 bg-success-container text-on-success-container'
              : 'border-error/30 bg-error-container text-on-error-container'
          }`}
        >
          {outcome.ok
            ? <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
            : <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />}
          <div className="min-w-0 flex-1">
            <p className="font-bold">{outcome.message}</p>
            {outcome.raw !== null && outcome.raw !== '' && (
              <pre className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap break-words bg-surface border border-outline-variant rounded-lg p-2 text-[11px] text-on-surface">
                {typeof outcome.raw === 'string'
                  ? outcome.raw
                  : JSON.stringify(outcome.raw, null, 2)}
              </pre>
            )}
          </div>
        </div>
      )}
    </>
  );
}
