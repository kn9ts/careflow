import { Device } from "@twilio/voice-sdk";

class TwilioService {
	constructor() {
		this.device = null;
		this.connection = null;
		this.listeners = new Map();
	}

	async initialize() {
		try {
			const response = await fetch("/api/twilio/token");
			const { token } = await response.json();

			this.device = new Device(token, {
				codecPreferences: ["opus", "pcmu"],
				debug: process.env.NODE_ENV === "development",
			});

			this.setupEventListeners();
			return true;
		} catch (error) {
			console.error("Error initializing Twilio:", error);
			return false;
		}
	}

	setupEventListeners() {
		this.device.on("ready", () => {
			this.emit("ready");
		});

		this.device.on("error", (error) => {
			this.emit("error", error);
		});

		this.device.on("connect", (connection) => {
			this.connection = connection;
			this.emit("connect", connection);
		});

		this.device.on("disconnect", () => {
			this.connection = null;
			this.emit("disconnect");
		});

		this.device.on("incoming", (connection) => {
			this.connection = connection;
			this.emit("incoming", connection);
		});
	}

	async connect(params = {}) {
		if (!this.device) {
			throw new Error("Twilio device not initialized");
		}

		this.connection = this.device.connect(params);
		return this.connection;
	}

	disconnect() {
		if (this.connection) {
			this.connection.disconnect();
			this.connection = null;
		}
	}

	mute(muted = true) {
		if (this.connection) {
			this.connection.mute(muted);
		}
	}

	sendDigits(digits) {
		if (this.connection) {
			this.connection.sendDigits(digits);
		}
	}

	on(event, callback) {
		if (!this.listeners.has(event)) {
			this.listeners.set(event, new Set());
		}
		this.listeners.get(event).add(callback);
	}

	off(event, callback) {
		if (this.listeners.has(event)) {
			this.listeners.get(event).delete(callback);
		}
	}

	emit(event, ...args) {
		if (this.listeners.has(event)) {
			this.listeners.get(event).forEach((callback) => {
				callback(...args);
			});
		}
	}

	destroy() {
		if (this.device) {
			this.device.destroy();
			this.device = null;
		}
		this.connection = null;
		this.listeners.clear();
	}
}

export const twilioService = new TwilioService();
