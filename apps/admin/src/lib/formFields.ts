import { z } from "zod";

const WHOLE_NUMBER_PATTERN = /^\d+$/;
const DECIMAL_NUMBER_PATTERN = /^\d+(\.\d+)?$/;

export const wholeNumberText = (fieldName: string, { max }: { max?: number } = {}) =>
  z
    .string()
    .trim()
    .min(1, `Enter ${fieldName}.`)
    .refine((raw) => raw === "" || WHOLE_NUMBER_PATTERN.test(raw), {
      message: "Use a whole number with no decimals or minus sign.",
    })
    .refine((raw) => max === undefined || !WHOLE_NUMBER_PATTERN.test(raw) || Number(raw) <= max, {
      message: `Use a number up to ${max?.toLocaleString()}.`,
    });

export const optionalWholeNumberText = () =>
  z
    .string()
    .trim()
    .refine((raw) => raw === "" || WHOLE_NUMBER_PATTERN.test(raw), {
      message: "Use a whole number with no decimals or minus sign.",
    });

export const percentText = (fieldName: string, { max }: { max: number }) =>
  z
    .string()
    .trim()
    .min(1, `Enter ${fieldName}.`)
    .refine((raw) => raw === "" || DECIMAL_NUMBER_PATTERN.test(raw), {
      message: "Use a number such as 2.5, with no minus sign.",
    })
    .refine((raw) => !DECIMAL_NUMBER_PATTERN.test(raw) || Number(raw) <= max, {
      message: `Use a number up to ${max}.`,
    });
