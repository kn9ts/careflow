import { useState, useEffect } from "react";
import {
	BarChart,
	Bar,
	XAxis,
	YAxis,
	CartesianGrid,
	Tooltip,
	Legend,
	ResponsiveContainer,
	LineChart,
	Line,
} from "recharts";
import {
	Calendar,
	Phone,
	Download,
	Users,
	Activity,
	BarChart3,
	Clock,
	Search,
} from "lucide-react";

export default function Dashboard() {
	const [analytics, setAnalytics] = useState({
		totalCalls: 0,
		totalDuration: 0,
		totalRecordings: 0,
		averageCallDuration: 0,
	});

	const [callHistory, setCallHistory] = useState([]);
	const [selectedDate, setSelectedDate] = useState("");
	const [searchQuery, setSearchQuery] = useState("");

	useEffect(() => {
		fetchAnalytics();
		fetchCallHistory();
	}, []);

	const fetchAnalytics = async () => {
		try {
			const response = await fetch("/api/analytics");
			const data = await response.json();
			setAnalytics(data);
		} catch (error) {
			console.error("Error fetching analytics:", error);
		}
	};

	const fetchCallHistory = async () => {
		try {
			const response = await fetch("/api/calls/history");
			const data = await response.json();
			setCallHistory(data.calls || []);
		} catch (error) {
			console.error("Error fetching call history:", error);
		}
	};

	const filteredCalls = callHistory.filter((call) => {
		const matchesDate = !selectedDate || call.date.startsWith(selectedDate);
		const matchesSearch =
			!searchQuery ||
			call.from.includes(searchQuery) ||
			call.to.includes(searchQuery);
		return matchesDate && matchesSearch;
	});

	// Mock data for charts
	const callVolumeData = [
		{ name: "Mon", calls: 4 },
		{ name: "Tue", calls: 8 },
		{ name: "Wed", calls: 6 },
		{ name: "Thu", calls: 12 },
		{ name: "Fri", calls: 9 },
		{ name: "Sat", calls: 3 },
		{ name: "Sun", calls: 2 },
	];

	const durationData = [
		{ name: "Mon", duration: 120 },
		{ name: "Tue", duration: 240 },
		{ name: "Wed", duration: 180 },
		{ name: "Thu", duration: 360 },
		{ name: "Fri", duration: 270 },
		{ name: "Sat", duration: 90 },
		{ name: "Sun", duration: 60 },
	];

	return (
		<div className="min-h-screen bg-gradient-to-br from-background-dark via-primary-blue/10 to-background-dark">
			{/* Header */}
			<header className="border-b border-white/10 bg-black/20 backdrop-blur-sm">
				<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
					<div className="flex items-center justify-between">
						<div className="flex items-center space-x-4">
							<div className="w-10 h-10 bg-gradient-primary rounded-lg flex items-center justify-center">
								<BarChart3 className="w-6 h-6 text-white" />
							</div>
							<div>
								<h1 className="text-2xl font-bold text-white">
									Analytics Dashboard
								</h1>
								<p className="text-sm text-gray-400">
									Monitor your call activity and performance
								</p>
							</div>
						</div>
						<div className="flex items-center space-x-2">
							<span className="text-sm text-gray-400">
								Last updated: {new Date().toLocaleString()}
							</span>
						</div>
					</div>
				</div>
			</header>

			{/* Main Content */}
			<main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
				{/* Key Metrics */}
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
					<div className="bg-background-card rounded-xl p-6 border border-white/10">
						<div className="flex items-center justify-between">
							<div>
								<p className="text-gray-400 text-sm">Total Calls</p>
								<p className="text-2xl font-bold text-white">
									{analytics.totalCalls}
								</p>
							</div>
							<div className="w-12 h-12 bg-primary-red/20 rounded-lg flex items-center justify-center">
								<Phone className="w-6 h-6 text-primary-red" />
							</div>
						</div>
					</div>

					<div className="bg-background-card rounded-xl p-6 border border-white/10">
						<div className="flex items-center justify-between">
							<div>
								<p className="text-gray-400 text-sm">Total Duration</p>
								<p className="text-2xl font-bold text-white">
									{Math.floor(analytics.totalDuration / 60)}h{" "}
									{analytics.totalDuration % 60}m
								</p>
							</div>
							<div className="w-12 h-12 bg-primary-pink/20 rounded-lg flex items-center justify-center">
								<Clock className="w-6 h-6 text-primary-pink" />
							</div>
						</div>
					</div>

					<div className="bg-background-card rounded-xl p-6 border border-white/10">
						<div className="flex items-center justify-between">
							<div>
								<p className="text-gray-400 text-sm">Recordings</p>
								<p className="text-2xl font-bold text-white">
									{analytics.totalRecordings}
								</p>
							</div>
							<div className="w-12 h-12 bg-primary-blue/20 rounded-lg flex items-center justify-center">
								<Download className="w-6 h-6 text-primary-blue" />
							</div>
						</div>
					</div>

					<div className="bg-background-card rounded-xl p-6 border border-white/10">
						<div className="flex items-center justify-between">
							<div>
								<p className="text-gray-400 text-sm">Avg Duration</p>
								<p className="text-2xl font-bold text-white">
									{Math.floor(analytics.averageCallDuration / 60)}m{" "}
									{analytics.averageCallDuration % 60}s
								</p>
							</div>
							<div className="w-12 h-12 bg-secondary-cyan/20 rounded-lg flex items-center justify-center">
								<Activity className="w-6 h-6 text-secondary-cyan" />
							</div>
						</div>
					</div>
				</div>

				{/* Charts */}
				<div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
					{/* Call Volume Chart */}
					<div className="bg-background-card rounded-xl p-6 border border-white/10">
						<h3 className="text-lg font-semibold text-white mb-4">
							Call Volume
						</h3>
						<ResponsiveContainer width="100%" height={300}>
							<BarChart data={callVolumeData}>
								<CartesianGrid strokeDasharray="3 3" stroke="#333" />
								<XAxis dataKey="name" stroke="#888" />
								<YAxis stroke="#888" />
								<Tooltip />
								<Legend />
								<Bar dataKey="calls" fill="#FF3366" radius={[4, 4, 0, 0]} />
							</BarChart>
						</ResponsiveContainer>
					</div>

					{/* Call Duration Chart */}
					<div className="bg-background-card rounded-xl p-6 border border-white/10">
						<h3 className="text-lg font-semibold text-white mb-4">
							Call Duration
						</h3>
						<ResponsiveContainer width="100%" height={300}>
							<LineChart data={durationData}>
								<CartesianGrid strokeDasharray="3 3" stroke="#333" />
								<XAxis dataKey="name" stroke="#888" />
								<YAxis stroke="#888" />
								<Tooltip />
								<Legend />
								<Line
									type="monotone"
									dataKey="duration"
									stroke="#66CCFF"
									strokeWidth={2}
									dot={{ fill: "#66CCFF", strokeWidth: 2 }}
								/>
							</LineChart>
						</ResponsiveContainer>
					</div>
				</div>

				{/* Call History */}
				<div className="bg-background-card rounded-xl p-6 border border-white/10">
					<div className="flex items-center justify-between mb-6">
						<h3 className="text-lg font-semibold text-white">Recent Calls</h3>
						<div className="flex items-center space-x-4">
							<div className="relative">
								<Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
								<input
									type="text"
									placeholder="Search calls..."
									value={searchQuery}
									onChange={(e) => setSearchQuery(e.target.value)}
									className="pl-10 pr-4 py-2 bg-background-input border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-primary-red focus:ring-2 focus:ring-primary-red/20"
								/>
							</div>
							<input
								type="date"
								value={selectedDate}
								onChange={(e) => setSelectedDate(e.target.value)}
								className="px-4 py-2 bg-background-input border border-white/20 rounded-lg text-white focus:outline-none focus:border-primary-red focus:ring-2 focus:ring-primary-red/20"
							/>
						</div>
					</div>

					<div className="overflow-x-auto">
						<table className="w-full text-sm">
							<thead>
								<tr className="border-b border-white/10">
									<th className="text-left text-gray-400 pb-3">Date</th>
									<th className="text-left text-gray-400 pb-3">From</th>
									<th className="text-left text-gray-400 pb-3">To</th>
									<th className="text-left text-gray-400 pb-3">Duration</th>
									<th className="text-left text-gray-400 pb-3">Status</th>
									<th className="text-left text-gray-400 pb-3">Actions</th>
								</tr>
							</thead>
							<tbody>
								{filteredCalls.map((call, index) => (
									<tr key={index} className="border-b border-white/5">
										<td className="py-3 text-white">{call.date}</td>
										<td className="py-3 text-white">{call.from}</td>
										<td className="py-3 text-white">{call.to}</td>
										<td className="py-3 text-white">{call.duration}</td>
										<td className="py-3">
											<span
												className={`px-2 py-1 rounded-full text-xs ${
													call.status === "completed"
														? "bg-green-600/20 text-green-400"
														: "bg-red-600/20 text-red-400"
												}`}
											>
												{call.status}
											</span>
										</td>
										<td className="py-3">
											{call.recordingUrl && (
												<button className="text-primary-red hover:text-red-400 transition-colors">
													Download
												</button>
											)}
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				</div>
			</main>
		</div>
	);
}
