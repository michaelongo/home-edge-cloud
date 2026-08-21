from storage_manager import StorageManager


class StorageScheduler:

    def __init__(self):

        self.storage_manager = (
            StorageManager()
        )


    def schedule_file(
        self,
        filename,
        file_size
    ):

        destination = (
            self.storage_manager
            .select_storage(
                file_size
            )
        )


        if destination is None:

            return {

                "scheduled": False,

                "reason":
                    "No storage device has enough space",

                "filename":
                    filename

            }


        return {

            "scheduled": True,

            "filename":
                filename,

            "destination":
                str(destination)

        }