import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().trim().max(254).pipe(z.email("Enter a valid email address.")),
  password: z.string().min(1, "Enter your password.").max(128),
});

export const registrationSchema = loginSchema.extend({
  name: z.string().trim().min(1, "Enter your full name.").max(100),
  password: z.string().min(8, "Use at least 8 characters.").max(128),
  confirmPassword: z.string().max(128),
}).refine(({ password, confirmPassword }) => password === confirmPassword, {
  path: ["confirmPassword"],
  message: "Passwords must match.",
});
