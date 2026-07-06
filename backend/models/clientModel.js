const mongoose = require("mongoose");

const clientSchema = new mongoose.Schema(
  {
    name:          { type: String, required: true, trim: true },
    phone:         { type: String, required: true },
    email:         { type: String, required: true },
    address:       { type: String, default: "" },
    gst:           { type: String, default: "" },
    totalProjects: { type: Number, default: 0 },
    totalRevenue:  { type: Number, default: 0 },
    pendingAmount: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ["Active", "Inactive", "Potential"],
      default: "Active",
    },
    city:    { type: String, default: "" },
    state:   { type: String, default: "" },
    zipCode: { type: String, default: "" },
    notes:   { type: String, default: "" },
  },
  { timestamps: true }
);

const Client = mongoose.model("Client", clientSchema);

// ─── Sort field allowlist ───────────────────────────────────────────────────
const CLIENT_SORT_COLUMNS = new Set([
  "name", "phone", "email", "city", "state", "status",
  "totalProjects", "totalRevenue", "pendingAmount", "createdAt", "updatedAt",
]);

function normalizeSort(sortBy = "createdAt", sortOrder = "DESC") {
  const field = CLIENT_SORT_COLUMNS.has(sortBy) ? sortBy : "createdAt";
  const order = String(sortOrder).toUpperCase() === "ASC" ? 1 : -1;
  return { field, order };
}

class ClientModel {
  static async getAllClients(
    limit = 50, offset = 0, status = null,
    sortBy = "createdAt", sortOrder = "DESC"
  ) {
    const { field, order } = normalizeSort(sortBy, sortOrder);
    const filter = status && status !== "all" ? { status } : {};

    const [clients, total] = await Promise.all([
      Client.find(filter).sort({ [field]: order }).skip(offset).limit(limit),
      Client.countDocuments(filter),
    ]);

    return { clients, total };
  }

  static async searchClients(searchTerm) {
    const regex = new RegExp(searchTerm, "i");
    return Client.find({
      $or: [
        { name:    regex },
        { email:   regex },
        { phone:   regex },
        { address: regex },
        { city:    regex },
        { state:   regex },
      ],
    }).sort({ createdAt: -1 });
  }

  static async getClientById(id) {
    return Client.findById(id);
  }

  static async getClientWithProjects(id) {
    const client = await Client.findById(id).lean();
    if (!client) return null;
    return { ...client, projects: [] };
  }

  static async createClient(data) {
    const {
      name, phone, email, address, gst,
      totalProjects = 0, totalRevenue = 0, pendingAmount = 0,
      status = "Active", city, state, zipCode, notes,
    } = data;

    const client = new Client({
      name, phone, email, address, gst,
      totalProjects, totalRevenue, pendingAmount,
      status, city, state, zipCode, notes,
    });
    return client.save();
  }

  static async updateClient(id, data) {
    const {
      name, phone, email, address, gst,
      totalProjects, totalRevenue, pendingAmount,
      status, city, state, zipCode, notes,
    } = data;

    // Only update fields that were provided (skip undefined)
    const updateFields = {};
    if (name          !== undefined) updateFields.name          = name;
    if (phone         !== undefined) updateFields.phone         = phone;
    if (email         !== undefined) updateFields.email         = email;
    if (address       !== undefined) updateFields.address       = address;
    if (gst           !== undefined) updateFields.gst           = gst;
    if (totalProjects !== undefined) updateFields.totalProjects = totalProjects;
    if (totalRevenue  !== undefined) updateFields.totalRevenue  = totalRevenue;
    if (pendingAmount !== undefined) updateFields.pendingAmount = pendingAmount;
    if (status        !== undefined) updateFields.status        = status;
    if (city          !== undefined) updateFields.city          = city;
    if (state         !== undefined) updateFields.state         = state;
    if (zipCode       !== undefined) updateFields.zipCode       = zipCode;
    if (notes         !== undefined) updateFields.notes         = notes;

    return Client.findByIdAndUpdate(id, updateFields, { new: true, runValidators: true });
  }

  static async updateClientStatus(id, status) {
    return Client.findByIdAndUpdate(id, { status }, { new: true });
  }

  static async deleteClient(id) {
    await Client.findByIdAndDelete(id);
    return { success: true, id };
  }

  static async getClientStats() {
    const [
      totalClients,
      activeClients,
      inactiveClients,
      potentialClients,
      financials,
    ] = await Promise.all([
      Client.countDocuments(),
      Client.countDocuments({ status: "Active" }),
      Client.countDocuments({ status: "Inactive" }),
      Client.countDocuments({ status: "Potential" }),
      Client.aggregate([
        {
          $group: {
            _id:           null,
            totalRevenue:  { $sum: "$totalRevenue" },
            pendingAmount: { $sum: "$pendingAmount" },
          },
        },
      ]),
    ]);

    const fin = financials[0] || { totalRevenue: 0, pendingAmount: 0 };
    return {
      totalClients,
      activeClients,
      inactiveClients,
      potentialClients,
      totalRevenue:  fin.totalRevenue,
      pendingAmount: fin.pendingAmount,
    };
  }

  static async getClientsByCity(city) {
    return Client.find({ city }).sort({ name: 1 });
  }

  static async getClientsByState(state) {
    return Client.find({ state }).sort({ name: 1 });
  }
}

module.exports = ClientModel;
