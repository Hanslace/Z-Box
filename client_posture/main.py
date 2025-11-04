# posture_agent.py
import json
import platform
import socket
import getpass
import subprocess
import datetime

import requests   # pip install requests
import psutil     # pip install psutil

ADMIN_PORTAL = "http://10.10.0.1:3000/api/posture-check"


def firewall_enabled_windows() -> bool:
    if platform.system() != "Windows":
        return False
    try:
        out = subprocess.check_output(
            ["netsh", "advfirewall", "show", "allprofiles"],
            text=True,
            timeout=3,
        )
        return "State                                 ON" in out
    except Exception:
        return False


def get_processes(max_count: int = 50):
    names = []
    for p in psutil.process_iter(attrs=["name"]):
        n = p.info.get("name")
        if n:
            names.append(n)
    return names[:max_count]


def main():
    data = {
        # wireguard tunnel IP if you can determine it; keep None for now
        "wg_ip": None,
        # hostname and local user help you identify the device
        "hostname": socket.gethostname(),
        "username": getpass.getuser(),
        # os and release
        "os": f"{platform.system()} {platform.release()}",
        "kernel": platform.version(),
        # security signals
        "firewall_enabled": firewall_enabled_windows(),
        # running processes
        "processes": get_processes(),
        # when this report was generated
        "reported_at": datetime.datetime.utcnow().isoformat() + "Z",
    }

    resp = requests.post(ADMIN_PORTAL, json=data, timeout=5)
    print(resp.status_code, resp.text)


if __name__ == "__main__":
    main()
