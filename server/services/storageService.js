const { GridFSBucket } = require('mongodb');
const mongoose = require('mongoose');

async function storeRecording(buffer, filename) {
  const bucket = new GridFSBucket(mongoose.connection.db);
  const uploadStream = bucket.openUploadStream(filename);

  return new Promise((resolve, reject) => {
    uploadStream.end(buffer, (err) => {
      if (err) return reject(err);
      resolve(uploadStream.id);
    });
  });
}

async function getRecordingStream(fileId) {
  const bucket = new GridFSBucket(mongoose.connection.db);
  return bucket.openDownloadStream(new mongoose.Types.ObjectId(fileId));
}

module.exports = { storeRecording, getRecordingStream };