const { getPool } = require("./repositories/db-helper");
const config = require("../config")
const express = require('express')
const TimelineEventsController = require('./controllers/TimelineEventsController')
const TimelineEventsService = require('./services/TimelineEventService')
const TimelineEventsRepository = require('./repositories/TimelineEventsRepository')

const AuthController = require('./controllers/AuthController')
const HealthController = require('./controllers/HealthController')

const timelineEventsRepository = new TimelineEventsRepository(getPool())
const timelineEventsService = new TimelineEventsService(timelineEventsRepository)
const timelineEventsController = new TimelineEventsController(timelineEventsService)

const authController = new AuthController()
const healthController = new HealthController()

module.exports = {
    [`${config.API_PREFIX}/timeLineEvents`]: {
        get: {
            method: timelineEventsController.getTimelineEvents.bind(timelineEventsController),
            auth: false
        },
        post: {
            method: timelineEventsController.addTimelineEvent.bind(timelineEventsController),
            auth: true
        }
    },
    [`${config.API_PREFIX}/timelineEvents/review`]: {
        get: {
            method: timelineEventsController.getTimelineEventsInReview.bind(timelineEventsController),
            auth: true
        }
    },
    [`${config.API_PREFIX}/timelineEvents/:event_id`]: {
        get: {
            method: timelineEventsController.getTimelineEventById.bind(timelineEventsController),
            auth: false
        },
        delete: {
            method: timelineEventsController.deleteTimelineEvent.bind(timelineEventsController),
            auth: true
        }
    },
    [`${config.API_PREFIX}/timelineEvents/:event_id/approve`]: {
        put: {
            method: timelineEventsController.approveTimelineEvent.bind(timelineEventsController),
            auth: true
        }
    },
    [`${config.API_PREFIX}/timelineEvents/:event_id/reject`]: {
        put: {
            method: timelineEventsController.rejectTimelineEvent.bind(timelineEventsController),
            auth: true
        }
    },
    [`${config.API_PREFIX}/auth/currentUser`]: {
        get: {
            method: authController.getCurrentUserDetails.bind(authController),
            auth: true
        }
    },
    [`${config.API_PREFIX}/health`]: {
        get: {
            method: healthController.checkHealth.bind(healthController),
            auth: false
        }
    }

}