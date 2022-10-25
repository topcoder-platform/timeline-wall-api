INSERT INTO events (
        title,
        description,
        event_date,
        media_files,
        status,
        rejection_reason,
        rejection_note,
        created_date,
        created_by,
        last_updated_date,
        last_updated_by
)
VALUES
    ('My Event', 'Event description', NOW(), '{}', 'InReview', NULL, NULL, NOW(), 'TestUser', NOW(), 'TestUser'),
    ('My Event2', 'Event description 2', NOW(), '{}', 'InReview', NULL, NULL, NOW(), 'TestUser', NOW(), 'TestUser'),
    ('My Event3', 'Event description 3', NOW(), '{}', 'InReview', NULL, NULL, NOW(), 'TestUser', NOW(), 'TestUser'),
    ('My Event4', 'Event description 3', NOW(), '{}', 'Approved', NULL, NULL, NOW(), 'TestUser', NOW(), 'TestUser'),
    ('My Event5', 'Event description 5', NOW(), '{}', 'Approved', NULL, NULL, NOW(), 'TestUser', NOW(), 'TestUser'),
    ('My Event6', 'Event description 6', NOW(), '{}', 'Approved', NULL, NULL, NOW(), 'TestUser', NOW(), 'TestUser');
