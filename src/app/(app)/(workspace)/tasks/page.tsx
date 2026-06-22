import { AppHeader } from "@/components/layout/app-header";
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

export default async function TasksPage() {
  const page = modulePages.tasks;
  const result = await getTasksForCampaign();

  if (!result.ok) {
    return (
      <>
        <AppHeader title={page.title} description={page.description} />
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
      </>
    );
  }

  return (
    <>
      <AppHeader title={page.title} description={page.description} />
      <TaskBoard
        tasks={result.tasks}
        approvedAssets={result.approvedAssets}
        events={result.events}
      />
    </>
  );
}
