from pathlib import Path


# ==================================================
# HOME EDGE CLOUD STORAGE CONFIGURATION
# ==================================================

# Change these paths later on the desktop to the
# actual SSD/HDD locations.

SSD_PATH = Path("storage/ssd")

HDD_PATH = Path("storage/hdd")


# Minimum free space before a disk is considered
# close to full.

MIN_FREE_SPACE_GB = 5


# Maximum number of files that can be processed
# simultaneously by the scheduler.

MAX_CONCURRENT_UPLOADS = 2