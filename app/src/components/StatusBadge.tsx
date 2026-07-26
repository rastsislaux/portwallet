import type { OperationStatus } from '../domain/types';

const labels: Record<OperationStatus, string> = {
  pending: 'Pending',
  failed: 'Failed',
  completed: 'Completed',
};

export function StatusBadge({ status }: { status: OperationStatus }) {
  return <span className={`status status--${status}`}>{labels[status]}</span>;
}
