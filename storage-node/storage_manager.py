from pathlib import Path
from config import SSD_PATH, HDD_PATH
from disk_monitor import get_disk_information


class StorageManager:

    def __init__(self):

        self.ssd_path = SSD_PATH

        self.hdd_path = HDD_PATH


    # ==================================================
    # INITIALIZE STORAGE DIRECTORIES
    # ==================================================

    def initialize(self):

        self.ssd_path.mkdir(
            parents=True,
            exist_ok=True
        )

        self.hdd_path.mkdir(
            parents=True,
            exist_ok=True
        )


    # ==================================================
    # GET STORAGE STATUS
    # ==================================================

    def get_status(self):

        return {

            "ssd":
                get_disk_information(
                    self.ssd_path
                ),

            "hdd":
                get_disk_information(
                    self.hdd_path
                )

        }


    # ==================================================
    # SELECT STORAGE LOCATION
    # ==================================================

    def select_storage(self, file_size):

        ssd_info = get_disk_information(
                self.ssd_path
            )

        hdd_info = get_disk_information(
                self.hdd_path
            )


        required_space = file_size


        # Prefer SSD for smaller/new files.

        if (
            ssd_info["available"]
            and
            ssd_info["free_bytes"]
            >= required_space
        ):

            return self.ssd_path


        # Otherwise use HDD.

        if (
            hdd_info["available"]
            and
            hdd_info["free_bytes"]
            >= required_space
        ):

            return self.hdd_path


        return None