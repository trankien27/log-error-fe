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
        <div role="alert" className="rounded-xl border border-error/30 bg-error-container px-4 py-3 text-sm font-medium text-on-error-container flex items-start gap-2.5">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{formError}</span>
        </div>
      )}

      {outcome && (
        <div
          role="status"
          className={`rounded-xl border px-4 py-3 text-sm flex items-start gap-2.5 ${
            outcome.ok
              ? 'border-success/30 bg-success-container text-on-success-container'
              : 'border-error/30 bg-error-container text-on-error-container'
          }`}
        >
          {outcome.ok
            ? <CheckCircle2 className="w-5 h-5 shrink-0" />
            : <AlertCircle className="w-5 h-5 shrink-0" />}
          <div className="min-w-0 flex-1">
            <p className="font-medium">{outcome.message}</p>
            {outcome.raw !== null && outcome.raw !== '' && (
              <pre className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap break-words bg-surface border border-outline-variant rounded-lg p-2.5 font-mono text-xs text-on-surface">
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
