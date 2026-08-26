import { useEffect, useRef } from "react";
import {
  useForm,
  type DefaultValues,
  type FieldValues,
  type UseFormReturn,
} from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { ZodType } from "zod";

interface DialogFormOptions<TInput extends FieldValues, TOutput> {
  schema: ZodType<TOutput, TInput>;
  // What the form holds while closed, and the shape react-hook-form registers
  // its fields against.
  defaultValues: DefaultValues<TInput>;
  open: boolean;
  // What to load each time the dialog opens: the row being edited, or a blank
  // slate. Recomputed by the caller on every render and read only on opening,
  // so a parent that re-renders mid-typing never wipes what was typed.
  values: DefaultValues<TInput>;
}

// A form that lives in a dialog.
//
// The three things every one of these dialogs was repeating: wiring zod into
// react-hook-form, and reloading the fields when the dialog opens — which has
// to happen on opening rather than on mount, because the dialog is mounted for
// the whole life of its parent screen and would otherwise keep whatever the
// previous row left behind.
export function useDialogForm<TInput extends FieldValues, TOutput>({
  schema,
  defaultValues,
  open,
  values,
}: DialogFormOptions<TInput, TOutput>): UseFormReturn<TInput, unknown, TOutput> {
  const form = useForm<TInput, unknown, TOutput>({
    resolver: zodResolver(schema),
    defaultValues,
  });

  const { reset } = form;

  // Held in a ref rather than in the dependency list: `values` is a fresh
  // object on every render, and depending on it would reset the form under the
  // user's fingers.
  //
  // The ref is written from an effect rather than during render — React forbids
  // touching refs while rendering — and this effect is declared first on
  // purpose: effects run in order, so by the time the one below fires on the
  // render that opens the dialog, the ref already holds this render's values.
  const latest = useRef(values);
  useEffect(() => {
    latest.current = values;
  });

  useEffect(() => {
    if (open) reset(latest.current);
  }, [open, reset]);

  return form;
}
