import { z } from "zod";
import { organizationRoleSchema } from "@/lib/validators/enums";

export const upsertOrganizationSchema = z.object({
  clerkOrgId: z.string().min(1),
  name: z.string().min(1),
  slug: z.string().nullable().optional(),
  ownerClerkId: z.string().min(1).nullable().optional(),
});

export type UpsertOrganizationInput = z.infer<typeof upsertOrganizationSchema>;

export const upsertOrganizationMemberSchema = z.object({
  clerkOrgId: z.string().min(1),
  clerkUserId: z.string().min(1),
  clerkMembershipId: z.string().min(1).nullable().optional(),
  role: organizationRoleSchema,
});

export type UpsertOrganizationMemberInput = z.infer<
  typeof upsertOrganizationMemberSchema
>;

export const deleteOrganizationMemberSchema = z.object({
  clerkOrgId: z.string().min(1),
  clerkUserId: z.string().min(1),
});

export type DeleteOrganizationMemberInput = z.infer<
  typeof deleteOrganizationMemberSchema
>;
