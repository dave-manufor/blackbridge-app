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

const data = [
  { name: "Mon", transfers: 40, size: 2400 },
  { name: "Tue", transfers: 30, size: 1398 },
  { name: "Wed", transfers: 20, size: 9800 },
  { name: "Thu", transfers: 27, size: 3908 },
  { name: "Fri", transfers: 18, size: 4800 },
  { name: "Sat", transfers: 23, size: 3800 },
  { name: "Sun", transfers: 34, size: 4300 },
];

const StatCard = ({
  title,
  value,
  trend,
  trendUp,
}: {
  title: string;
  value: string;
  trend: string;
  trendUp: boolean;
}) => (
  <div className="bg-white p-6 rounded-2xl shadow-sm border border-neutral-100 flex flex-col justify-between h-full hover:shadow-md transition-shadow duration-200">
    <div>
      <h3 className="text-neutral-500 text-sm font-medium mb-1">{title}</h3>
      <p className="text-3xl font-bold text-neutral-800">{value}</p>
    </div>
    <div
      className={`flex items-center gap-1 text-sm font-medium mt-4 ${
        trendUp ? "text-success-green-500" : "text-error-red-500"
      }`}
    >
      {trendUp ? <FaArrowUp size={12} /> : <FaArrowDown size={12} />}
      <span>{trend}</span>
      <span className="text-neutral-400 font-normal ml-1">vs last week</span>
    </div>
  </div>
);

const AnalyticsOverview = () => {
  return (
    <div className="space-y-6 mb-8">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Transfers"
          value="1,284"
          trend="12.5%"
          trendUp={true}
        />
        <StatCard
          title="Total Bandwidth"
          value="45.2 GB"
          trend="8.2%"
          trendUp={true}
        />
        <StatCard
          title="Active Users"
          value="892"
          trend="2.4%"
          trendUp={false}
        />
        <StatCard
          title="Storage Used"
          value="128 GB"
          trend="5.1%"
          trendUp={true}
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
            <select className="bg-neutral-50 border border-neutral-200 text-neutral-600 text-sm rounded-lg focus:ring-primary-500 focus:border-primary-500 block p-2">
              <option>Last 7 days</option>
              <option>Last 30 days</option>
              <option>Last 90 days</option>
            </select>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data}>
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
                />
                <Area
                  type="monotone"
                  dataKey="size"
                  stroke="#8b5cf6"
                  strokeWidth={3}
                  fillOpacity={1}
                  fill="url(#colorSize)"
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
              <BarChart data={data}>
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
                  barSize={30}
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
