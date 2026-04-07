const cloudinary = require("../config/cloudinary");
const { Readable } = require("stream");

const uploadFile = (fileBuffer) => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder: "knest_uploads", resource_type: "auto" },
      (error, result) => {
        if (error) reject(error);
        else resolve(result.secure_url);
      }
    );
    Readable.from(fileBuffer).pipe(stream);
  });
};

module.exports = uploadFile;
