const ProjectModel = require("../models/projectModel");

class ProjectController {
  /**
   * Get all projects with filtering and pagination
   */
  static async getAllProjects(req, res) {
    try {
      const limit     = parseInt(req.query.limit)  || 50;
      const offset    = parseInt(req.query.offset) || 0;
      const status    = req.query.status    || null;
      const sortBy    = req.query.sortBy    || "createdAt";
      const sortOrder = (req.query.sortOrder || "DESC").toUpperCase();

      if (!["ASC", "DESC"].includes(sortOrder)) {
        return res.status(400).json({
          success: false,
          error: "Invalid sort order. Use ASC or DESC.",
        });
      }

      const [projects, total] = await Promise.all([
        ProjectModel.getAllProjects(limit, offset, status, sortBy, sortOrder),
        ProjectModel.getProjectCount(status),
      ]);

      res.json({
        success: true,
        data: projects,
        pagination: { total, limit, offset },
      });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  /**
   * Search projects
   */
  static async searchProjects(req, res) {
    try {
      const { q } = req.query;

      if (!q || q.trim().length < 2) {
        return res.status(400).json({
          success: false,
          error: "Search query must be at least 2 characters",
        });
      }

      const limit  = parseInt(req.query.limit)  || 50;
      const offset = parseInt(req.query.offset) || 0;

      const projects = await ProjectModel.searchProjects(q, limit, offset);
      res.json({ success: true, data: projects });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  /**
   * Get a single project (with related payments & events)
   */
  static async getProjectById(req, res) {
    try {
      const { id } = req.params;

      if (!id) {
        return res.status(400).json({ success: false, error: "Project ID is required" });
      }

      const project = await ProjectModel.getProjectWithDetails(id);

      if (!project) {
        return res.status(404).json({ success: false, error: "Project not found" });
      }

      res.json({ success: true, data: project });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  /**
   * Get project statistics
   */
  static async getProjectStats(req, res) {
    try {
      const stats = await ProjectModel.getProjectStats();
      res.json({ success: true, data: stats });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  /**
   * Create a new project
   */
  static async createProject(req, res) {
    try {
      const {
        projectName, clientName, phone, email, address,
        eventType, location, startDate, endDate,
        totalAmount, advance = 0, status = "Upcoming", notes = "",
      } = req.body;

      if (!projectName || !clientName || !totalAmount) {
        return res.status(400).json({
          success: false,
          error: "Project name, client name, and total amount are required",
        });
      }

      if (totalAmount <= 0) {
        return res.status(400).json({
          success: false,
          error: "Total amount must be greater than 0",
        });
      }

      const projectData = {
        projectName,
        clientName,
        phone:      phone      || "",
        email:      email      || "",
        address:    address    || "",
        eventType:  eventType  || "General",
        location:   location   || "",
        startDate:  startDate  || new Date().toISOString().split("T")[0],
        endDate:    endDate    || "",
        totalAmount,
        advance:    advance || 0,
        balance:    totalAmount - (advance || 0),
        status,
        notes,
      };

      const project = await ProjectModel.createProject(projectData);
      res.status(201).json({
        success: true,
        message: "Project created successfully",
        data: project,
      });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  /**
   * Update a project
   */
  static async updateProject(req, res) {
    try {
      const { id } = req.params;
      const {
        projectName, clientName, phone, email, address,
        eventType, location, startDate, endDate,
        totalAmount, status, notes,
      } = req.body;

      if (!id) {
        return res.status(400).json({ success: false, error: "Project ID is required" });
      }

      if (!projectName || !clientName || !totalAmount) {
        return res.status(400).json({
          success: false,
          error: "Project name, client name, and total amount are required",
        });
      }

      const projectData = {
        projectName,
        clientName,
        phone:     phone     || "",
        email:     email     || "",
        address:   address   || "",
        eventType: eventType || "General",
        location:  location  || "",
        startDate: startDate || new Date().toISOString().split("T")[0],
        endDate:   endDate   || "",
        totalAmount,
        status:    status    || "Upcoming",
        notes:     notes     || "",
      };

      const project = await ProjectModel.updateProject(id, projectData);

      if (!project) {
        return res.status(404).json({ success: false, error: "Project not found" });
      }

      res.json({
        success: true,
        message: "Project updated successfully",
        data: project,
      });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  /**
   * Delete a project (cascades to payments & events)
   */
  static async deleteProject(req, res) {
    try {
      const { id } = req.params;

      if (!id) {
        return res.status(400).json({ success: false, error: "Project ID is required" });
      }

      const result = await ProjectModel.deleteProject(id);
      res.json({ success: true, message: "Project deleted successfully", data: result });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  /**
   * Update project status
   */
  static async updateProjectStatus(req, res) {
    try {
      const { id }     = req.params;
      const { status } = req.body;

      if (!id || !status) {
        return res.status(400).json({
          success: false,
          error: "Project ID and status are required",
        });
      }

      const result = await ProjectModel.updateProjectStatus(id, status);

      if (!result) {
        return res.status(404).json({ success: false, error: "Project not found" });
      }

      res.json({
        success: true,
        message: "Project status updated successfully",
        data: result,
      });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  /**
   * Archive a project
   */
  static async archiveProject(req, res) {
    try {
      const { id } = req.params;

      if (!id) {
        return res.status(400).json({ success: false, error: "Project ID is required" });
      }

      const result = await ProjectModel.archiveProject(id);

      if (!result) {
        return res.status(404).json({ success: false, error: "Project not found" });
      }

      res.json({
        success: true,
        message: "Project archived successfully",
        data: result,
      });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  /**
   * Get projects by date range
   */
  static async getProjectsByDateRange(req, res) {
    try {
      const { startDate, endDate } = req.query;

      if (!startDate || !endDate) {
        return res.status(400).json({
          success: false,
          error: "Start date and end date are required",
        });
      }

      const projects = await ProjectModel.getProjectsByDateRange(startDate, endDate);
      res.json({ success: true, data: projects });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  }
}

module.exports = ProjectController;
