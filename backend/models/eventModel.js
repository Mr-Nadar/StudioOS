const mongoose = require("mongoose");

const eventSchema = new mongoose.Schema(
  {
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      required: true,
    },
    eventName:         { type: String, required: true, trim: true },
    eventType:         { type: String, required: true },
    eventDate:         { type: String, required: true },
    startTime:         { type: String, default: "" },
    endTime:           { type: String, default: "" },
    venue:             { type: String, default: "" },
    mapsLink:          { type: String, default: "" },
    status: {
      type: String,
      enum: ["Scheduled", "Completed", "Cancelled"],
      default: "Scheduled",
    },
    assignedTeam:      { type: String, default: "" },
    equipmentRequired: { type: String, default: "" },
    notes:             { type: String, default: "" },
  },
  { timestamps: true }
);

const Event = mongoose.model("Event", eventSchema);

// ─── Sort field allowlist ───────────────────────────────────────────────────
const EVENT_SORT_COLUMNS = new Set([
  "projectId", "eventName", "eventType", "eventDate", "startTime",
  "endTime", "venue", "status", "assignedTeam", "createdAt", "updatedAt",
]);

function normalizeSort(sortBy = "createdAt", sortOrder = "DESC") {
  const field = EVENT_SORT_COLUMNS.has(sortBy) ? sortBy : "createdAt";
  const order = String(sortOrder).toUpperCase() === "ASC" ? 1 : -1;
  return { field, order };
}

class EventModel {
  static async getAllEvents(
    limit = 50, offset = 0, projectId = null, status = null,
    sortBy = "createdAt", sortOrder = "DESC"
  ) {
    const { field, order } = normalizeSort(sortBy, sortOrder);
    const filter = {};
    if (projectId) filter.projectId = projectId;
    if (status)    filter.status    = status;

    const [events, total] = await Promise.all([
      Event.find(filter).sort({ [field]: order }).skip(offset).limit(limit),
      Event.countDocuments(filter),
    ]);

    return { events, total };
  }

  static async searchEvents(searchTerm, projectId = null) {
    const regex = new RegExp(searchTerm, "i");
    const filter = {
      $or: [
        { eventName:    regex },
        { venue:        regex },
        { assignedTeam: regex },
        { notes:        regex },
      ],
    };
    if (projectId) filter.projectId = projectId;
    return Event.find(filter).sort({ createdAt: -1 });
  }

  static async getEventById(id) {
    return Event.findById(id);
  }

  static async getEventsByProject(projectId) {
    return Event.find({ projectId }).sort({ eventDate: 1 });
  }

  static async createEvent(data) {
    const {
      projectId, eventName, eventType, eventDate,
      startTime, endTime, venue, mapsLink, status,
      assignedTeam, equipmentRequired, notes,
    } = data;

    const event = new Event({
      projectId, eventName, eventType, eventDate,
      startTime, endTime, venue, mapsLink,
      status: status || "Scheduled",
      assignedTeam, equipmentRequired, notes,
    });
    return event.save();
  }

  static async updateEvent(id, data) {
    const {
      eventName, eventType, eventDate, startTime, endTime,
      venue, mapsLink, status, assignedTeam, equipmentRequired, notes,
    } = data;

    const updateFields = {};
    if (eventName         !== undefined) updateFields.eventName         = eventName;
    if (eventType         !== undefined) updateFields.eventType         = eventType;
    if (eventDate         !== undefined) updateFields.eventDate         = eventDate;
    if (startTime         !== undefined) updateFields.startTime         = startTime;
    if (endTime           !== undefined) updateFields.endTime           = endTime;
    if (venue             !== undefined) updateFields.venue             = venue;
    if (mapsLink          !== undefined) updateFields.mapsLink          = mapsLink;
    if (status            !== undefined) updateFields.status            = status;
    if (assignedTeam      !== undefined) updateFields.assignedTeam      = assignedTeam;
    if (equipmentRequired !== undefined) updateFields.equipmentRequired = equipmentRequired;
    if (notes             !== undefined) updateFields.notes             = notes;

    return Event.findByIdAndUpdate(id, updateFields, { new: true, runValidators: true });
  }

  static async updateEventStatus(id, status) {
    return Event.findByIdAndUpdate(id, { status }, { new: true });
  }

  static async deleteEvent(id) {
    await Event.findByIdAndDelete(id);
    return { success: true, id };
  }

  static async getEventsByDateRange(startDate, endDate, projectId = null) {
    const filter = {
      eventDate: { $gte: startDate, $lte: endDate },
    };
    if (projectId) filter.projectId = projectId;
    return Event.find(filter).sort({ eventDate: 1 });
  }

  static async getEventStats(projectId = null) {
    const filter = projectId ? { projectId } : {};
    const now = new Date().toISOString().split("T")[0];

    const [
      totalEvents,
      scheduledEvents,
      completedEvents,
      cancelledEvents,
      upcomingEvents,
    ] = await Promise.all([
      Event.countDocuments(filter),
      Event.countDocuments({ ...filter, status: "Scheduled" }),
      Event.countDocuments({ ...filter, status: "Completed" }),
      Event.countDocuments({ ...filter, status: "Cancelled" }),
      Event.countDocuments({ ...filter, eventDate: { $gte: now } }),
    ]);

    return {
      totalEvents,
      scheduledEvents,
      completedEvents,
      cancelledEvents,
      upcomingEvents,
    };
  }
}

module.exports = EventModel;
