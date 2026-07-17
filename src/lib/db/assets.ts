import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/db/client";
import type { DbAsset } from "@/lib/db/schema";
import {
  createAssetSchema,
  listAssetsFilterSchema,
  updateAssetSchema,
  type CreateAssetInput,
  type ListAssetsFilter,
  type UpdateAssetInput,
} from "@/lib/validators/assets";

function mapAsset(row: Record<string, unknown>): DbAsset {
  const asset = row as DbAsset;
  return {
    ...asset,
    content_version:
      typeof asset.content_version === "number" ? asset.content_version : 1,
    updated_by: asset.updated_by ?? null,
  };
}

export async function createAsset(input: CreateAssetInput) {
  const parsed = createAssetSchema.parse(input);

  if (!isSupabaseConfigured()) {
    console.info("[assets] Supabase not configured — skipping asset create");
    return { synced: false as const, asset: null };
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("assets")
    .insert({
      campaign_id: parsed.campaignId,
      asset_type: parsed.assetType,
      title: parsed.title,
      description: parsed.description ?? null,
      content_text: parsed.contentText,
      channel: parsed.channel ?? null,
      theme: parsed.theme ?? null,
      issue: parsed.issue ?? null,
      status: parsed.status ?? "draft",
      ai_generated: parsed.aiGenerated ?? false,
      prompt_used: parsed.promptUsed ?? null,
      model_used: parsed.modelUsed ?? null,
      file_url: parsed.fileUrl ?? null,
      template_used: parsed.templateUsed ?? null,
      created_by: parsed.createdBy ?? null,
      compliance_status: parsed.aiGenerated ? "pending" : "required",
    })
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return {
    synced: true as const,
    asset: mapAsset(data),
  };
}

export async function updateAsset(input: UpdateAssetInput) {
  const parsed = updateAssetSchema.parse(input);

  if (!isSupabaseConfigured()) {
    return { synced: false as const, asset: null };
  }

  const updates: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (parsed.title !== undefined) updates.title = parsed.title;
  if (parsed.contentText !== undefined) updates.content_text = parsed.contentText;
  if (parsed.description !== undefined) updates.description = parsed.description;
  if (parsed.channel !== undefined) updates.channel = parsed.channel;
  if (parsed.theme !== undefined) updates.theme = parsed.theme;
  if (parsed.issue !== undefined) updates.issue = parsed.issue;
  if (parsed.status !== undefined) updates.status = parsed.status;
  if (parsed.complianceStatus !== undefined) {
    updates.compliance_status = parsed.complianceStatus;
  }
  if (parsed.approvedBy !== undefined) updates.approved_by = parsed.approvedBy;
  if (parsed.approvedAt !== undefined) updates.approved_at = parsed.approvedAt;
  if (parsed.fileUrl !== undefined) updates.file_url = parsed.fileUrl;
  if (parsed.templateUsed !== undefined) updates.template_used = parsed.templateUsed;
  if (parsed.contentVersion !== undefined) {
    updates.content_version = parsed.contentVersion;
  }
  if (parsed.updatedBy !== undefined) updates.updated_by = parsed.updatedBy;

  const supabase = getSupabaseAdmin();
  let query = supabase
    .from("assets")
    .update(updates)
    .eq("id", parsed.id)
    .eq("campaign_id", parsed.campaignId);

  if (parsed.expectedVersion !== undefined) {
    query = query.eq("content_version", parsed.expectedVersion);
  }

  const { data, error } = await query.select("*").maybeSingle();

  if (error) {
    throw error;
  }

  if (!data && parsed.expectedVersion !== undefined) {
    return {
      synced: false as const,
      asset: null,
      conflict: true as const,
    };
  }

  return {
    synced: true as const,
    asset: data ? mapAsset(data) : null,
    conflict: false as const,
  };
}

export async function getAssetById(
  campaignId: string,
  assetId: string,
): Promise<DbAsset | null> {
  if (!isSupabaseConfigured()) {
    return null;
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("assets")
    .select("*")
    .eq("campaign_id", campaignId)
    .eq("id", assetId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data ? mapAsset(data) : null;
}

export async function listAssets(filter: ListAssetsFilter): Promise<DbAsset[]> {
  const parsed = listAssetsFilterSchema.parse(filter);

  if (!isSupabaseConfigured()) {
    return [];
  }

  const supabase = getSupabaseAdmin();
  let query = supabase
    .from("assets")
    .select("*")
    .eq("campaign_id", parsed.campaignId)
    .order("updated_at", { ascending: false });

  if (parsed.assetType) {
    query = query.eq("asset_type", parsed.assetType);
  }
  if (parsed.status) {
    query = query.eq("status", parsed.status);
  }
  if (parsed.complianceStatus) {
    query = query.eq("compliance_status", parsed.complianceStatus);
  }

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  return (data ?? []).map(mapAsset);
}

export async function countAssets(campaignId: string): Promise<number> {
  if (!isSupabaseConfigured()) {
    return 0;
  }

  const supabase = getSupabaseAdmin();
  const { count, error } = await supabase
    .from("assets")
    .select("*", { count: "exact", head: true })
    .eq("campaign_id", campaignId);

  if (error) {
    throw error;
  }

  return count ?? 0;
}

export async function deleteAsset(campaignId: string, assetId: string) {
  if (!isSupabaseConfigured()) {
    return { synced: false as const };
  }

  const supabase = getSupabaseAdmin();
  const { error } = await supabase
    .from("assets")
    .delete()
    .eq("campaign_id", campaignId)
    .eq("id", assetId);

  if (error) {
    throw error;
  }

  return { synced: true as const };
}
