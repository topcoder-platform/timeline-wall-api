const { ForbiddenError, NotFoundError } = require("../errors/custom-errors");
const { toReducedTimelineEvent, toCompleteTimelineEvent } = require("../models/dto-helpers");
const helper = require('./helpers')
const constants = require('../../constants')

module.exports = class TimelineEventService {
    constructor(timelineEventRepository) {
        this.timelineEventRepository = timelineEventRepository
    }

    async getApprovedEvents() {
        const events = await this.timelineEventRepository.getEventsWithStatus('Approved')
        return events.map(toReducedTimelineEvent)
    }

    async getInReviewEvents(authUser) {
        if (!authUser.isAdmin) {
            throw new ForbiddenError('Only admin users can view events in review.')
        }

        const events = await this.timelineEventRepository.getEventsWithStatus('InReview')
        return events.map(toReducedTimelineEvent)
    }

    async addEvent(title, description, eventDate, mediaFiles, authUser) {

        const status = authUser.isAdmin ? 'Approved' : 'InReview'

        console.log(`INFO: uploading media files`)
        const numOfFiles = (mediaFiles || []).length
        let fileUrls = []
        for (var i = 0; i < numOfFiles; i++) {
            const file = mediaFiles[i]
            console.log(`INFO: Uploading file #${i + 1}: ${file.name}`)
            const url = await helper.uploadMedia(file, numOfFiles)
            fileUrls.push(url)
            console.log(`INFO: File #${i + 1} uploaded, url: ${url}`)
        }

        console.log(`INFO: Saving the Event to Database`)
        const result = await this.timelineEventRepository.addEvent(title, description, eventDate, fileUrls, status, authUser.handle)

        const completeTimelineEvent = toCompleteTimelineEvent(result)

        console.log(`INFO: Sending the email`)
        await helper.sendEmail(constants.NotificationTypes.EVENT_CREATED, [{ email: /*authUser.email*/ 'i.s.goroshko@gmail.com' }],
            completeTimelineEvent)

        return completeTimelineEvent
    }

    async getEventById(event_id) {
        return await this.timelineEventRepository.getEventById(event_id)
    }

    async deleteEvent(event_id, authUser) {
        if (!authUser.isAdmin) {
            throw new ForbiddenError('Only admin users can delete events.')
        }

        await this.timelineEventRepository.deleteEvent(event_id, authUser.handle)
    }

    async approveEvent(event_id, authUser) {
        if (!authUser.isAdmin) {
            throw new ForbiddenError('Only admin users can approve events.')
        }

        const eventToApprove = await this.getEventById(event_id)
        if (eventToApprove.status !== 'InReview') {
            throw new NotFoundError(`Event with id ${event_id} is not under review`)
        }

        const result = await this.timelineEventRepository.approveEvent(event_id, authUser.handle)

        const completeEvent = toCompleteTimelineEvent(result)

        const email = await helper.getEmail(completeEvent.createdBy)

        await helper.sendEmail(constants.NotificationTypes.EVENT_APPROVED, [{ email: /*email*/ 'i.s.goroshko@gmail.com' }],
            completeEvent)
    }

    async rejectEvent(event_id, reason, note, authUser) {
        if (!authUser.isAdmin) {
            throw new ForbiddenError('Only admin users can reject events.')
        }

        const eventToReject = await this.getEventById(event_id)
        if (eventToReject.status !== 'InReview') {
            throw new NotFoundError(`Event with id ${event_id} is not under review`)
        }

        const result = await this.timelineEventRepository.rejectEvent(event_id, reason, note, authUser.handle)

        const completeEvent = toCompleteTimelineEvent(result)

        let email = await helper.getEmail(completeEvent.createdBy)

        await helper.sendEmail(constants.NotificationTypes.EVENT_REJECTED, [{ email: /*email */ 'i.s.goroshko@gmail.com' }],
            completeEvent)
    }
}
