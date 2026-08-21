import shutil
from pathlib import Path


def get_disk_information(path: Path):

    if not path.exists():

        return {
            "available": False,
            "total_bytes": 0,
            "used_bytes": 0,
            "free_bytes": 0,
            "total_gb": 0,
            "used_gb": 0,
            "free_gb": 0,
            "usage_percent": 0
        }


    total, used, free = shutil.disk_usage(path)


    return {
        "available": True,

        "total_bytes": total,

        "used_bytes": used,

        "free_bytes": free,

        "total_gb":
            round(total / (1024 ** 3), 2),

        "used_gb":
            round(used / (1024 ** 3), 2),

        "free_gb":
            round(free / (1024 ** 3), 2),

        "usage_percent":
            round((used / total) * 100, 2)
            if total else 0
    }