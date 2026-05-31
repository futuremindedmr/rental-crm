import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useGetDashboardStats, useGetPipelineSummary, useGetRecentActivity } from "@workspace/api-client-react";
import { Users, Building2, CircleDollarSign, CalendarDays } from "lucide-react";

export default function Dashboard() {
  const { data: stats, isLoading: statsLoading } = useGetDashboardStats();
  const { data: pipeline, isLoading: pipelineLoading } = useGetPipelineSummary();
  const { data: activities, isLoading: activitiesLoading } = useGetRecentActivity();

  if (statsLoading || pipelineLoading || activitiesLoading) {
    return <div>Loading...</div>; // Skeleton loader can go here
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight text-foreground">Dashboard</h1>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Contacts</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalContacts || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Deals</CardTitle>
            <CircleDollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalDeals || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pipeline Value</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${stats?.totalPipelineValue?.toLocaleString() || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Won Deals</CardTitle>
            <CircleDollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${stats?.wonDealsValue?.toLocaleString() || 0}</div>
          </CardContent>
        </Card>
      </div>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Pipeline Overview</CardTitle>
          </CardHeader>
          <CardContent>
            {/* Chart placeholder */}
            <div className="h-64 flex items-center justify-center border rounded-md bg-muted/20">
              <span className="text-muted-foreground">Chart: {pipeline?.length || 0} stages</span>
            </div>
          </CardContent>
        </Card>
        
        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
             {/* Feed placeholder */}
             <div className="space-y-4">
               {activities?.map((activity) => (
                 <div key={activity.id} className="flex items-center gap-4">
                   <div className="bg-primary/10 p-2 rounded-full">
                     <CalendarDays className="h-4 w-4 text-primary" />
                   </div>
                   <div>
                     <p className="text-sm font-medium">{activity.subject}</p>
                     <p className="text-xs text-muted-foreground">{activity.type}</p>
                   </div>
                 </div>
               ))}
             </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
