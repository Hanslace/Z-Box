# posture_agent.py
import platform
import socket
import getpass
import subprocess
import datetime
import re
import json

import requests   # pip install requests
import psutil     # pip install psutil

ADMIN_PORTAL = "http://10.10.0.1:3000/api/posture-check"
# adjust to your WG subnet prefix so we can pick the right IP from ipconfig
WG_PREFIX = "10.10."   # e.g. your tunnel is 10.10.0.0/16


def run_cmd(cmd):
    try:
        return subprocess.check_output(cmd, text=True, stderr=subprocess.STDOUT)
    except Exception:
        return ""


def get_wg_ip_windows():
    """
    Strategy:
    1. ipconfig -> find sections that look like WireGuard or any IPv4 in WG_PREFIX
    2. netsh interface ip show addresses -> secondary
    """
    out = run_cmd(["ipconfig"])
    # first: try to pick any IPv4 that starts with WG_PREFIX
    ips = re.findall(r"IPv4 Address[^\d]*([\d\.]+)", out)
    for ip in ips:
        if ip.startswith(WG_PREFIX):
            return ip

    # second: try netsh
    out = run_cmd(["netsh", "interface", "ip", "show", "addresses"])
    ips = re.findall(r"IP Address:\s+([\d\.]+)", out)
    for ip in ips:
        if ip.startswith(WG_PREFIX):
            return ip

    return None


def get_wg_ip_linux(iface="wg0"):
    out = run_cmd(["ip", "addr", "show", iface])
    m = re.search(r"inet (\d+\.\d+\.\d+\.\d+)", out)
    if m:
        return m.group(1)
    return None


def get_wg_ip():
    system = platform.system()
    if system == "Windows":
        return get_wg_ip_windows()
    if system == "Linux":
        return get_wg_ip_linux()
    return None


def firewall_enabled_windows() -> bool:
    if platform.system() != "Windows":
        return False
    out = run_cmd(["netsh", "advfirewall", "show", "allprofiles"])
    return "State                                 ON" in out


def get_processes(max_count: int = 50):
    names = []
    for p in psutil.process_iter(attrs=["name"]):
        n = p.info.get("name")
        if n:
            names.append(n)
    return names[:max_count]


def main():
    wg_ip = get_wg_ip()
    data = {
        "wg_ip": wg_ip,
        "hostname": socket.gethostname(),
        "username": getpass.getuser(),
        "os": f"{platform.system()} {platform.release()}",
        "kernel": platform.version(),
        "firewall_enabled": firewall_enabled_windows(),
        "processes": get_processes(),
        "reported_at": datetime.datetime.utcnow().isoformat() + "Z",
    }

    print("sending posture:")
    

    try:
        resp = requests.post(ADMIN_PORTAL, json=data, timeout=5)
        print("server:", resp.status_code, resp.text)
    except Exception as e:
        print("post failed:", e)


if __name__ == "__main__":
    main()
