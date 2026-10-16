#!/usr/bin/env python3
"""Tiny HTTP load generator (standard library only) for the HPA and Grafana demos.

Examples:
    python scripts/load-test.py --url http://localhost:8000/api/tasks
    python scripts/load-test.py --url http://taskboard.local/api/tasks/stats -c 40 -d 180

Watch the effect in another terminal:
    kubectl get hpa -n taskboard -w
"""

import argparse
import statistics
import threading
import time
import urllib.error
import urllib.request
from collections import Counter
from concurrent.futures import ThreadPoolExecutor


def worker(url: str, deadline: float, stop: threading.Event, latencies: list, codes: Counter, lock: threading.Lock) -> None:
    while time.monotonic() < deadline and not stop.is_set():
        started = time.perf_counter()
        try:
            with urllib.request.urlopen(url, timeout=10) as response:
                response.read()
                code = str(response.status)
        except urllib.error.HTTPError as exc:
            code = str(exc.code)
        except Exception as exc:  # connection refused, timeout, ...
            code = type(exc).__name__
        elapsed = time.perf_counter() - started
        with lock:
            latencies.append(elapsed)
            codes[code] += 1


def percentile(values: list, pct: float) -> float:
    if not values:
        return 0.0
    ordered = sorted(values)
    index = min(len(ordered) - 1, int(round(pct / 100 * (len(ordered) - 1))))
    return ordered[index]


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--url", default="http://localhost:8000/api/tasks", help="endpoint to hit")
    parser.add_argument("-c", "--concurrency", type=int, default=20, help="parallel workers")
    parser.add_argument("-d", "--duration", type=int, default=120, help="seconds to run")
    args = parser.parse_args()

    latencies: list = []
    codes: Counter = Counter()
    lock = threading.Lock()
    stop = threading.Event()
    deadline = time.monotonic() + args.duration

    print(f"Hitting {args.url} with {args.concurrency} workers for {args.duration}s (Ctrl+C to stop)")
    started = time.monotonic()
    pool = ThreadPoolExecutor(max_workers=args.concurrency)
    try:
        for _ in range(args.concurrency):
            pool.submit(worker, args.url, deadline, stop, latencies, codes, lock)
        while time.monotonic() < deadline:
            time.sleep(min(5, max(0.1, deadline - time.monotonic())))
            with lock:
                done = len(latencies)
            print(f"  {int(time.monotonic() - started):>4}s  {done:>7} requests  {done / (time.monotonic() - started):7.1f} req/s")
    except KeyboardInterrupt:
        print("\nStopping...")
    finally:
        stop.set()
        pool.shutdown(wait=True)

    elapsed = time.monotonic() - started
    with lock:
        total = len(latencies)
        print("\nResults")
        print(f"  requests     {total}")
        print(f"  throughput   {total / elapsed:.1f} req/s")
        if latencies:
            print(f"  latency avg  {statistics.mean(latencies) * 1000:.1f} ms")
            print(f"  latency p50  {percentile(latencies, 50) * 1000:.1f} ms")
            print(f"  latency p95  {percentile(latencies, 95) * 1000:.1f} ms")
        print(f"  responses    {dict(codes)}")


if __name__ == "__main__":
    main()
