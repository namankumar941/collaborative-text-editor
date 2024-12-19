const mongoose = require("mongoose");

const resourceSchema = new mongoose.Schema(
  {
    resourceId: { type: String },
    userId: { type: String },
    docId: { type: String },
  },
  { timestamps: true }
);

const resource = mongoose.model("resource", resourceSchema);

module.exports = resource;
