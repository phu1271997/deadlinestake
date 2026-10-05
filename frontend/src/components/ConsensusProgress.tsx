import type { WriteProgress } from '../lib/client';
import { explorerTx } from '../lib/config';

/**
 * Narrates a pending write.
 *
 * A settle transaction is not slow because the network is congested. It is slow
 * because every validator is independently rendering the evidence page and
 * running a model over it, then having to agree on the verdict. Saying so turns
 * a wait that looks broken into a wait that looks like the product working.
 */

const COPY: Record<WriteProgress['phase'], { title: string; detail: string }> = {
  validating: {
    title: 'Checking your input',
    detail: 'Making sure the transaction will not be rejected before you sign it.',
  },
  'awaiting-signature': {
    title: 'Waiting for your signature',
    detail: 'Approve the transaction in your wallet.',
  },
  submitted: {
    title: 'Submitted',
    detail: 'The transaction is on its way to the validators.',
  },
  'awaiting-consensus': {
    title: 'Validators are working',
    detail: 'The transaction is being finalized by consensus.',
  },
  finalized: {
    title: 'Finalized',
    detail: 'The result is on chain.',
  },
};

const NONDET_CONSENSUS_DETAIL =
  'Validators are each rendering the evidence and running a model to resolve this. Slower than a normal transaction — that is the product working.';

const ORDER: WriteProgress['phase'][] = [
  'validating',
  'awaiting-signature',
  'submitted',
  'awaiting-consensus',
  'finalized',
];

export function ConsensusProgress({ progress }: { progress: WriteProgress | null }) {
  if (!progress) return null;
  const copy = COPY[progress.phase];
  const currentIndex = ORDER.indexOf(progress.phase);
  const link = explorerTx(progress.hash);

  const detail =
    progress.nondet && progress.phase === 'awaiting-consensus'
      ? NONDET_CONSENSUS_DETAIL
      : copy.detail;

  return (
    <div className={`progress progress-${progress.phase}`} role="status" aria-live="polite">
      <ol className="progress-steps">
        {ORDER.map((phase, index) => (
          <li
            key={phase}
            className={index < currentIndex ? 'done' : index === currentIndex ? 'active' : 'pending'}
            aria-current={index === currentIndex ? 'step' : undefined}
          />
        ))}
      </ol>
      <div className="progress-body">
        <strong>{copy.title}</strong>
        <p>{detail}</p>
        {link && (
          <a href={link} target="_blank" rel="noreferrer noopener" className="mono small">
            View transaction on the explorer ↗
          </a>
        )}
      </div>
    </div>
  );
}
