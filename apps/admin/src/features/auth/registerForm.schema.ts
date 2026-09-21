import { NEPAL_PHONE_REGEX } from "@outfiqe/utils";
import { z } from "zod";

const FULL_NAME_MIN_LENGTH = 2;
const FULL_NAME_MAX_LENGTH = 100;
const PASSWORD_MIN_LENGTH = 8;
const PASSWORD_MAX_LENGTH = 128;

const phoneField = z
  .string()
  .trim()
  .min(1, "Enter your phone number.")
  .regex(NEPAL_PHONE_REGEX, "Enter a valid Nepali phone number starting with 98.");

const passwordField = z
  .string()
  .min(1, "Enter a password.")
  .min(PASSWORD_MIN_LENGTH, `Password must be at least ${PASSWORD_MIN_LENGTH} characters.`)
  .max(PASSWORD_MAX_LENGTH, `Use at most ${PASSWORD_MAX_LENGTH} characters.`);

const confirmPasswordField = z.string().min(1, "Confirm your password.");

type PasswordPair = { password: string; confirmPassword: string };

const passwordsMatch = ({ password, confirmPassword }: PasswordPair) =>
  confirmPassword === "" || password === confirmPassword;

const PASSWORDS_DO_NOT_MATCH_ISSUE = {
  message: "Passwords do not match.",
  path: ["confirmPassword"],
};

export const adminRegisterFormSchema = z
  .object({ phone: phoneField, password: passwordField, confirmPassword: confirmPasswordField })
  .refine(passwordsMatch, PASSWORDS_DO_NOT_MATCH_ISSUE);
export type AdminRegisterFormValues = z.infer<typeof adminRegisterFormSchema>;

export const crmRegisterFormSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, "Enter your full name.")
      .min(FULL_NAME_MIN_LENGTH, `Name must be at least ${FULL_NAME_MIN_LENGTH} characters.`)
      .max(FULL_NAME_MAX_LENGTH, `Use at most ${FULL_NAME_MAX_LENGTH} characters.`),
    phone: phoneField,
    password: passwordField,
    confirmPassword: confirmPasswordField,
  })
  .refine(passwordsMatch, PASSWORDS_DO_NOT_MATCH_ISSUE);
export type CrmRegisterFormValues = z.infer<typeof crmRegisterFormSchema>;

export const EMPTY_ADMIN_REGISTER_FORM: AdminRegisterFormValues = {
  phone: "",
  password: "",
  confirmPassword: "",
};

export const EMPTY_CRM_REGISTER_FORM: CrmRegisterFormValues = {
  name: "",
  phone: "",
  password: "",
  confirmPassword: "",
};
