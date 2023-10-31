const mongoose = require("mongoose");

const fileLinkSchema = new mongoose.Schema({
  fileId: {
    type: Number,
    unique: true,
    required: true,
  },
  pdfUrl: {
    type: String,
    required: true,
  },
  zipUrl: {
    type: String,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const FileLink = mongoose.model("FileLink", fileLinkSchema);

module.exports = FileLink;
