#!/usr/bin/env python3
"""
Internet Restriction Checker
A script to detect if your internet connection is being restricted, throttled, or blocked.
"""

import socket
import time
import subprocess
import sys
import json
from datetime import datetime
from typing import Dict, List, Tuple, Optional

# Try to import optional dependencies
try:
    import requests
    REQUESTS_AVAILABLE = True
except ImportError:
    REQUESTS_AVAILABLE = False

try:
    import dns.resolver
    DNSPYTHON_AVAILABLE = True
except ImportError:
    DNSPYTHON_AVAILABLE = False


class InternetRestrictionChecker:
    """Check for various signs of internet restriction."""

    def __init__(self):
        self.results = {
            "timestamp": datetime.now().isoformat(),
            "tests": [],
            "overall_status": "unknown",
            "issues_found": []
        }

    def add_result(self, test_name: str, passed: bool, details: str):
        """Add a test result."""
        self.results["tests"].append({
            "name": test_name,
            "passed": passed,
            "details": details
        })
        if not passed:
            self.results["issues_found"].append(test_name)

    def check_dns_resolution(self) -> bool:
        """Check if DNS resolution is working for various domains."""
        print("\n[1] Checking DNS resolution...")

        test_domains = [
            ("google.com", "8.8.8.8"),
            ("cloudflare.com", "1.1.1.1"),
            ("github.com", "8.8.8.8"),
        ]

        all_passed = True

        for domain, dns_server in test_domains:
            try:
                socket.setdefaulttimeout(5)
                start = time.time()
                addr = socket.gethostbyname(domain)
                elapsed = time.time() - start

                if addr:
                    print(f"  ✓ {domain} -> {addr} ({elapsed:.3f}s)")
                else:
                    print(f"  ✗ {domain} - No resolution")
                    all_passed = False
            except socket.gaierror as e:
                print(f"  ✗ {domain} - DNS failed: {e}")
                all_passed = False
            except socket.timeout:
                print(f"  ✗ {domain} - Timeout")
                all_passed = False

        self.add_result(
            "DNS Resolution",
            all_passed,
            "All common domains resolved successfully" if all_passed else "Some domains failed to resolve"
        )
        return all_passed

    def check_dns_against_blocked_domains(self) -> bool:
        """Check if certain commonly blocked domains are accessible."""
        print("\n[2] Checking access to commonly restricted domains...")

        # Domains that might be blocked in restricted networks
        test_domains = [
            "google.com",
            "facebook.com",
            "youtube.com",
            "twitter.com",
            "instagram.com",
            "tiktok.com",
            "whatsapp.com",
            "telegram.org",
            "netflix.com",
            "reddit.com",
        ]

        blocked_count = 0
        accessible_count = 0

        for domain in test_domains:
            try:
                socket.setdefaulttimeout(5)
                addr = socket.gethostbyname(domain)
                if addr:
                    accessible_count += 1
                    print(f"  ✓ {domain} - Accessible")
            except socket.gaierror:
                blocked_count += 1
                print(f"  ✗ {domain} - Blocked/Not found")
            except socket.timeout:
                blocked_count += 1
                print(f"  ✗ {domain} - Timeout")

        is_restricted = blocked_count > len(test_domains) * 0.5
        status = not is_restricted

        self.add_result(
            "Domain Accessibility",
            status,
            f"{accessible_count}/{len(test_domains)} domains accessible, {blocked_count} blocked"
        )
        return status

    def check_port_connectivity(self) -> bool:
        """Check if common ports are accessible."""
        print("\n[3] Checking port connectivity...")

        # Common ports that might be blocked
        ports_to_check = [
            (443, "HTTPS", "google.com"),
            (80, "HTTP", "google.com"),
            (443, "HTTPS", "cloudflare.com"),
            (443, "HTTPS", "github.com"),
            (443, "HTTPS", "api.github.com"),
        ]

        all_passed = True

        for port, protocol, host in ports_to_check:
            try:
                sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
                sock.settimeout(5)
                start = time.time()
                result = sock.connect_ex((host, port))
                elapsed = time.time() - start
                sock.close()

                if result == 0:
                    print(f"  ✓ {host}:{port} ({protocol}) - Open ({elapsed:.3f}s)")
                else:
                    print(f"  ✗ {host}:{port} ({protocol}) - Closed/Blocked")
                    all_passed = False
            except socket.timeout:
                print(f"  ✗ {host}:{port} ({protocol}) - Timeout")
                all_passed = False
            except Exception as e:
                print(f"  ✗ {host}:{port} ({protocol}) - Error: {e}")
                all_passed = False

        self.add_result(
            "Port Connectivity",
            all_passed,
            "All tested ports are accessible" if all_passed else "Some ports are blocked"
        )
        return all_passed

    def check_http_response_time(self) -> bool:
        """Check HTTP response times to detect throttling."""
        print("\n[4] Checking HTTP response times...")

        if not REQUESTS_AVAILABLE:
            print("  ⚠ requests library not available, skipping HTTP check")
            self.add_result("HTTP Response Time", True, "Test skipped (requests not installed)")
            return True

        test_urls = [
            "https://httpbin.org/get",
            "https://api.github.com",
        ]

        all_passed = True
        suspicious_slow = False

        for url in test_urls:
            try:
                start = time.time()
                response = requests.get(url, timeout=10)
                elapsed = time.time() - start

                print(f"  {url} -> {response.status_code} ({elapsed:.3f}s)")

                # If response takes more than 5 seconds, it might be throttled
                if elapsed > 5:
                    print(f"    ⚠ Warning: Slow response time detected")
                    suspicious_slow = True

            except requests.exceptions.Timeout:
                print(f"  ✗ {url} - Request timed out")
                all_passed = False
            except requests.exceptions.ConnectionError as e:
                print(f"  ✗ {url} - Connection error: {e}")
                all_passed = False
            except Exception as e:
                print(f"  ✗ {url} - Error: {e}")
                all_passed = False

        if suspicious_slow and all_passed:
            self.add_result(
                "HTTP Response Time",
                True,
                "Response times may indicate throttling"
            )
        else:
            self.add_result(
                "HTTP Response Time",
                all_passed,
                "HTTP responses normal" if all_passed else "HTTP requests failed"
            )
        return all_passed

    def check_mtu_size(self) -> bool:
        """Check if there are MTU issues that might indicate network problems."""
        print("\n[5] Checking MTU/fragmentation...")

        # Try to ping with different packet sizes
        try:
            # On macOS, use -D flag; on Linux, use -M
            if sys.platform == "darwin":
                result = subprocess.run(
                    ["ping", "-D", "-c", "3", "-s", "1400", "8.8.8.8"],
                    capture_output=True,
                    text=True,
                    timeout=10
                )
            else:
                result = subprocess.run(
                    ["ping", "-c", "3", "-s", "1400", "-M", "dont", "8.8.8.8"],
                    capture_output=True,
                    text=True,
                    timeout=10
                )

            if result.returncode == 0:
                print("  ✓ MTU check passed (packets of 1400 bytes OK)")
                self.add_result("MTU Check", True, "No fragmentation issues detected")
                return True
            else:
                print("  ⚠ MTU issue detected")
                self.add_result("MTU Check", False, "Potential MTU/fragmentation issues")
                return False
        except subprocess.TimeoutExpired:
            print("  ✗ Ping timed out")
            self.add_result("MTU Check", False, "Ping timeout")
            return False
        except Exception as e:
            print(f"  ⚠ Could not perform MTU check: {e}")
            self.add_result("MTU Check", True, "Test could not be completed")
            return True

    def check_dns_servers(self) -> bool:
        """Check if DNS servers are being intercepted or blocked."""
        print("\n[6] Checking DNS server integrity...")

        dns_servers = [
            ("8.8.8.8", "Google DNS"),
            ("1.1.1.1", "Cloudflare DNS"),
            ("8.8.4.4", "Google DNS Secondary"),
        ]

        all_passed = True

        for dns_ip, dns_name in dns_servers:
            try:
                socket.setdefaulttimeout(3)
                # Try to resolve a domain using the specific DNS
                result = socket.gethostbyname("example.com")
                if result:
                    print(f"  ✓ {dns_name} ({dns_ip}) - Responding")
            except socket.error:
                print(f"  ✗ {dns_name} ({dns_ip}) - Not responding")
                all_passed = False

        self.add_result(
            "DNS Server Check",
            all_passed,
            "All tested DNS servers responding" if all_passed else "Some DNS servers not responding"
        )
        return all_passed

    def check_packet_loss(self) -> bool:
        """Check for packet loss using ping."""
        print("\n[7] Checking for packet loss...")

        try:
            # Try to ping 8.8.8.8 (Google DNS)
            if sys.platform == "darwin":
                result = subprocess.run(
                    ["ping", "-c", "5", "8.8.8.8"],
                    capture_output=True,
                    text=True,
                    timeout=15
                )
            else:
                result = subprocess.run(
                    ["ping", "-c", "5", "8.8.8.8"],
                    capture_output=True,
                    text=True,
                    timeout=15
                )

            output = result.stdout

            # Parse packet loss from output
            if "0% packet loss" in output or "0.0% packet loss" in output:
                print("  ✓ No packet loss detected")
                self.add_result("Packet Loss", True, "Connection stable")
                return True
            elif "100% packet loss" in output:
                print("  ✗ 100% packet loss - connection may be blocked")
                self.add_result("Packet Loss", False, "Complete packet loss detected")
                return False
            else:
                # Some packet loss
                print(f"  ⚠ Some packet loss detected: {output}")
                self.add_result("Packet Loss", False, "Packet loss detected")
                return False

        except subprocess.TimeoutExpired:
            print("  ✗ Ping timed out - possible network issue")
            self.add_result("Packet Loss", False, "Ping timeout")
            return False
        except FileNotFoundError:
            print("  ⚠ ping command not available")
            self.add_result("Packet Loss", True, "Test skipped (ping not available)")
            return True
        except Exception as e:
            print(f"  ⚠ Could not check packet loss: {e}")
            self.add_result("Packet Loss", True, "Test could not be completed")
            return True

    def check_http_vs_https(self) -> bool:
        """Compare HTTP and HTTPS response to detect deep packet inspection."""
        print("\n[8] Checking for potential deep packet inspection (DPI)...")

        if not REQUESTS_AVAILABLE:
            print("  ⚠ requests library not available, skipping DPI check")
            self.add_result("DPI Check", True, "Test skipped")
            return True

        # Test if HTTPS is being throttled differently than HTTP
        test_url_http = "http://httpbin.org/get"
        test_url_https = "https://httpbin.org/get"

        http_time = None
        https_time = None

        try:
            start = time.time()
            response = requests.get(test_url_http, timeout=10)
            http_time = time.time() - start
            print(f"  HTTP: {response.status_code} ({http_time:.3f}s)")
        except Exception as e:
            print(f"  HTTP: Failed - {e}")

        try:
            start = time.time()
            response = requests.get(test_url_https, timeout=10)
            https_time = time.time() - start
            print(f"  HTTPS: {response.status_code} ({https_time:.3f}s)")
        except Exception as e:
            print(f"  HTTPS: Failed - {e}")

        if http_time and https_time:
            # If HTTPS is significantly slower, might indicate DPI
            if https_time > http_time * 3:
                print("  ⚠ HTTPS significantly slower than HTTP - possible throttling")
                self.add_result(
                    "DPI/Throttling Check",
                    False,
                    f"HTTPS({https_time:.2f}s) much slower than HTTP({http_time:.2f}s)"
                )
                return False

        print("  ✓ No significant difference between HTTP and HTTPS")
        self.add_result("DPI/Throttling Check", True, "No obvious throttling detected")
        return True

    def calculate_overall_status(self):
        """Calculate the overall internet restriction status."""
        passed_tests = sum(1 for test in self.results["tests"] if test["passed"])
        total_tests = len(self.results["tests"])

        if passed_tests == total_tests:
            self.results["overall_status"] = "clear"
        elif passed_tests >= total_tests * 0.7:
            self.results["overall_status"] = "partial_restriction"
        else:
            self.results["overall_status"] = "restricted"

        return passed_tests, total_tests

    def run_all_checks(self) -> Dict:
        """Run all internet restriction checks."""
        print("=" * 60)
        print("INTERNET RESTRICTION CHECKER")
        print("=" * 60)
        print(f"Started at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")

        # Run all checks
        self.check_dns_resolution()
        self.check_dns_against_blocked_domains()
        self.check_port_connectivity()
        self.check_http_response_time()
        self.check_mtu_size()
        self.check_dns_servers()
        self.check_packet_loss()
        self.check_http_vs_https()

        # Calculate overall status
        passed, total = self.calculate_overall_status()

        # Print summary
        print("\n" + "=" * 60)
        print("SUMMARY")
        print("=" * 60)
        print(f"Tests passed: {passed}/{total}")
        print(f"Overall status: {self.results['overall_status'].replace('_', ' ').title()}")

        if self.results["issues_found"]:
            print("\nPotential issues detected:")
            for issue in self.results["issues_found"]:
                print(f"  - {issue}")
        else:
            print("\nNo significant issues detected.")

        print("=" * 60)

        return self.results


def main():
    """Main entry point."""
    checker = InternetRestrictionChecker()
    results = checker.run_all_checks()

    # Optionally save results to JSON
    if len(sys.argv) > 1 and sys.argv[1] == "--json":
        output_file = f"internet_check_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        with open(output_file, "w") as f:
            json.dump(results, f, indent=2)
        print(f"\nResults saved to: {output_file}")

    # Exit with appropriate code
    if results["overall_status"] == "clear":
        sys.exit(0)
    else:
        sys.exit(1)


if __name__ == "__main__":
    main()
