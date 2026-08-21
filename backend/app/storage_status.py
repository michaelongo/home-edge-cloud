from pathlib import Path

SSD_PATH = Path(r"E:\home-edge-cloud-storage\ssd")
HDD_PATH = Path(r"E:\home-edge-cloud-storage\hdd")


def get_storage_status():

    return {
        "ssd_online": SSD_PATH.exists(),
        "hdd_online": HDD_PATH.exists(),
        "ssd_path": str(SSD_PATH),
        "hdd_path": str(HDD_PATH)
    }