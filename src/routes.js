const { getPool } = require("./repositories/db-helper");
express = require('express')
TimelineEventsController = require('./controllers/TimelineEventsController')
TimelineEventsService = require('./services/TimelineEventService')
TimelineEventsRepository = require('./repositories/TimelineEventsRepository')

AuthController = require('./controllers/AuthController')
HealthController = require('./controllers/HealthController')

timelineEventsRepository =  new TimelineEventsRepository(getPool())
timelineEventsService = new TimelineEventsService(timelineEventsRepository)
timelineEventsController = new TimelineEventsController(timelineEventsService)

authController = new AuthController()
healthController = new HealthController()

module.exports = {
    '/timeLineEvents': {
        get: {
            method: timelineEventsController.getTimelineEvents.bind(timelineEventsController),
            auth: false
        },
        post: {
            method: timelineEventsController.addTimelineEvent.bind(timelineEventsController),
            auth: true
        }
    },
    '/timelineEvents/review': {
        get: {
            method: timelineEventsController.getTimelineEventsInReview.bind(timelineEventsController),
            auth: true
        }
    },
    '/timelineEvents/:event_id': {
        get: {
            method: timelineEventsController.getTimelineEventById.bind(timelineEventsController),
            auth: false
        },
        delete: {
            method: timelineEventsController.deleteTimelineEvent.bind(timelineEventsController),
            auth: true
        }
    },
    '/timelineEvents/:event_id/approve': {
        put: {
            method: timelineEventsController.approveTimelineEvent.bind(timelineEventsController),
            auth: true
        }
    },
    '/timelineEvents/:event_id/reject': {
        put: {
            method: timelineEventsController.rejectTimelineEvent.bind(timelineEventsController),
            auth: true
        }
    },
    '/auth/currentUser': {
        get: {
            method: authController.getCurrentUserDetails.bind(authController),
            auth: true
        }
    },
    '/health': {
        get: {
            method: healthController.checkHealth.bind(healthController),
            auth: false
        }
    }

}