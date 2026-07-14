import { z } from "zod";

export const assignableOrganizationRoleSchema = z.enum([
  "admin",
  "manager",
  "member",
  "reviewer",
  "viewer",
]);

export const inviteTeamMemberSchema = z.object({
  email: z.email().trim(),
  role: assignableOrganizationRoleSchema.default("member"),
});

export type InviteTeamMemberInput = z.infer<typeof inviteTeamMemberSchema>;

export const updateTeamMemberRoleSchema = z.object({
  memberId: z.uuid(),
  role: assignableOrganizationRoleSchema,
});

export type UpdateTeamMemberRoleInput = z.infer<
  typeof updateTeamMemberRoleSchema
>;

export const removeTeamMemberSchema = z.object({
  memberId: z.uuid(),
});

export type RemoveTeamMemberInput = z.infer<typeof removeTeamMemberSchema>;
