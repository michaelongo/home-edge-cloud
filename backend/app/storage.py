import hashlib
import os
import shutil
from pathlib import Path


def ensure_storage_directories(
    ssd_path: str,
    hdd_path: str
):
    Path(ssd_path).mkdir(
        parents=True,
        exist_ok=True
    )

    Path(hdd_path).mkdir(
        parents=True,
        exist_ok=True
    )


def calculate_hash(file_path: str) -> str:

    sha256 = hashlib.sha256()

    with open(file_path, "rb") as file:

        while chunk := file.read(1024 * 1024):
            sha256.update(chunk)

    return sha256.hexdigest()


def store_file(
    source_path: str,
    destination_name: str,
    ssd_path: str,
    hdd_path: str
):

    ssd_file = Path(ssd_path) / destination_name
    hdd_file = Path(hdd_path) / destination_name

    shutil.copy2(
        source_path,
        ssd_file
    )

    file_hash = calculate_hash(
        str(ssd_file)
    )

    shutil.move(
        str(ssd_file),
        str(hdd_file)
    )

    return str(hdd_file), file_hash