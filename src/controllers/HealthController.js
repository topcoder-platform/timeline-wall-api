const { getPool } = require("../repositories/db-helper");
const config = require("../../config");
const {handleErrors} = require("../errors/helper");

TimelineEventsService = require('../services/TimelineEventService')
TimelineEventsRepository = require('../repositories/TimelineEventsRepository')

let checksRun = 0

timelineEventsRepository =  new TimelineEventsRepository(getPool())
timelineEventsService = new TimelineEventsService(timelineEventsRepository)

module.exports = class HealthController {
  async checkHealth(req, res) {
      checksRun += 1
      const timestampMS = new Date().getTime()

      try {
        await timelineEventsService.getApprovedEvents()
        res.status(200).json({ checksRun })
      } catch (err) {
        handleErrors(res, err);
      }
      if (new Date().getTime() - timestampMS > Number(config.HEALTH_CHECK_TIMEOUT)) {
        res.status(500).json({message: "Database operation is slow."})
      }

  }
}