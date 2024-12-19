const mongoose = require("mongoose");

const docSchema = new mongoose.Schema(
  {
    docId: { type: String },
    name: { type: String, default: "Untitled"},
    doc: {type: mongoose.Schema.Types.Mixed}
  },
  { timestamps: true }
);

const doc = mongoose.model("documents", docSchema);

module.exports = doc;