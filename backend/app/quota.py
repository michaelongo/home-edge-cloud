from sqlalchemy.orm import Session


DEFAULT_QUOTA_BYTES = (
    200 * 1024 * 1024 * 1024
)


def get_user_usage(
    db: Session,
    user_id: int
):

    from app.models import File


    files = (
        db.query(File)
        .filter(
            File.user_id == user_id
        )
        .all()
    )


    total = 0


    for file in files:

        total += file.size


    return total


def has_available_space(
    db: Session,
    user_id: int,
    new_file_size: int
):

    current_usage = (
        get_user_usage(
            db,
            user_id
        )
    )


    return (
        current_usage
        + new_file_size
        <= DEFAULT_QUOTA_BYTES
    )