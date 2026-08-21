import hashlib
import shutil
from pathlib import Path


# ==================================================
# STORAGE DIRECTORY SETUP
# ==================================================

def ensure_storage_directories(
    ssd_path,
    hdd_path
):
    """
    Create the SSD and HDD storage directories
    if they do not already exist.
    """

    ssd = Path(ssd_path)
    hdd = Path(hdd_path)

    ssd.mkdir(
        parents=True,
        exist_ok=True
    )

    hdd.mkdir(
        parents=True,
        exist_ok=True
    )


# ==================================================
# SHA-256 HASH
# ==================================================

def calculate_hash(
    file_path
):
    """
    Calculate SHA-256 hash of a stored file.
    """

    sha256 = hashlib.sha256()

    with open(
        file_path,
        "rb"
    ) as file:

        while True:

            chunk = file.read(
                1024 * 1024
            )

            if not chunk:
                break

            sha256.update(chunk)

    return sha256.hexdigest()


# ==================================================
# DISK INFORMATION
# ==================================================

def get_disk_information(
    path
):
    """
    Return information about a storage location.
    """

    path = Path(path)

    if not path.exists():

        return {
            "online": False,
            "total_bytes": 0,
            "used_bytes": 0,
            "free_bytes": 0,
            "total_gb": 0,
            "used_gb": 0,
            "free_gb": 0,
            "usage_percent": 0
        }


    total, used, free = (
        shutil.disk_usage(path)
    )


    return {

        "online": True,

        "total_bytes": total,

        "used_bytes": used,

        "free_bytes": free,

        "total_gb":
            round(
                total / (1024 ** 3),
                2
            ),

        "used_gb":
            round(
                used / (1024 ** 3),
                2
            ),

        "free_gb":
            round(
                free / (1024 ** 3),
                2
            ),

        "usage_percent":
            round(
                (used / total) * 100,
                2
            )
    }


# ==================================================
# STORAGE STATUS
# ==================================================

def get_storage_status(
    ssd_path,
    hdd_path
):
    """
    Return complete SSD/HDD status.
    """

    ssd = get_disk_information(
        ssd_path
    )

    hdd = get_disk_information(
        hdd_path
    )

    return {

        "ssd": ssd,

        "hdd": hdd,

        "any_available":
            ssd["online"] or
            hdd["online"]

    }


# ==================================================
# SELECT STORAGE LOCATION
# ==================================================

def select_storage_location(
    file_size,
    ssd_path,
    hdd_path
):
    """
    Select the best available storage location.

    Current policy:
        1. Prefer SSD.
        2. Fall back to HDD.
        3. Return None if neither has enough space.
    """

    ssd = get_disk_information(
        ssd_path
    )

    hdd = get_disk_information(
        hdd_path
    )


    # ----------------------------------------------
    # Prefer SSD
    # ----------------------------------------------

    if (
        ssd["online"]
        and
        ssd["free_bytes"] >= file_size
    ):

        return {
            "location": "SSD",
            "path": Path(ssd_path)
        }


    # ----------------------------------------------
    # Fall back to HDD
    # ----------------------------------------------

    if (
        hdd["online"]
        and
        hdd["free_bytes"] >= file_size
    ):

        return {
            "location": "HDD",
            "path": Path(hdd_path)
        }


    # ----------------------------------------------
    # No suitable storage
    # ----------------------------------------------

    return None