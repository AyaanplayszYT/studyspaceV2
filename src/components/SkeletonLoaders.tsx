import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export const TaskSkeleton = () => (
  <Card className="shadow-card">
    <CardContent className="flex items-start gap-4 pt-6">
      <Skeleton className="h-5 w-5 rounded" />
      <div className="flex-1 space-y-3">
        <Skeleton className="h-5 w-3/4" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />
        <div className="flex gap-2">
          <Skeleton className="h-6 w-20" />
          <Skeleton className="h-6 w-24" />
        </div>
      </div>
      <div className="flex gap-2">
        <Skeleton className="h-9 w-9 rounded" />
        <Skeleton className="h-9 w-9 rounded" />
      </div>
    </CardContent>
  </Card>
);

export const NoteSkeleton = () => (
  <Card className="shadow-card">
    <CardHeader>
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 space-y-2">
          <Skeleton className="h-6 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-9 w-9 rounded" />
          <Skeleton className="h-9 w-9 rounded" />
        </div>
      </div>
    </CardHeader>
    <CardContent className="space-y-3">
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-3/4" />
      <div className="flex justify-between pt-2">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-3 w-16" />
      </div>
    </CardContent>
  </Card>
);

export const TasksGridSkeleton = () => (
  <div className="space-y-3">
    {[...Array(5)].map((_, i) => (
      <TaskSkeleton key={i} />
    ))}
  </div>
);

export const NotesGridSkeleton = () => (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
    {[...Array(6)].map((_, i) => (
      <NoteSkeleton key={i} />
    ))}
  </div>
);
