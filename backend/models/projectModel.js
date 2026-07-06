const mongoose = require("mongoose");

const projectSchema = new mongoose.Schema(
  {
    projectName: { type: String, required: true, trim: true },
    clientName:  { type: String, required: true, trim: true },
    phone:       { type: String, default: "" },
    email:       { type: String, default: "" },
    address:     { type: String, default: "" },
    eventType:   { type: String, default: "General" },
    location:    { type: String, default: "" },
    startDate:   { type: String, default: "" },
    endDate:     { type: String, default: "" },
    totalAmount: { type: Number, required: true, min: 0 },
    advance:     { type: Number, default: 0 },
    balance:     { type: Number, default: 0 },
    status: {
      type: String,
      enum: ["Upcoming", "Ongoing", "Completed", "Archived"],
      default: "Upcoming",
    },
    notes: { type: String, default: "" },
  },
  { timestamps: true }
);

const Project = mongoose.model("Project", projectSchema);

// ─── Sort field allowlist ───────────────────────────────────────────────────
const VALID_SORT_FIELDS = new Set([
  "projectName", "clientName", "phone", "email", "eventType",
  "startDate", "endDate", "totalAmount", "advance", "balance",
  "status", "createdAt", "updatedAt",
]);

function normalizeSort(sortBy = "createdAt", sortOrder = "DESC") {
  const field = VALID_SORT_FIELDS.has(sortBy) ? sortBy : "createdAt";
  const order = String(sortOrder).toUpperCase() === "ASC" ? 1 : -1;
  return { field, order };
}

class ProjectModel {
  static async getAllProjects(
    limit = 50, offset = 0, status = null,
    sortBy = "createdAt", sortOrder = "DESC"
  ) {
    const { field, order } = normalizeSort(sortBy, sortOrder);
    const filter = status && status !== "all" ? { status } : {};
    return Project.find(filter)
      .sort({ [field]: order })
      .skip(offset)
      .limit(limit);
  }

  static async getProjectCount(status = null) {
    const filter = status && status !== "all" ? { status } : {};
    return Project.countDocuments(filter);
  }

  static async searchProjects(searchTerm, limit = 50, offset = 0) {
    const regex = new RegExp(searchTerm, "i");
    return Project.find({
      $or: [
        { projectName: regex },
        { clientName: regex },
        { email: regex },
      ],
    })
      .sort({ createdAt: -1 })
      .skip(offset)
      .limit(limit);
  }

  static async getProjectById(id) {
    return Project.findById(id);
  }

  static async createProject(projectData) {
    const { totalAmount, advance = 0 } = projectData;
    const balance = projectData.balance ?? totalAmount - advance;
    const project = new Project({ ...projectData, balance });
    return project.save();
  }

  static async updateProject(id, projectData) {
    const { totalAmount } = projectData;
    // Fetch current advance to recalculate balance
    const existing = await Project.findById(id);
    if (!existing) return null;
    const advance = existing.advance || 0;
    const balance = totalAmount - advance;
    return Project.findByIdAndUpdate(
      id,
      { ...projectData, balance },
      { new: true, runValidators: true }
    );
  }

  static async deleteProject(id) {
    // Cascade — remove related payments and events
    const Payment = mongoose.model("Payment");
    const Event   = mongoose.model("Event");
    await Payment.deleteMany({ projectId: id });
    await Event.deleteMany({ projectId: id });
    await Project.findByIdAndDelete(id);
    return { success: true, id };
  }

  static async getProjectsByStatus(status) {
    return Project.find({ status }).sort({ startDate: 1 });
  }

  static async getProjectStats() {
    const [total, completed, ongoing, upcoming, financials] = await Promise.all([
      Project.countDocuments(),
      Project.countDocuments({ status: "Completed" }),
      Project.countDocuments({ status: "Ongoing" }),
      Project.countDocuments({ status: "Upcoming" }),
      Project.aggregate([
        {
          $group: {
            _id: null,
            totalRevenue: { $sum: "$totalAmount" },
            totalAdvance: { $sum: "$advance" },
            totalPending: { $sum: "$balance" },
          },
        },
      ]),
    ]);

    const fin = financials[0] || { totalRevenue: 0, totalAdvance: 0, totalPending: 0 };
    return {
      totalProjects:     total,
      completedProjects: completed,
      ongoingProjects:   ongoing,
      upcomingProjects:  upcoming,
      totalRevenue:      fin.totalRevenue,
      totalAdvance:      fin.totalAdvance,
      totalPending:      fin.totalPending,
    };
  }

  static async getProjectsByDateRange(startDate, endDate) {
    return Project.find({
      $or: [
        { startDate: { $gte: startDate, $lte: endDate } },
        { endDate:   { $gte: startDate, $lte: endDate } },
      ],
    }).sort({ startDate: 1 });
  }

  static async updateProjectStatus(id, status) {
    const project = await Project.findByIdAndUpdate(
      id,
      { status },
      { new: true }
    );
    return project;
  }

  static async archiveProject(id) {
    return ProjectModel.updateProjectStatus(id, "Archived");
  }

  static async getProjectWithDetails(id) {
    const Payment = mongoose.model("Payment");
    const Event   = mongoose.model("Event");

    const project = await Project.findById(id).lean();
    if (!project) return null;

    const [payments, events] = await Promise.all([
      Payment.find({ projectId: id }).sort({ paymentDate: -1 }),
      Event.find({ projectId: id }).sort({ eventDate: 1 }),
    ]);

    project.payments = payments;
    project.events   = events;
    project.notes    = [];
    return project;
  }
}

module.exports = ProjectModel;
