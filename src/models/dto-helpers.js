function toReducedTimelineEvent(eventDto) {
    return {
        id: eventDto.id,
        title: eventDto.title,
        description: eventDto.description,
        eventDate: eventDto.event_date,
        mediaFiles: eventDto.media_files,
        createdDate: eventDto.created_date,
        createdBy: eventDto.created_by,
    }
}

function toCompleteTimelineEvent(eventDto) {
    return {
        id: eventDto.id,
        title: eventDto.title,
        description: eventDto.description,
        eventDate: eventDto.event_date,
        mediaFiles: eventDto.media_files,
        status: eventDto.status,
        rejectionReason: eventDto.rejection_reason,
        rejectionNote: eventDto.rejection_note,
        createdDate: eventDto.created_date,
        createdBy: eventDto.created_by,
        lastUpdatedDate: eventDto.last_updated_date,
        lastUpdatedBy: eventDto.last_updated_by,
    }
}

module.exports = {
    toReducedTimelineEvent,
    toCompleteTimelineEvent
}