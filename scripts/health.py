#!/usr/bin/env python3
"""
health.py - CloudDeploy System Monitoring Automation

Runs continuously (or via cron) and, every interval (default 60s):
  - Checks CPU usage
  - Checks RAM usage
  - Checks Disk usage
  - Logs a timestamped entry to a local log file
  - Optionally uploads the log file to Amazon S3

Usage:
    python3 health.py                # run forever, once every 60s
    python3 health.py --once         # run a single check and exit
    python3 health.py --interval 30  # custom interval in seconds

Dependencies:
    pip install psutil boto3
"""

import argparse
import json
import logging
import os
import time
from datetime import datetime, timezone
from logging.handlers import RotatingFileHandler

try:
    import psutil
except ImportError:
    raise SystemExit("Missing dependency 'psutil'. Install with: pip install psutil")

LOG_DIR = os.environ.get("HEALTH_LOG_DIR", os.path.join(os.path.dirname(__file__), "..", "logs"))
LOG_FILE = os.path.join(LOG_DIR, "health.log")
S3_BUCKET = os.environ.get("S3_BUCKET_NAME")
S3_LOG_PREFIX = os.environ.get("S3_LOG_PREFIX", "monitoring-logs/")
AWS_REGION = os.environ.get("AWS_REGION", "us-east-1")

os.makedirs(LOG_DIR, exist_ok=True)

logger = logging.getLogger("clouddeploy.health")
logger.setLevel(logging.INFO)
file_handler = RotatingFileHandler(LOG_FILE, maxBytes=5 * 1024 * 1024, backupCount=3)
file_handler.setFormatter(logging.Formatter("%(message)s"))
logger.addHandler(file_handler)
console_handler = logging.StreamHandler()
console_handler.setFormatter(logging.Formatter("%(message)s"))
logger.addHandler(console_handler)


def collect_metrics() -> dict:
    """Collect CPU, RAM, and disk metrics as a structured dict."""
    cpu_percent = psutil.cpu_percent(interval=1)
    memory = psutil.virtual_memory()
    disk = psutil.disk_usage("/")

    return {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "cpu_usage_percent": cpu_percent,
        "memory": {
            "total_mb": round(memory.total / 1024 / 1024, 2),
            "used_mb": round(memory.used / 1024 / 1024, 2),
            "usage_percent": memory.percent,
        },
        "disk": {
            "total_gb": round(disk.total / 1024 / 1024 / 1024, 2),
            "used_gb": round(disk.used / 1024 / 1024 / 1024, 2),
            "usage_percent": disk.percent,
        },
    }


def log_metrics(metrics: dict) -> None:
    """Append the metrics entry as a single JSON line to the log file."""
    logger.info(json.dumps(metrics))


def upload_log_to_s3() -> None:
    """Best-effort upload of the local log file to S3. Skips silently if
    boto3 isn't installed or S3_BUCKET_NAME isn't configured, since S3
    upload is a bonus feature and shouldn't crash local monitoring."""
    if not S3_BUCKET:
        return

    try:
        import boto3
        from botocore.exceptions import ClientError

        s3 = boto3.client("s3", region_name=AWS_REGION)
        key = f"{S3_LOG_PREFIX}health-{datetime.now(timezone.utc).strftime('%Y-%m-%d')}.log"
        s3.upload_file(LOG_FILE, S3_BUCKET, key)
        print(f"[health.py] Uploaded log to s3://{S3_BUCKET}/{key}")
    except ImportError:
        print("[health.py] boto3 not installed; skipping S3 upload. Install with: pip install boto3")
    except ClientError as e:
        print(f"[health.py] S3 upload failed: {e}")
    except Exception as e:  # noqa: BLE001 - defensive catch-all for cron reliability
        print(f"[health.py] Unexpected error during S3 upload: {e}")


def run_once() -> None:
    metrics = collect_metrics()
    log_metrics(metrics)
    upload_log_to_s3()


def run_forever(interval_seconds: int) -> None:
    print(f"[health.py] Starting CloudDeploy monitoring loop every {interval_seconds}s. Logs: {LOG_FILE}")
    while True:
        try:
            run_once()
        except Exception as e:  # noqa: BLE001 - keep the monitoring loop alive
            print(f"[health.py] Error during metrics collection: {e}")
        time.sleep(interval_seconds)


def main() -> None:
    parser = argparse.ArgumentParser(description="CloudDeploy system health monitor")
    parser.add_argument("--once", action="store_true", help="Run a single check and exit")
    parser.add_argument("--interval", type=int, default=60, help="Seconds between checks (default 60)")
    args = parser.parse_args()

    if args.once:
        run_once()
    else:
        run_forever(args.interval)


if __name__ == "__main__":
    main()
