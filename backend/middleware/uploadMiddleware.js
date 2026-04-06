const multer = require("multer");
const cloudinary = require("../config/cloudinary");
const { Readable } = require("stream");

const upload = multer({ storage: multer.memoryStorage() });

const uploadToCloudinary = async (req, res, next) => {
  if (!req.file) return next();
  try {
    const stream = cloudinary.uploader.upload_stream(
      { folder: "knest_uploads", resource_type: "auto" },
      (error, result) => {
        if (error) return next(error);
        req.file.cloudinary_url = result.secure_url;
        req.file.public_id = result.public_id;
        next();
      }
    );
    Readable.from(req.file.buffer).pipe(stream);
  } catch (err) {
    next(err);
  }
};

module.exports = { upload, uploadToCloudinary };
