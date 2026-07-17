"use client";

import * as React from "react";
import {
  inviteTeamMember,
  removeTeamMember,
  updateTeamMemberRole,
  type TeamMemberSummary,
} from "@/actions/team";
import {
  ASSIGNABLE_ORGANIZATION_ROLES,
  ORGANIZATION_ROLE_LABELS,
} from "@/lib/auth/permissions";
import type { OrganizationRole } from "@/lib/validators/enums";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type TeamPanelProps = {
  initialMembers: TeamMemberSummary[];
  canManage: boolean;
};

export function TeamPanel({ initialMembers, canManage }: TeamPanelProps) {
  const [members, setMembers] = React.useState(initialMembers);
  const [email, setEmail] = React.useState("");
  const [role, setRole] = React.useState<Exclude<OrganizationRole, "owner">>(
    "member",
  );
  const [pending, setPending] = React.useState(false);
  const [message, setMessage] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const refreshFromInvite = (nextMessage: string) => {
    setMessage(nextMessage);
    setError(null);
    setEmail("");
  };

  const handleInvite = async (event: React.FormEvent) => {
    event.preventDefault();
    setPending(true);
    setMessage(null);
    setError(null);
    const result = await inviteTeamMember({ email, role });
    setPending(false);
    if (result.ok) {
      refreshFromInvite(result.message ?? "Invitation sent.");
    } else {
      setError(result.error ?? "Invite failed.");
    }
  };

  const handleRoleChange = async (
    memberId: string,
    nextRole: Exclude<OrganizationRole, "owner">,
  ) => {
    setPending(true);
    setMessage(null);
    setError(null);
    const result = await updateTeamMemberRole({ memberId, role: nextRole });
    setPending(false);
    if (result.ok) {
      setMembers((prev) =>
        prev.map((member) =>
          member.id === memberId ? { ...member, role: nextRole } : member,
        ),
      );
      setMessage(result.message ?? "Role updated.");
    } else {
      setError(result.error ?? "Could not update role.");
    }
  };

  const handleRemove = async (memberId: string) => {
    setPending(true);
    setMessage(null);
    setError(null);
    const result = await removeTeamMember({ memberId });
    setPending(false);
    if (result.ok) {
      setMembers((prev) => prev.filter((member) => member.id !== memberId));
      setMessage(result.message ?? "Member removed.");
    } else {
      setError(result.error ?? "Could not remove member.");
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Team</CardTitle>
          <CardDescription>
            Campaign staff sharing this organization workspace. Roles control
            approvals, compliance review, and settings access.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {message ? (
            <p className="rounded-md border bg-muted/20 px-3 py-2 text-sm">
              {message}
            </p>
          ) : null}
          {error ? (
            <p className="rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          ) : null}

          {members.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No members synced yet. Use the organization switcher or invite
              below once Supabase is configured.
            </p>
          ) : (
            <ul className="divide-y rounded-md border">
              {members.map((member) => (
                <li
                  key={member.id}
                  className="flex flex-col gap-3 px-3 py-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {member.displayName}
                      {member.isCurrentUser ? (
                        <span className="ml-2 text-xs text-muted-foreground">
                          (you)
                        </span>
                      ) : null}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {member.email ?? "No email"}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {canManage && member.role !== "owner" && !member.isCurrentUser ? (
                      <select
                        className="h-8 rounded-md border bg-background px-2 text-xs"
                        value={member.role}
                        disabled={pending}
                        onChange={(event) =>
                          void handleRoleChange(
                            member.id,
                            event.target.value as Exclude<
                              OrganizationRole,
                              "owner"
                            >,
                          )
                        }
                      >
                        {ASSIGNABLE_ORGANIZATION_ROLES.map((value) => (
                          <option key={value} value={value}>
                            {ORGANIZATION_ROLE_LABELS[value]}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <span className="rounded-md bg-muted px-2 py-1 text-xs">
                        {ORGANIZATION_ROLE_LABELS[member.role]}
                      </span>
                    )}
                    {canManage &&
                    member.role !== "owner" &&
                    !member.isCurrentUser ? (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={pending}
                        onClick={() => void handleRemove(member.id)}
                      >
                        Remove
                      </Button>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {canManage ? (
        <Card>
          <CardHeader>
            <CardTitle>Invite teammate</CardTitle>
            <CardDescription>
              Sends a Clerk organization invitation. Configure matching custom
              org roles in Clerk (manager, reviewer, viewer) for full sync.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form className="grid gap-3 sm:grid-cols-[1fr_auto_auto]" onSubmit={handleInvite}>
              <div className="space-y-1.5">
                <Label htmlFor="invite-email">Email</Label>
                <Input
                  id="invite-email"
                  type="email"
                  required
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="name@campaign.org"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="invite-role">Role</Label>
                <select
                  id="invite-role"
                  className="flex h-9 w-full rounded-md border bg-background px-2 text-sm"
                  value={role}
                  onChange={(event) =>
                    setRole(
                      event.target.value as Exclude<OrganizationRole, "owner">,
                    )
                  }
                >
                  {ASSIGNABLE_ORGANIZATION_ROLES.map((value) => (
                    <option key={value} value={value}>
                      {ORGANIZATION_ROLE_LABELS[value]}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-end">
                <Button type="submit" disabled={pending || !email.trim()}>
                  {pending ? "Sending…" : "Invite"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      ) : (
        <p className="text-sm text-muted-foreground">
          Only owners and admins can invite or change team roles.
        </p>
      )}
    </div>
  );
}
