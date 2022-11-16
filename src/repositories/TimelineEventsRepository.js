const { getPool } = require('./db-helper')
const { NotFoundError } = require("../errors/custom-errors");

module.exports = class TimelineEventsRepository {

    constructor(pool) {
        this.pool = pool
    }

    async getEventsWithStatus(status) {
        const { rows } = await this.pool.query('SELECT * FROM events WHERE status = $1', [status])
        return rows
    }

    async addEvent(title, description, eventDate, mediaFiles, status, user) {
        try {
            const date = new Date()
            const { rows } = await this.pool.query(`INSERT INTO "events" ("title", "description", "event_date", "media_files", "status", "created_by", "created_date", "last_updated_by", "last_updated_date") 
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`, [title, description, eventDate, mediaFiles, status, user, date, user, date])
            return rows[0]
        } catch (e) {
            e.message = `ERROR: Failed to create Event in the Database. Error message: ${e.message}`
            throw e
        }
    }

    async getEventById(event_id) {
        const { rows } = await this.pool.query('SELECT * FROM events WHERE id = $1 AND status != $2', [event_id, 'Deleted'])
        if (rows.length === 0) {
            throw new NotFoundError(`Event with id ${event_id} not found.`)
        }
        return rows[0]
    }

    async deleteEvent(event_id, user) {
        const { rows } = await this.pool.query('UPDATE events SET status = $1, last_updated_by = $2, last_updated_date = $3 WHERE id = $4 AND status != $1 RETURNING *', ['Deleted', user, new Date(), event_id])
        if (rows.length === 0) {
            throw new NotFoundError(`Event with id ${event_id} not found.`)
        }
    }

    async approveEvent(event_id, user) {
        const { rows } = await this.pool.query('UPDATE events SET status = $1, last_updated_by = $2, last_updated_date = $3 WHERE id = $4 AND status != $5 RETURNING *', ['Approved', user, new Date(), event_id, 'Deleted'])
        if (rows.length === 0) {
            throw new NotFoundError(`Event with id ${event_id} not found.`)
        }
        return rows[0]
    }

    async rejectEvent(event_id, reason, note, user) {
        const { rows } = await this.pool.query(
            'UPDATE events SET status = $1, rejection_reason = $2, rejection_note = $3, last_updated_by = $4, last_updated_date = $5 WHERE id = $6 AND status != $7 RETURNING *',
            ['Rejected', reason, note, user, new Date(), event_id, 'Deleted'])
        if (rows.length === 0) {
            throw new NotFoundError(`Event with id ${event_id} not found.`)
        }

        return rows[0]
    }
}
