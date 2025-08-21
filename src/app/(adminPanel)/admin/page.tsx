"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Building2, Users, FileText, Calendar, TrendingUp, Activity } from "lucide-react"
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
} from "recharts"

const stats = [
  {
    name: "Total Workspaces",
    value: "24",
    change: "+12%",
    changeType: "positive",
    icon: Building2,
  },
  {
    name: "Total Users",
    value: "1,429",
    change: "+8%",
    changeType: "positive",
    icon: Users,
  },
  {
    name: "Posts Generated",
    value: "12,847",
    change: "+23%",
    changeType: "positive",
    icon: FileText,
  },
  {
    name: "Scheduled Posts",
    value: "3,204",
    change: "+5%",
    changeType: "positive",
    icon: Calendar,
  },
]

const recentActivity = [
  {
    id: 1,
    type: "user_added",
    message: 'New user Sarah Johnson joined workspace "Marketing Team"',
    timestamp: "2 minutes ago",
  },
  {
    id: 2,
    type: "post_generated",
    message: 'AI generated 15 posts for "E-commerce Store" workspace',
    timestamp: "5 minutes ago",
  },
  {
    id: 3,
    type: "workspace_created",
    message: 'New workspace "Tech Startup" created by admin',
    timestamp: "12 minutes ago",
  },
  {
    id: 4,
    type: "post_scheduled",
    message: "8 posts scheduled for next week across 3 workspaces",
    timestamp: "18 minutes ago",
  },
]

const aiUsageData = [
  { date: "Jan 1", textGeneration: 120, imageGeneration: 80 },
  { date: "Jan 8", textGeneration: 150, imageGeneration: 95 },
  { date: "Jan 15", textGeneration: 180, imageGeneration: 110 },
  { date: "Jan 22", textGeneration: 220, imageGeneration: 140 },
  { date: "Jan 29", textGeneration: 280, imageGeneration: 180 },
  { date: "Feb 5", textGeneration: 320, imageGeneration: 200 },
  { date: "Feb 12", textGeneration: 380, imageGeneration: 240 },
]

const generationTypeData = [
  { name: "Text Generation", value: 65, color: "hsl(var(--chart-1))" },
  { name: "Image Generation", value: 35, color: "hsl(var(--chart-2))" },
]

const workspaceActivityData = [
  { workspace: "Marketing Team", posts: 45 },
  { workspace: "E-commerce Store", posts: 38 },
  { workspace: "Tech Startup", posts: 32 },
  { workspace: "Creative Agency", posts: 28 },
  { workspace: "Food Blog", posts: 22 },
]

export default function Dashboard() {
  return (
    <div className="space-y-8">
      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.name}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{stat.name}</CardTitle>
              <stat.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground">
                <span className="text-green-600">{stat.change}</span> from last month
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
            <CardDescription>Text vs Image generation over the last 30 days</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={aiUsageData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="date" className="text-xs fill-muted-foreground" tick={{ fontSize: 12 }} />
                <YAxis className="text-xs fill-muted-foreground" tick={{ fontSize: 12 }} />
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
                  data={generationTypeData}
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {generationTypeData.map((entry, index) => (
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
              {generationTypeData.map((item, index) => (
                <div key={index} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
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
            <CardDescription>Posts generated in the last 7 days</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={workspaceActivityData} layout="horizontal">
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis type="number" className="text-xs fill-muted-foreground" tick={{ fontSize: 12 }} />
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
                <Bar dataKey="posts" fill="hsl(var(--chart-3))" radius={[0, 4, 4, 0]} />
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
              {recentActivity.map((activity) => (
                <div key={activity.id} className="flex flex-col space-y-1 pb-3 border-b border-border last:border-0">
                  <p className="text-sm text-foreground">{activity.message}</p>
                  <p className="text-xs text-muted-foreground">{activity.timestamp}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
