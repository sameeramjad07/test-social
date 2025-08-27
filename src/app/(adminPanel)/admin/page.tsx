"use client";

import { api } from "@/trpc/react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Building2,
  Users,
  FileText,
  Calendar,
  TrendingUp,
  Activity,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
} from "recharts";

export default function Dashboard() {
  const { data: stats, isLoading: statsLoading } =
    api.admin.getDashboardStats.useQuery();
  const { data: recentActivity, isLoading: activityLoading } =
    api.admin.getRecentActivity.useQuery();
  const { data: aiUsageData, isLoading: aiUsageLoading } =
    api.admin.getAIUsageTrends.useQuery();
  const { data: generationTypeData, isLoading: generationTypeLoading } =
    api.admin.getGenerationTypes.useQuery();
  const { data: workspaceActivityData, isLoading: workspaceActivityLoading } =
    api.admin.getWorkspaceActivity.useQuery();

  if (
    statsLoading ||
    activityLoading ||
    aiUsageLoading ||
    generationTypeLoading ||
    workspaceActivityLoading
  ) {
    return <div>Loading dashboard...</div>;
  }

  return (
    <div className="space-y-8">
      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats &&
          Object.entries(stats).map(([key, stat]) => (
            <Card key={key}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {key === "totalWorkspaces"
                    ? "Total Workspaces"
                    : key === "totalUsers"
                    ? "Total Users"
                    : key === "postsGenerated"
                    ? "Posts Generated"
                    : "Scheduled Posts"}
                </CardTitle>
                {key === "totalWorkspaces" && (
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                )}
                {key === "totalUsers" && (
                  <Users className="h-4 w-4 text-muted-foreground" />
                )}
                {key === "postsGenerated" && (
                  <FileText className="h-4 w-4 text-muted-foreground" />
                )}
                {key === "scheduledPosts" && (
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                )}
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
                <p className="text-xs text-muted-foreground">
                  <span
                    className={
                      stat.changeType === "positive"
                        ? "text-green-600"
                        : "text-red-600"
                    }
                  >
                    {stat.change}
                  </span>{" "}
                  from last month
                </p>
              </CardContent>
            </Card>
          ))}
      </div>

      {/* Charts Row */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {/* AI Usage Trends Line Chart */}
        <Card className="col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              AI Usage Trends
            </CardTitle>
            <CardDescription>
              Text vs Image generation over the last 30 days
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={aiUsageData || []}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis
                  dataKey="date"
                  className="text-xs fill-muted-foreground"
                  tick={{ fontSize: 12 }}
                />
                <YAxis
                  className="text-xs fill-muted-foreground"
                  tick={{ fontSize: 12 }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="textGeneration"
                  stroke="hsl(var(--chart-1))"
                  strokeWidth={2}
                  name="Text Generation"
                />
                <Line
                  type="monotone"
                  dataKey="imageGeneration"
                  stroke="hsl(var(--chart-2))"
                  strokeWidth={2}
                  name="Image Generation"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Generation Type Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Generation Types</CardTitle>
            <CardDescription>Distribution of AI generations</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={generationTypeData || []}
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {generationTypeData?.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="mt-4 space-y-2">
              {generationTypeData?.map((item, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between text-sm"
                >
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: item.color }}
                    />
                    <span>{item.name}</span>
                  </div>
                  <span className="font-medium">{item.value}%</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bottom Row */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Workspace Activity */}
        <Card>
          <CardHeader>
            <CardTitle>Top Workspaces by Activity</CardTitle>
            <CardDescription>
              Posts generated in the last 7 days
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={workspaceActivityData || []} layout="horizontal">
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis
                  type="number"
                  className="text-xs fill-muted-foreground"
                  tick={{ fontSize: 12 }}
                />
                <YAxis
                  type="category"
                  dataKey="workspace"
                  className="text-xs fill-muted-foreground"
                  tick={{ fontSize: 12 }}
                  width={100}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                  }}
                />
                <Bar
                  dataKey="posts"
                  fill="hsl(var(--chart-3))"
                  radius={[0, 4, 4, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Recent Activity
            </CardTitle>
            <CardDescription>Latest platform activity</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentActivity?.map((activity) => (
                <div
                  key={activity.id}
                  className="flex flex-col space-y-1 pb-3 border-b border-border last:border-0"
                >
                  <p className="text-sm text-foreground">{activity.message}</p>
                  <p className="text-xs text-muted-foreground">
                    {activity.timestamp}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
