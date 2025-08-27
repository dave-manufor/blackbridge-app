import { z } from "zod";
import { passwordRegex } from "./regex";
import {
  LINK_TRANSFER_ACCESS_CONTROL,
  TRANSFER_DURATIONS,
} from "@/config/constants/transfers";

export const signUpSchema = z
  .object({
    email: z
      .string()
      .email("Invalid email address")
      .nonempty("Email is required"),
    password: z
      .string()
      .min(12, "Password must be at least 12 characters long")
      .regex(
        passwordRegex,
        "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character"
      )
      .nonempty("Password is required"),
    confirmPassword: z.string().nonempty("Kindly confirm your password"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

export const signInSchema = z.object({
  email: z
    .string()
    .email("Invalid email address")
    .nonempty("Email is required"),
  password: z.string().nonempty("Password is required"),
});

const durationKeys = Object.keys(TRANSFER_DURATIONS) as [
  keyof typeof TRANSFER_DURATIONS,
  ...(keyof typeof TRANSFER_DURATIONS)[]
];
export const transferSchema = z
  .object({
    files: z.array(z.instanceof(File)).min(1, "Please add at least one file."),
    title: z.string().max(100).trim().optional(),
    description: z.string().max(500).optional(),
    duration: z.enum(durationKeys).default(durationKeys[0]),
    recipients: z.array(z.string().email()).optional(),
    isLink: z.boolean(),
    isPasswordProtected: z.boolean(),
    access_control: z
      .enum(
        Object.values(LINK_TRANSFER_ACCESS_CONTROL) as [string, ...string[]]
      )
      .default(LINK_TRANSFER_ACCESS_CONTROL.PUBLIC),
    password: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (!data.isLink) {
      // Email Transfer
      if (!data.recipients || data.recipients.length === 0) {
        ctx.addIssue({
          path: ["recipients"],
          message: "Specify at least one recipient",
          code: z.ZodIssueCode.custom,
        });
      }
    } else {
      // Link Transfer
      if (!data.access_control) {
        ctx.addIssue({
          path: ["access_control"],
          message: "Access control is required",
          code: z.ZodIssueCode.custom,
        });
      }
      // Password requirement check
      if (data.isPasswordProtected) {
        if (!data.password) {
          ctx.addIssue({
            path: ["password"],
            message:
              "Password is required if the transfer is password protected",
            code: z.ZodIssueCode.custom,
          });
        } else if (data.password.length < 8) {
          ctx.addIssue({
            path: ["password"],
            message: "Password must be at least 8 characters long",
            code: z.ZodIssueCode.custom,
          });
        }
      }
    }
  });
