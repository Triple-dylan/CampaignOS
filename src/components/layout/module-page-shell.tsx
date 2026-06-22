import { AppHeader } from "@/components/layout/app-header";
import { ModulePlaceholder } from "@/components/onboarding/module-placeholder";
import { modulePages } from "@/lib/navigation";

const moduleRoutes = {
  assets: "/assets",
  planner: "/planner",
  research: "/research",
  fundraising: "/fundraising",
  tasks: "/tasks",
  brain: "/brain",
  compliance: "/compliance",
  settings: "/settings",
} as const;

export type ModulePageKey = keyof typeof moduleRoutes;

export function ModulePageShell({ pageKey }: { pageKey: ModulePageKey }) {
  const page = modulePages[pageKey];

  return (
    <>
      <AppHeader title={page.title} description={page.description} />
      <div className="flex flex-1 flex-col gap-4 p-4 md:p-6">
        <ModulePlaceholder
          title={page.title}
          description={page.description}
          phase={page.phase}
          ctaHref={moduleRoutes[pageKey]}
          ctaLabel={`Open ${page.title}`}
        />
      </div>
    </>
  );
}
