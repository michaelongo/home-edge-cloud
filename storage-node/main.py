from storage_manager import StorageManager
from scheduler import StorageScheduler


def main():

    print(
        "\n================================"
    )

    print(
        "     HOME EDGE CLOUD"
    )

    print(
        "       STORAGE NODE"
    )

    print(
        "================================\n"
    )


    manager = StorageManager()

    manager.initialize()

    status = manager.get_status()


    print("SSD STATUS")
    print("----------")

    print(
        f"Available: "
        f"{status['ssd']['available']}"
    )

    print(
        f"Total: "
        f"{status['ssd']['total_gb']} GB"
    )

    print(
        f"Used: "
        f"{status['ssd']['used_gb']} GB"
    )

    print(
        f"Free: "
        f"{status['ssd']['free_gb']} GB"
    )

    print(
        f"Usage: "
        f"{status['ssd']['usage_percent']}%"
    )


    print("\nHDD STATUS")
    print("----------")

    print(
        f"Available: "
        f"{status['hdd']['available']}"
    )

    print(
        f"Total: "
        f"{status['hdd']['total_gb']} GB"
    )

    print(
        f"Used: "
        f"{status['hdd']['used_gb']} GB"
    )

    print(
        f"Free: "
        f"{status['hdd']['free_gb']} GB"
    )

    print(
        f"Usage: "
        f"{status['hdd']['usage_percent']}%"
    )


    print("\nSCHEDULER TEST")
    print("--------------")


    scheduler = StorageScheduler()


    result = scheduler.schedule_file(
        "test.txt",
        1024
    )


    print(
        result
    )


if __name__ == "__main__":

    main()