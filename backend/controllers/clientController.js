const ClientModel = require("../models/clientModel");

function normalizeClientBody(body) {
  return {
    ...body,
    name: body.name || body.clientName,
    gst:  body.gst  || body.gstNumber,
  };
}

class ClientController {
  static async getAllClients(req, res) {
    try {
      const limit     = parseInt(req.query.limit)  || 50;
      const offset    = parseInt(req.query.offset) || 0;
      const status    = req.query.status    || null;
      const sortBy    = req.query.sortBy === "clientName" ? "name" : req.query.sortBy || "createdAt";
      const sortOrder = (req.query.sortOrder || "DESC").toUpperCase();

      if (!["ASC", "DESC"].includes(sortOrder)) {
        return res.status(400).json({
          success: false,
          error: "Invalid sort order. Use ASC or DESC.",
        });
      }

      const result = await ClientModel.getAllClients(limit, offset, status, sortBy, sortOrder);
      res.json({
        success: true,
        data: result.clients,
        pagination: { total: result.total, limit, offset },
      });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  static async searchClients(req, res) {
    try {
      const { query } = req.query;

      if (!query || query.trim().length < 2) {
        return res.status(400).json({
          success: false,
          error: "Search query must be at least 2 characters",
        });
      }

      const clients = await ClientModel.searchClients(query);
      res.json({ success: true, data: clients || [] });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  static async getClientById(req, res) {
    try {
      const { id } = req.params;
      const client = await ClientModel.getClientById(id);

      if (!client) {
        return res.status(404).json({ success: false, error: "Client not found" });
      }

      res.json({ success: true, data: client });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  static async getClientWithProjects(req, res) {
    try {
      const { id } = req.params;
      const client = await ClientModel.getClientWithProjects(id);

      if (!client) {
        return res.status(404).json({ success: false, error: "Client not found" });
      }

      res.json({ success: true, data: client });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  static async getClientStats(req, res) {
    try {
      const stats = await ClientModel.getClientStats();
      res.json({ success: true, data: stats });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  static async getClientsByCity(req, res) {
    try {
      const { city } = req.params;
      const clients = await ClientModel.getClientsByCity(city);
      res.json({ success: true, data: clients || [] });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  static async getClientsByState(req, res) {
    try {
      const { state } = req.params;
      const clients = await ClientModel.getClientsByState(state);
      res.json({ success: true, data: clients || [] });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  static async createClient(req, res) {
    try {
      const clientData = normalizeClientBody(req.body);
      const { name, email, phone } = clientData;

      if (!name || !email || !phone) {
        return res.status(400).json({
          success: false,
          error: "Client name, email, and phone are required",
        });
      }

      const client = await ClientModel.createClient(clientData);
      res.status(201).json({
        success: true,
        message: "Client created successfully",
        data: client,
      });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  static async updateClient(req, res) {
    try {
      const { id }     = req.params;
      const clientData = normalizeClientBody(req.body);

      const existing = await ClientModel.getClientById(id);
      if (!existing) {
        return res.status(404).json({ success: false, error: "Client not found" });
      }

      const updatedClient = await ClientModel.updateClient(id, clientData);
      res.json({
        success: true,
        message: "Client updated successfully",
        data: updatedClient,
      });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  static async updateClientStatus(req, res) {
    try {
      const { id }     = req.params;
      const { status } = req.body;

      if (!status) {
        return res.status(400).json({ success: false, error: "Status is required" });
      }

      const existing = await ClientModel.getClientById(id);
      if (!existing) {
        return res.status(404).json({ success: false, error: "Client not found" });
      }

      const updatedClient = await ClientModel.updateClientStatus(id, status);
      res.json({
        success: true,
        message: "Client status updated successfully",
        data: updatedClient,
      });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  static async deleteClient(req, res) {
    try {
      const { id } = req.params;

      const existing = await ClientModel.getClientById(id);
      if (!existing) {
        return res.status(404).json({ success: false, error: "Client not found" });
      }

      const result = await ClientModel.deleteClient(id);
      res.json({ success: true, message: "Client deleted successfully", data: result });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  }
}

module.exports = ClientController;
