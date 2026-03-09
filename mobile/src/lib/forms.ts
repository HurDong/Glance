import type { FieldValues, Path, UseFormReturn } from 'react-hook-form';
import type { ZodError } from 'zod';

export function applyZodErrors<TFieldValues extends FieldValues>(
  form: UseFormReturn<TFieldValues>,
  error: ZodError<TFieldValues>,
) {
  for (const issue of error.issues) {
    const field = issue.path[0];

    if (typeof field === 'string') {
      form.setError(field as Path<TFieldValues>, {
        message: issue.message,
      });
    }
  }
}
