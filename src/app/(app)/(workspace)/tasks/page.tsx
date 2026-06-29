import { WorkPageFrame } from "@/components/layout/work-page-frame";
import { TaskBoard } from "@/components/tasks/task-board";
import { getTasksForCampaign } from "@/actions/tasks";
import { modulePages } from "@/lib/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default async function TasksPage({
  searchParams,
}: {
  searchParams: Promise<{ taskId?: string }>;
}) {
  const page = modulePages.tasks;
  const { taskId } = await searchParams;
  const result = await getTasksForCampaign();

  if (!result.ok) {
    return (
      <WorkPageFrame title={page.title} description={page.description}>
        <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
          <Card>
            <CardHeader>
              <CardTitle>Tasks unavailable</CardTitle>
              <CardDescription>{result.error}</CardDescription>
            </CardHeader>
            <CardContent>
              <Button render={<Link href="/onboarding" />}>
                Complete onboarding
              </Button>
            </CardContent>
          </Card>
        </div>
      </WorkPageFrame>
    );
  }

  return (
    <WorkPageFrame title={page.title} description={page.description}>
      <TaskBoard
        key={taskId ?? "default"}
        tasks={result.tasks}
        approvedAssets={result.approvedAssets}
        events={result.events}
        initialTaskId={taskId}
      />
    </WorkPageFrame>
  );
}
