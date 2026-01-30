import { useState, useEffect, useRef } from "react";
import {
	Phone,
	Mic,
	MicOff,
	Video,
	VideoOff,
	Download,
	Upload,
} from "lucide-react";

export default function Home() {
	const [isCalling, setIsCalling] = useState(false);
	const [isConnected, setIsConnected] = useState(false);
	const [isMuted, setIsMuted] = useState(false);
	const [isRecording, setIsRecording] = useState(false);
	const [callDuration, setCallDuration] = useState(0);
	const [phoneNumber, setPhoneNumber] = useState("");
	const [callSid, setCallSid] = useState("");
	const [recordings, setRecordings] = useState([]);
	const [uploadProgress, setUploadProgress] = useState(0);
	const [isUploading, setIsUploading] = useState(false);

	const deviceRef = useRef(null);
	const connectionRef = useRef(null);
	const timerRef = useRef(null);

	useEffect(() => {
		// Initialize Twilio Device
		const initializeTwilio = async () => {
			try {
				const response = await fetch("/api/twilio/token");
				const { token } = await response.json();

				// Load Twilio SDK dynamically
				const { Device } = await import("@twilio/voice-sdk");
				deviceRef.current = new Device(token, {
					codecPreferences: ["opus", "pcmu"],
					debug: true,
				});

				deviceRef.current.on("ready", () => {
					console.log("Twilio Device Ready");
				});

				deviceRef.current.on("error", (error) => {
					console.error("Twilio Device Error:", error);
				});

				deviceRef.current.on("connect", (connection) => {
					connectionRef.current = connection;
					setIsConnected(true);
					setIsCalling(true);
					startTimer();
				});

				deviceRef.current.on("disconnect", () => {
					setIsConnected(false);
					setIsCalling(false);
					stopTimer();
				});

				deviceRef.current.on("incoming", (connection) => {
					connectionRef.current = connection;
					connection.on("accept", () => {
						setIsConnected(true);
						setIsCalling(true);
						startTimer();
					});
				});
			} catch (error) {
				console.error("Error initializing Twilio:", error);
			}
		};

		initializeTwilio();

		return () => {
			if (deviceRef.current) {
				deviceRef.current.destroy();
			}
			stopTimer();
		};
	}, []);

	const startTimer = () => {
		timerRef.current = setInterval(() => {
			setCallDuration((prev) => prev + 1);
		}, 1000);
	};

	const stopTimer = () => {
		if (timerRef.current) {
			clearInterval(timerRef.current);
			timerRef.current = null;
		}
		setCallDuration(0);
	};

	const formatTime = (seconds) => {
		const mins = Math.floor(seconds / 60);
		const secs = seconds % 60;
		return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
	};

	const handleCall = async () => {
		if (!phoneNumber) {
			alert("Please enter a phone number");
			return;
		}

		try {
			const params = {
				PhoneNumber: phoneNumber,
				Record: "true",
				RecordingStatusCallback: `${process.env.NEXT_PUBLIC_APP_URL}/api/calls/webhook`,
			};

			const connection = deviceRef.current.connect({ params });
			connection.on("accept", () => {
				setIsConnected(true);
				setIsCalling(true);
				startTimer();
			});
		} catch (error) {
			console.error("Error making call:", error);
		}
	};

	const handleHangup = () => {
		if (connectionRef.current) {
			connectionRef.current.disconnect();
		}
	};

	const handleMute = () => {
		if (connectionRef.current) {
			connectionRef.current.mute(!isMuted);
			setIsMuted(!isMuted);
		}
	};

	const handleRecord = () => {
		setIsRecording(!isRecording);
		if (connectionRef.current) {
			connectionRef.current.sendDigits(isRecording ? "1" : "0");
		}
	};

	const handleUploadRecording = async (event) => {
		const file = event.target.files[0];
		if (!file) return;

		setIsUploading(true);
		setUploadProgress(0);

		const formData = new FormData();
		formData.append("file", file);

		try {
			const response = await fetch("/api/calls/upload", {
				method: "POST",
				body: formData,
			});

			const result = await response.json();
			if (response.ok) {
				alert("Recording uploaded successfully!");
				fetchRecordings();
			} else {
				alert(`Upload failed: ${result.error}`);
			}
		} catch (error) {
			console.error("Upload error:", error);
			alert("Upload failed");
		} finally {
			setIsUploading(false);
			setUploadProgress(0);
		}
	};

	const fetchRecordings = async () => {
		try {
			const response = await fetch("/api/calls/recordings");
			const data = await response.json();
			setRecordings(data.recordings || []);
		} catch (error) {
			console.error("Error fetching recordings:", error);
		}
	};

	useEffect(() => {
		fetchRecordings();
	}, []);

	return (
		<div className="min-h-screen bg-gradient-to-br from-background-dark via-primary-blue/10 to-background-dark">
			{/* Header */}
			<header className="border-b border-white/10 bg-black/20 backdrop-blur-sm">
				<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
					<div className="flex items-center justify-between">
						<div className="flex items-center space-x-4">
							<div className="w-10 h-10 bg-gradient-primary rounded-lg flex items-center justify-center">
								<Phone className="w-6 h-6 text-white" />
							</div>
							<div>
								<h1 className="text-2xl font-bold text-white">Browser Phone</h1>
								<p className="text-sm text-gray-400">
									Make and receive calls in your browser
								</p>
							</div>
						</div>
						<div className="flex items-center space-x-2">
							<div
								className={`w-3 h-3 rounded-full ${
									isConnected ? "bg-green-400 animate-pulse" : "bg-gray-500"
								}`}
							/>
							<span className="text-sm text-gray-400">
								{isConnected ? "Connected" : "Disconnected"}
							</span>
						</div>
					</div>
				</div>
			</header>

			{/* Main Content */}
			<main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
				<div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
					{/* Call Controls */}
					<div className="lg:col-span-2 space-y-6">
						<div className="bg-background-card rounded-xl p-6 border border-white/10">
							<h2 className="text-lg font-semibold text-white mb-4">
								Make a Call
							</h2>
							<div className="space-y-4">
								<div className="flex space-x-4">
									<input
										type="tel"
										value={phoneNumber}
										onChange={(e) => setPhoneNumber(e.target.value)}
										placeholder="+1234567890"
										className="flex-1 px-4 py-3 bg-background-input border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-primary-red focus:ring-2 focus:ring-primary-red/20"
									/>
									<button
										onClick={handleCall}
										disabled={isCalling}
										className="px-6 py-3 bg-gradient-primary text-white rounded-lg font-semibold hover:shadow-lg hover:shadow-primary-red/25 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
									>
										{isCalling ? "Calling..." : "Call"}
									</button>
									<button
										onClick={handleHangup}
										disabled={!isCalling}
										className="px-6 py-3 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
									>
										Hang Up
									</button>
								</div>

								{/* Call Status */}
								{isCalling && (
									<div className="bg-black/20 rounded-lg p-4 border border-white/10">
										<div className="flex items-center justify-between">
											<div className="flex items-center space-x-4">
												<div className="relative">
													<div className="w-4 h-4 bg-green-400 rounded-full animate-pulse" />
													<div className="absolute inset-0 w-4 h-4 bg-green-400 rounded-full animate-ping opacity-75" />
												</div>
												<span className="text-white font-medium">In Call</span>
											</div>
											<div className="text-2xl font-mono text-white">
												{formatTime(callDuration)}
											</div>
										</div>
									</div>
								)}
							</div>
						</div>

						{/* Call Controls */}
						{isCalling && (
							<div className="bg-background-card rounded-xl p-6 border border-white/10">
								<h3 className="text-lg font-semibold text-white mb-4">
									Call Controls
								</h3>
								<div className="flex items-center space-x-4">
									<button
										onClick={handleMute}
										className={`p-3 rounded-lg transition-all ${
											isMuted
												? "bg-red-600 text-white"
												: "bg-white/10 text-white hover:bg-white/20"
										}`}
									>
										{isMuted ? (
											<MicOff className="w-6 h-6" />
										) : (
											<Mic className="w-6 h-6" />
										)}
									</button>
									<button
										onClick={handleRecord}
										className={`p-3 rounded-lg transition-all ${
											isRecording
												? "bg-red-600 text-white animate-pulse"
												: "bg-white/10 text-white hover:bg-white/20"
										}`}
									>
										<Video className="w-6 h-6" />
									</button>
								</div>
							</div>
						)}
					</div>

					{/* Sidebar */}
					<div className="space-y-6">
						{/* Upload Recording */}
						<div className="bg-background-card rounded-xl p-6 border border-white/10">
							<h3 className="text-lg font-semibold text-white mb-4">
								Upload Recording
							</h3>
							<div className="space-y-4">
								<input
									type="file"
									accept="audio/*"
									onChange={handleUploadRecording}
									disabled={isUploading}
									className="w-full px-4 py-2 bg-background-input border border-white/20 rounded-lg text-white file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-primary-red file:text-white hover:file:bg-red-600 disabled:opacity-50"
								/>
								{isUploading && (
									<div className="w-full bg-gray-700 rounded-full h-2">
										<div
											className="bg-primary-red h-2 rounded-full transition-all duration-300"
											style={{ width: `${uploadProgress}%` }}
										/>
									</div>
								)}
							</div>
						</div>

						{/* Recent Recordings */}
						<div className="bg-background-card rounded-xl p-6 border border-white/10">
							<h3 className="text-lg font-semibold text-white mb-4">
								Recent Recordings
							</h3>
							<div className="space-y-3">
								{recordings.length === 0 ? (
									<p className="text-gray-400 text-sm">No recordings yet</p>
								) : (
									recordings.map((recording, index) => (
										<div
											key={index}
											className="flex items-center justify-between p-3 bg-black/20 rounded-lg border border-white/10"
										>
											<div className="flex items-center space-x-3">
												<Download className="w-5 h-5 text-gray-400" />
												<div>
													<p className="text-white text-sm font-medium">
														{recording.name}
													</p>
													<p className="text-gray-400 text-xs">
														{new Date(recording.date).toLocaleDateString()}
													</p>
												</div>
											</div>
											<button className="text-primary-red hover:text-red-400 transition-colors">
												Download
											</button>
										</div>
									))
								)}
							</div>
						</div>
					</div>
				</div>
			</main>
		</div>
	);
}
