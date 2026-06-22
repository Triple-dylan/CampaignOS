import { z } from "zod";

export const organizationRoleSchema = z.enum([
  "owner",
  "admin",
  "manager",
  "member",
  "reviewer",
  "viewer",
]);

export type OrganizationRole = z.infer<typeof organizationRoleSchema>;

export const campaignStatusSchema = z.enum(["draft", "active", "archived"]);

export type CampaignStatus = z.infer<typeof campaignStatusSchema>;

export const graphNodeTypeSchema = z.enum([
  "candidate",
  "issue",
  "voter_segment",
  "donor",
  "prospect",
  "organization",
  "event",
  "asset",
  "research",
  "task",
  "opponent",
  "compliance",
  "message_theme",
  "strategic_priority",
]);

export type GraphNodeType = z.infer<typeof graphNodeTypeSchema>;

export const graphRelationshipTypeSchema = z.enum([
  "supports",
  "references",
  "targets",
  "belongs_to",
  "created_from",
  "requires_review",
  "assigned_to",
  "aligns_with",
  "opposes",
  "connected_to",
  "scheduled_for",
  "derived_from",
]);

export type GraphRelationshipType = z.infer<typeof graphRelationshipTypeSchema>;
