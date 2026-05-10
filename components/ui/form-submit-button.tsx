'use client';

import { useFormStatus } from 'react-dom';

const DISABLED_STATE_CLASSES = 'disabled:cursor-not-allowed disabled:opacity-60';

type FormSubmitButtonProps = {
  idleLabel: string;
  pendingLabel: string;
  className?: string;
};

export function FormSubmitButton({
  idleLabel,
  pendingLabel,
  className = '',
}: FormSubmitButtonProps) {
  const { pending } = useFormStatus();
  const composedClassName = `${className} ${DISABLED_STATE_CLASSES}`.trim();

  return (
    <button
      type="submit"
      disabled={pending}
      aria-busy={pending}
      className={composedClassName}
    >
      {pending ? pendingLabel : idleLabel}
    </button>
  );
}
