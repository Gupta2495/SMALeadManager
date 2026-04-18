from __future__ import annotations

import logging
from datetime import datetime
from pathlib import Path


def setup_logging(logs_dir: Path, level: int = logging.INFO) -> Path:
    logs_dir.mkdir(parents=True, exist_ok=True)
    ts = datetime.now().strftime("%Y-%m-%d_%H%M%S")
    log_file = logs_dir / f"run_{ts}.log"

    root = logging.getLogger()
    root.setLevel(level)
    for h in list(root.handlers):
        root.removeHandler(h)

    fmt = logging.Formatter("%(asctime)s %(levelname)s %(name)s - %(message)s")

    fh = logging.FileHandler(log_file, encoding="utf-8")
    fh.setFormatter(fmt)
    root.addHandler(fh)

    sh = logging.StreamHandler()
    sh.setLevel(logging.WARNING)
    sh.setFormatter(logging.Formatter("%(levelname)s: %(message)s"))
    root.addHandler(sh)

    return log_file
