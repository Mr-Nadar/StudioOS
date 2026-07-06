const mongoose = require("mongoose");

const paymentSchema = new mongoose.Schema(
  {
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      required: true,
    },
    amount:          { type: Number, required: true, min: 0 },
    paymentDate:     { type: String, required: true },
    paymentMode:     { type: String, default: "Cash" },
    remarks:         { type: String, default: "" },
    referenceNumber: { type: String, default: "" },
  },
  { timestamps: true }
);

const Payment = mongoose.model("Payment", paymentSchema);

class PaymentModel {
  /**
   * Get all payments for a specific project
   */
  static async getPaymentsByProject(projectId) {
    return Payment.find({ projectId }).sort({ paymentDate: -1, createdAt: -1 });
  }

  /**
   * Get a single payment by ID
   */
  static async getPaymentById(id) {
    return Payment.findById(id);
  }

  /**
   * Get all payments (with optional pagination), joined with project info
   */
  static async getAllPayments(limit = 50, offset = 0) {
    return Payment.find()
      .populate("projectId", "projectName clientName")
      .sort({ paymentDate: -1, createdAt: -1 })
      .skip(offset)
      .limit(limit);
  }

  /**
   * Get total payment count
   */
  static async getPaymentCount() {
    return Payment.countDocuments();
  }

  /**
   * Get payment statistics
   */
  static async getPaymentStats() {
    const result = await Payment.aggregate([
      {
        $group: {
          _id:           null,
          totalPayments: { $sum: 1 },
          totalAmount:   { $sum: "$amount" },
          averageAmount: { $avg: "$amount" },
          minAmount:     { $min: "$amount" },
          maxAmount:     { $max: "$amount" },
        },
      },
    ]);
    return (
      result[0] || {
        totalPayments: 0,
        totalAmount:   0,
        averageAmount: 0,
        minAmount:     0,
        maxAmount:     0,
      }
    );
  }

  /**
   * Get payments within a date range
   */
  static async getPaymentsByDateRange(startDate, endDate) {
    return Payment.find({
      paymentDate: { $gte: startDate, $lte: endDate },
    }).sort({ paymentDate: -1 });
  }

  /**
   * Create a new payment and update the related project's advance & balance
   */
  static async createPayment(paymentData) {
    const { projectId, amount, paymentDate, paymentMode, remarks, referenceNumber } =
      paymentData;

    const Project = mongoose.model("Project");

    const payment = await new Payment({
      projectId, amount, paymentDate,
      paymentMode: paymentMode || "Cash",
      remarks:     remarks     || "",
      referenceNumber: referenceNumber || "",
    }).save();

    // Update project advance and recalculate balance
    await Project.findByIdAndUpdate(projectId, [
      {
        $set: {
          advance: { $add: ["$advance", amount] },
          balance: { $subtract: ["$totalAmount", { $add: ["$advance", amount] }] },
        },
      },
    ]);

    return payment;
  }

  /**
   * Update a payment and adjust the project's advance & balance accordingly
   */
  static async updatePayment(id, paymentData) {
    const { amount, paymentDate, paymentMode, remarks, referenceNumber } = paymentData;

    const Project = mongoose.model("Project");

    const oldPayment = await Payment.findById(id);
    if (!oldPayment) return null;

    const amountDifference = amount - oldPayment.amount;

    const updated = await Payment.findByIdAndUpdate(
      id,
      { amount, paymentDate, paymentMode, remarks, referenceNumber },
      { new: true, runValidators: true }
    );

    if (amountDifference !== 0) {
      await Project.findByIdAndUpdate(oldPayment.projectId, [
        {
          $set: {
            advance: { $add: ["$advance", amountDifference] },
            balance: {
              $subtract: ["$totalAmount", { $add: ["$advance", amountDifference] }],
            },
          },
        },
      ]);
    }

    return updated;
  }

  /**
   * Delete a payment and revert the project's advance & balance
   */
  static async deletePayment(id) {
    const Project = mongoose.model("Project");

    const payment = await Payment.findById(id);
    if (!payment) return { success: false };

    await Payment.findByIdAndDelete(id);

    // Revert project advance and recalculate balance
    await Project.findByIdAndUpdate(payment.projectId, [
      {
        $set: {
          advance: { $subtract: ["$advance", payment.amount] },
          balance: {
            $subtract: ["$totalAmount", { $subtract: ["$advance", payment.amount] }],
          },
        },
      },
    ]);

    return { success: true };
  }

  /**
   * Get payment mode distribution
   */
  static async getPaymentModeStats() {
    return Payment.aggregate([
      {
        $group: {
          _id:         "$paymentMode",
          count:       { $sum: 1 },
          totalAmount: { $sum: "$amount" },
        },
      },
      { $sort: { totalAmount: -1 } },
      { $project: { paymentMode: "$_id", count: 1, totalAmount: 1, _id: 0 } },
    ]);
  }

  /**
   * Get projects with a pending balance (balance > 0)
   */
  static async getPendingPayments() {
    const Project = mongoose.model("Project");
    return Project.find({ balance: { $gt: 0 } }).sort({ updatedAt: -1 });
  }
}

module.exports = PaymentModel;
