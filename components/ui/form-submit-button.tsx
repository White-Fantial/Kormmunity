'use client';

import { useFormStatus } from 'react-dom';

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
  const composedClassName =
    `${className} disabled:cursor-not-allowed disabled:opacity-60`.trim();

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
