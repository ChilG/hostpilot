import { z } from "zod";

export const getHostSchema = (t: (key: string) => string) =>
  z.object({
    domain: z
      .string()
      .min(1, { message: t("validation.domainRequired") })
      .regex(/^[a-zA-Z0-9][a-zA-Z0-9.-]*\.[a-zA-Z]{2,}$/, {
        message: t("validation.invalidDomain"),
      }),
    ip: z
      .string()
      .min(1, { message: t("validation.ipRequired") })
      .regex(/^(\d{1,3}\.){3}\d{1,3}$/, {
        message: t("validation.invalidIp"),
      }),
    groupId: z.string().optional(),
    description: z.string().optional(),
  });

export const getGroupSchema = (t: (key: string) => string) =>
  z.object({
    name: z.string().min(1, { message: t("validation.groupNameRequired") }),
    description: z.string().optional(),
    color: z
      .string()
      .regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, {
        message: t("validation.invalidColor"),
      }),
  });

export const getProfileSchema = (t: (key: string) => string) =>
  z.object({
    name: z.string().min(1, { message: t("validation.profileNameRequired") }),
    description: z.string().optional(),
    entryIds: z.array(z.string()),
  });

export const getPortSchema = (t: (key: string) => string) =>
  z.object({
    domain: z.string().min(1, { message: t("validation.domainRequired") }),
    targetHost: z
      .string()
      .min(1, { message: t("validation.targetHostRequired") }),
    port: z
      .string()
      .min(1, { message: t("validation.portRequired") })
      .refine(
        (val) => {
          const num = Number(val);
          return !isNaN(num) && num >= 1 && num <= 65535;
        },
        { message: t("validation.invalidPort") }
      ),
    protocol: z.enum(["http", "https"]),
  });

export const getBackupSchema = (t: (key: string) => string) =>
  z.object({
    reason: z.string().min(1, { message: t("validation.reasonRequired") }),
  });
