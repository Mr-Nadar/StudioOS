const EventModel = require("../models/eventModel");

class EventController {
  static async getAllEvents(req, res) {
    try {
      const limit     = parseInt(req.query.limit)  || 50;
      const offset    = parseInt(req.query.offset) || 0;
      const projectId = req.query.projectId || null;
      const status    = req.query.status    || null;
      const sortBy    = req.query.sortBy    || "createdAt";
      const sortOrder = (req.query.sortOrder || "DESC").toUpperCase();

      if (!["ASC", "DESC"].includes(sortOrder)) {
        return res.status(400).json({
          success: false,
          error: "Invalid sort order. Use ASC or DESC.",
        });
      }

      const result = await EventModel.getAllEvents(
        limit, offset, projectId, status, sortBy, sortOrder
      );

      res.json({
        success: true,
        data: result.events,
        pagination: { total: result.total, limit, offset },
      });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  static async searchEvents(req, res) {
    try {
      const { query, projectId } = req.query;

      if (!query || query.trim().length < 2) {
        return res.status(400).json({
          success: false,
          error: "Search query must be at least 2 characters",
        });
      }

      const events = await EventModel.searchEvents(query, projectId || null);
      res.json({ success: true, data: events || [] });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  static async getEventById(req, res) {
    try {
      const { id } = req.params;
      const event = await EventModel.getEventById(id);

      if (!event) {
        return res.status(404).json({ success: false, error: "Event not found" });
      }

      res.json({ success: true, data: event });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  static async getEventsByProject(req, res) {
    try {
      const { projectId } = req.params;
      const events = await EventModel.getEventsByProject(projectId);
      res.json({ success: true, data: events || [] });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  static async getEventStats(req, res) {
    try {
      const { projectId } = req.query;
      const stats = await EventModel.getEventStats(projectId || null);
      res.json({ success: true, data: stats });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  static async getEventsByDateRange(req, res) {
    try {
      const { startDate, endDate, projectId } = req.query;

      if (!startDate || !endDate) {
        return res.status(400).json({
          success: false,
          error: "Start date and end date are required",
        });
      }

      const events = await EventModel.getEventsByDateRange(
        startDate, endDate, projectId || null
      );
      res.json({ success: true, data: events || [] });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  static async createEvent(req, res) {
    try {
      const { projectId, eventName, eventType, eventDate } = req.body;

      if (!projectId || !eventName || !eventType || !eventDate) {
        return res.status(400).json({
          success: false,
          error: "Project ID, event name, event type, and event date are required",
        });
      }

      const event = await EventModel.createEvent(req.body);
      res.status(201).json({
        success: true,
        message: "Event created successfully",
        data: event,
      });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  static async updateEvent(req, res) {
    try {
      const { id } = req.params;

      const existing = await EventModel.getEventById(id);
      if (!existing) {
        return res.status(404).json({ success: false, error: "Event not found" });
      }

      const updatedEvent = await EventModel.updateEvent(id, req.body);
      res.json({
        success: true,
        message: "Event updated successfully",
        data: updatedEvent,
      });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  static async updateEventStatus(req, res) {
    try {
      const { id }     = req.params;
      const { status } = req.body;

      if (!status) {
        return res.status(400).json({ success: false, error: "Status is required" });
      }

      const existing = await EventModel.getEventById(id);
      if (!existing) {
        return res.status(404).json({ success: false, error: "Event not found" });
      }

      const updatedEvent = await EventModel.updateEventStatus(id, status);
      res.json({
        success: true,
        message: "Event status updated successfully",
        data: updatedEvent,
      });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  static async deleteEvent(req, res) {
    try {
      const { id } = req.params;

      const existing = await EventModel.getEventById(id);
      if (!existing) {
        return res.status(404).json({ success: false, error: "Event not found" });
      }

      const result = await EventModel.deleteEvent(id);
      res.json({ success: true, message: "Event deleted successfully", data: result });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  }
}

module.exports = EventController;
