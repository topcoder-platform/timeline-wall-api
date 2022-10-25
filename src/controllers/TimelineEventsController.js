const Joi = require('joi')
const {handleErrors} = require("../errors/helper");

module.exports = class TimelineEventsController {

    constructor(timelineEventsService){
        this.timelineEventsService = timelineEventsService


        this.addEventBodySchema = Joi.object({
            title: Joi.string().required().max(50),
            description: Joi.string().required().max(500),
            eventDate: Joi.string().required().custom((value, helper) => {
                const d = Date.parse(value)
                if(isNaN(d)){
                    return helper.message("Date has incorrect format")
                }
                return value
            }),
            mediaFiles: Joi.any().optional(),
        })

        this.paramSchema = Joi.object({
            event_id: Joi.number().min(0).required()
        })

        this.rejectEventBodySchema = Joi.object({
            reason: Joi.string().max(100).required(),
            note: Joi.string().max(500).required(),
        })
    }

    async getTimelineEvents(req, res) {
        try {
            const events = await this.timelineEventsService.getApprovedEvents()
            res.status(200).json(events)
        }catch(err){
            handleErrors(res, err)
        }
    }

    async getTimelineEventsInReview(req, res) {
        try {
            const events = await this.timelineEventsService.getInReviewEvents(req.authUser)
            res.status(200).json(events)
        }catch(err){
            handleErrors(res, err)
        }
    }

    async addTimelineEvent(req, res) {
        const { body } = req
        const { value: { title, description, eventDate }, error: bodyError } = this.addEventBodySchema.validate(body)
        if (bodyError !== undefined) {
            res.status(400).json({ message: bodyError.message })
            return
        }

        let mediaFiles = []
        if(req.files){
            mediaFiles = Array.isArray(req.files.mediaFiles) ? req.files.mediaFiles : [req.files.mediaFiles]
        }

        try {
            const result = await this.timelineEventsService.addEvent(title, description, eventDate, mediaFiles, req.authUser)
            res.status(200).json(result)
        }catch(err){
            handleErrors(res, err)
        }
    }

    async getTimelineEventById(req, res) {
        const { params } = req
        const { value: { event_id }, error: paramsError } = this.paramSchema.validate(params)
        if (paramsError !== undefined) {
            res.status(400).json({ message: paramsError.message })
            return
        }

        try{
            const result = await this.timelineEventsService.getEventById(event_id)
            res.status(200).json(result)
        }catch(err){
            handleErrors(res, err)
        }
    }

    async deleteTimelineEvent(req, res) {
        const { params } = req
        const { value: { event_id }, error: paramsError } = this.paramSchema.validate(params)
        if (paramsError !== undefined) {
            res.status(400).json({ message: paramsError.message })
            return
        }

        try {
            await this.timelineEventsService.deleteEvent(event_id, req.authUser)
            res.sendStatus(200)
        }catch(err) {
            handleErrors(res, err)
        }
    }

    async approveTimelineEvent(req, res) {
        const { params } = req
        const { value: { event_id }, error: paramsError } = this.paramSchema.validate(params)
        if (paramsError !== undefined) {
            res.status(400).json({ message: paramsError.message })
            return
        }

        try {
            await this.timelineEventsService.approveEvent(event_id, req.authUser)
            res.sendStatus(200)
        }catch(err) {
            handleErrors(res, err)
        }
    }

    async rejectTimelineEvent(req, res) {
        const { params, body } = req
        const { value: { event_id }, error: paramsError } = this.paramSchema.validate(params)
        if (paramsError !== undefined) {
            res.status(400).json({ message: paramsError.message })
            return
        }

        const { value: { reason, note }, error: bodyError } = this.rejectEventBodySchema.validate(body)
        if (bodyError !== undefined) {
            res.status(400).json({ message: bodyError.message })
            return
        }

        try {
            await this.timelineEventsService.rejectEvent(event_id, reason, note, req.authUser)
            res.sendStatus(200)
        }catch(err) {
            handleErrors(res, err)
        }
    }
}
