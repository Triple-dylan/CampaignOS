"use client";

import { useOptionalPresence } from "@/components/presence/presence-provider";
import { cn } from "@/lib/utils";

export function PresenceAvatarStack({
  className,
  scope = "object",
}: {
  className?: string;
  scope?: "object" | "all";
}) {
  const presence = useOptionalPresence();
  if (!presence) return null;

  const peers = scope === "all" ? presence.peers.filter((p) => !p.isSelf) : presence.objectPeers;
  if (peers.length === 0) return null;

  return (
    <div
      className={cn("flex items-center gap-1", className)}
      title={peers.map((peer) => `${peer.displayName} · ${peer.action}`).join(", ")}
    >
      <div className="flex -space-x-1.5">
        {peers.slice(0, 4).map((peer) => (
          <span
            key={peer.userId}
            className="inline-flex size-6 items-center justify-center rounded-full border border-background bg-muted text-[10px] font-medium uppercase"
          >
            {peer.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={peer.imageUrl}
                alt={peer.displayName}
                className="size-full rounded-full object-cover"
              />
            ) : (
              peer.displayName.slice(0, 1)
            )}
          </span>
        ))}
      </div>
      <span className="text-[11px] text-muted-foreground">
        {peers.length === 1
          ? `${peers[0].displayName.split(" ")[0]} ${peers[0].action}`
          : `${peers.length} active`}
      </span>
    </div>
  );
}
