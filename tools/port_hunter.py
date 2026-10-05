import socket
import os
import sys
import subprocess
import time

PREFERRED_PORTS = [3000, 5173, 8000, 8080, 8088, 8888, 4200]

def is_port_free(port, host='127.0.0.1'):
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.settimeout(0.5)
        return s.connect_ex((host, port)) != 0

def find_free_port(start=3000, max_port=9000, preferred=None):
    if preferred is None:
        preferred = PREFERRED_PORTS
        
    for p in preferred:
        if is_port_free(p):
            return p
            
    for p in range(start, max_port):
        if is_port_free(p):
            return p
            
    raise RuntimeError(f"No available ports found between {start} and {max_port}")

def check_or_hunt(desired_port):
    if is_port_free(desired_port):
        return desired_port, False
    free_p = find_free_port()
    return free_p, True

if __name__ == "__main__":
    if len(sys.argv) > 1:
        req_port = int(sys.argv[1])
        port, changed = check_or_hunt(req_port)
        if changed:
            print(f"Port {req_port} was occupied! Auto-assigned free port: {port}")
        else:
            print(f"Port {req_port} is available and ready!")
    else:
        p = find_free_port()
        print(f"Recommended free port: {p}")
