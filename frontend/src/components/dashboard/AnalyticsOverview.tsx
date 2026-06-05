import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { FaArrowUp, FaArrowDown } from "react-icons/fa6";
import { useState } from "react";
import useAnalyticsQuery from "@/hooks/queries/useAnalyticsQuery";
import { formatFileSize } from "@/utils/format";

const StatCard = ({
  title,
  value,
  trend,
  trendValue,
}: {
  title: string;
  value: string;
  trend: string;
  trendValue: number;
}) => (
  <div className="bg-white p-6 rounded-2xl shadow-sm border border-neutral-100 flex flex-col justify-between h-full hover:shadow-md transition-shadow duration-200">
    <div>
      <h3 className="text-neutral-500 text-sm font-medium mb-1">{title}</h3>
      <p className="text-3xl font-bold text-neutral-800">{value}</p>
    </div>
    <div
      className={`flex items-center gap-1 text-sm font-medium mt-4 ${
        trendValue >= 0 ? "text-success-green-500" : "text-error-red-500"
      }`}
    >
      {trendValue >= 0 ? <FaArrowUp size={12} /> : <FaArrowDown size={12} />}
      <span>{trend}</span>
      <span className="text-neutral-400 font-normal ml-1">vs prior period</span>
    </div>
  </div>
);

const AnalyticsOverview = () => {
  const [timeframe, setTimeframe] = useState("7d");
  const { data: analytics, isLoading } = useAnalyticsQuery(timeframe);

  if (isLoading || !analytics) {
    return (
      <div className="space-y-6 mb-8 animate-pulse">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="h-32 bg-neutral-100 rounded-2xl"></div>
          <div className="h-32 bg-neutral-100 rounded-2xl"></div>
          <div className="h-32 bg-neutral-100 rounded-2xl"></div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 h-[400px] bg-neutral-100 rounded-2xl"></div>
          <div className="h-[400px] bg-neutral-100 rounded-2xl"></div>
        </div>
      </div>
    );
  }

  const { totals, trends, chartData, typeBreakdown } = analytics;

  return (
    <div className="space-y-6 mb-8">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <StatCard
          title="Total Transfers"
          value={totals.transfers.toString()}
          trend={`${Math.abs(trends.transfers)}%`}
          trendValue={trends.transfers}
        />
        <StatCard
          title="Total Storage Used"
          value={formatFileSize(totals.storage)}
          trend={`${Math.abs(trends.storage)}%`}
          trendValue={trends.storage}
        />
        <StatCard
          title="Total Downloads"
          value={totals.downloads.toString()}
          trend={`${Math.abs(trends.downloads)}%`}
          trendValue={trends.downloads}
        />
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Chart */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-neutral-100">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-semibold text-neutral-800">
              Transfer Activity
            </h3>
            <select 
              value={timeframe}
              onChange={(e) => setTimeframe(e.target.value)}
              className="bg-neutral-50 border border-neutral-200 text-neutral-600 text-sm rounded-lg focus:ring-primary-500 focus:border-primary-500 block p-2"
            >
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
              <option value="90d">Last 90 days</option>
            </select>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorSize" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.1} />
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="#f3f4f6"
                />
                <XAxis
                  dataKey="name"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "#9ca3af", fontSize: 12 }}
                  dy={10}
                />
                <YAxis
                  yAxisId="left"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "#9ca3af", fontSize: 12 }}
                  tickFormatter={(val) => formatFileSize(val)}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "#9ca3af", fontSize: 12 }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#fff",
                    borderRadius: "8px",
                    border: "1px solid #e5e7eb",
                    boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                  }}
                  formatter={(value: any, name: string) => {
                    if (name === "size") return [formatFileSize(Number(value)), "Storage"];
                    if (name === "transfers") return [value, "Transfers"];
                    return [value, name];
                  }}
                />
                <Area
                  yAxisId="left"
                  type="monotone"
                  dataKey="size"
                  stroke="#8b5cf6"
                  strokeWidth={3}
                  fillOpacity={1}
                  fill="url(#colorSize)"
                />
                <Area
                  yAxisId="right"
                  type="monotone"
                  dataKey="transfers"
                  stroke="#14b8a6"
                  strokeWidth={2}
                  fillOpacity={0}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Secondary Chart */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-neutral-100">
          <h3 className="text-lg font-semibold text-neutral-800 mb-6">
            Transfers by Type
          </h3>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={typeBreakdown}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="#f3f4f6"
                />
                <XAxis
                  dataKey="name"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "#9ca3af", fontSize: 12 }}
                  dy={10}
                />
                <Tooltip
                  cursor={{ fill: "#f9fafb" }}
                  contentStyle={{
                    backgroundColor: "#fff",
                    borderRadius: "8px",
                    border: "1px solid #e5e7eb",
                  }}
                />
                <Bar
                  dataKey="transfers"
                  fill="#14b8a6"
                  radius={[4, 4, 0, 0]}
                  barSize={40}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsOverview;
