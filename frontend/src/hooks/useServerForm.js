import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { applyFieldErrors } from '../lib/apiErrors';

/**
 * react-hook-form with a Zod schema, plus where a failed request's error goes: under its field
 * when the API names one (details[].field, or a code that belongs to a field), otherwise into
 * formError for the FormAlert above the button. The fields always keep what was typed.
 *
 * fieldForCode maps an error code to a field, for example { INVALID_CREDENTIALS: 'password' }.
 * Returns the useForm methods plus { formError, setFormError, handleServerError }.
 */
export function useServerForm(schema, { defaultValues, fieldForCode = {} } = {}) {
  const form = useForm({ resolver: zodResolver(schema), defaultValues, mode: 'onSubmit' });
  const [formError, setFormError] = useState(null);
  const fieldNames = Object.keys(defaultValues ?? {});

  function handleServerError(error) {
    const field = fieldForCode[error?.code];
    if (field) {
      form.setError(field, { type: 'server', message: error.message }, { shouldFocus: true });
      setFormError(null);
      return;
    }
    if (applyFieldErrors(error, form.setError, fieldNames)) {
      setFormError(null);
      return;
    }
    setFormError(error);
  }

  return { ...form, formError, setFormError, handleServerError };
}
