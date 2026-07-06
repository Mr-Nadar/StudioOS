const PaymentModel = require("../models/paymentModel");

class PaymentController {
  /**
   * Get all payments (with pagination)
   */
  static async getAllPayments(req, res) {
    try {
      const limit  = parseInt(req.query.limit)  || 50;
      const offset = parseInt(req.query.offset) || 0;

      const [payments, count] = await Promise.all([
        PaymentModel.getAllPayments(limit, offset),
        PaymentModel.getPaymentCount(),
      ]);

      res.json({
        success: true,
        data: payments,
        pagination: { total: count, limit, offset },
      });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  /**
   * Get payments for a specific project
   */
  static async getPaymentsByProject(req, res) {
    try {
      const { projectId } = req.params;

      if (!projectId) {
        return res.status(400).json({ success: false, error: "Project ID is required" });
      }

      const payments = await PaymentModel.getPaymentsByProject(projectId);
      res.json({ success: true, data: payments || [] });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  /**
   * Get a single payment by ID
   */
  static async getPaymentById(req, res) {
    try {
      const { id } = req.params;

      if (!id) {
        return res.status(400).json({ success: false, error: "Payment ID is required" });
      }

      const payment = await PaymentModel.getPaymentById(id);

      if (!payment) {
        return res.status(404).json({ success: false, error: "Payment not found" });
      }

      res.json({ success: true, data: payment });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  /**
   * Get payment statistics
   */
  static async getPaymentStats(req, res) {
    try {
      const [stats, modeStats] = await Promise.all([
        PaymentModel.getPaymentStats(),
        PaymentModel.getPaymentModeStats(),
      ]);

      res.json({
        success: true,
        data: { overview: stats, byMode: modeStats },
      });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  /**
   * Get pending payments (projects with balance > 0)
   */
  static async getPendingPayments(req, res) {
    try {
      const payments = await PaymentModel.getPendingPayments();
      res.json({ success: true, data: payments || [] });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  /**
   * Create a new payment
   */
  static async createPayment(req, res) {
    try {
      const { projectId, amount, paymentDate, paymentMode, remarks, referenceNumber } =
        req.body;

      if (!projectId || !amount || !paymentDate) {
        return res.status(400).json({
          success: false,
          error: "Project ID, amount, and payment date are required",
        });
      }

      if (amount <= 0) {
        return res.status(400).json({
          success: false,
          error: "Amount must be greater than 0",
        });
      }

      const paymentData = {
        projectId,
        amount,
        paymentDate,
        paymentMode:     paymentMode     || "Cash",
        remarks:         remarks         || "",
        referenceNumber: referenceNumber || "",
      };

      const payment = await PaymentModel.createPayment(paymentData);
      res.status(201).json({
        success: true,
        message: "Payment recorded successfully",
        data: payment,
      });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  /**
   * Update a payment
   */
  static async updatePayment(req, res) {
    try {
      const { id } = req.params;
      const { amount, paymentDate, paymentMode, remarks, referenceNumber } = req.body;

      if (!id) {
        return res.status(400).json({ success: false, error: "Payment ID is required" });
      }

      if (!amount || !paymentDate) {
        return res.status(400).json({
          success: false,
          error: "Amount and payment date are required",
        });
      }

      if (amount <= 0) {
        return res.status(400).json({
          success: false,
          error: "Amount must be greater than 0",
        });
      }

      const paymentData = {
        amount,
        paymentDate,
        paymentMode:     paymentMode     || "Cash",
        remarks:         remarks         || "",
        referenceNumber: referenceNumber || "",
      };

      const payment = await PaymentModel.updatePayment(id, paymentData);

      if (!payment) {
        return res.status(404).json({ success: false, error: "Payment not found" });
      }

      res.json({
        success: true,
        message: "Payment updated successfully",
        data: payment,
      });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  /**
   * Delete a payment
   */
  static async deletePayment(req, res) {
    try {
      const { id } = req.params;

      if (!id) {
        return res.status(400).json({ success: false, error: "Payment ID is required" });
      }

      const result = await PaymentModel.deletePayment(id);
      res.json({ success: true, message: "Payment deleted successfully", data: result });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  /**
   * Get payments by date range
   */
  static async getPaymentsByDateRange(req, res) {
    try {
      const { startDate, endDate } = req.query;

      if (!startDate || !endDate) {
        return res.status(400).json({
          success: false,
          error: "Start date and end date are required",
        });
      }

      const payments = await PaymentModel.getPaymentsByDateRange(startDate, endDate);
      res.json({ success: true, data: payments || [] });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  }
}

module.exports = PaymentController;
