import "./globals.css";
import { Inter } from "next/font/google";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
	title: "CareFlow",
	description: "Make and receive phone calls in your browser",
};

export default function RootLayout({ children }) {
	return (
		<html lang="en">
			<body
				className={`${inter.className} bg-background-dark text-white min-h-screen`}
			>
				{children}
			</body>
		</html>
	);
}
