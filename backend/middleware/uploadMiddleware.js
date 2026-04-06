const multer = require("multer");
const cloudinaryStorage = require("multer-storage-cloudinary");
const cloudinary = require("../config/cloudinary");

const storage = new cloudinaryStorage.CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: "knest_uploads",
    allowed_formats: ["pdf", "jpg", "jpeg", "png"],
    resource_type: "auto",
  },
});

const upload = multer({ storage });
module.exports = upload;
