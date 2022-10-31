CREATE TYPE "event-status" AS ENUM
    ('InReview', 'Approved', 'Rejected', 'Deleted');

CREATE TABLE IF NOT EXISTS events
(
    id SERIAL NOT NULL PRIMARY KEY,
    title varchar(38) NOT NULL,
    description varchar(240) NOT NULL,
    event_date timestamp with time zone NOT NULL,
    media_files json[],
    status "event-status" NOT NULL,
    rejection_reason varchar(38),
    rejection_note varchar(240),
    created_date timestamp with time zone NOT NULL,
    created_by varchar(100) NOT NULL,
    last_updated_date timestamp with time zone NOT NULL,
    last_updated_by varchar(100) NOT NULL
);
