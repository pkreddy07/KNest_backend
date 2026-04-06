const multer = require("multer");
const cloudinary = require("../config/cloudinary");
const CloudinaryStorage = require("multer-cloudinary-storage");

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  folder: "knest_uploads",
  allowedFormats: ["pdf", "jpg", "jpeg", "png"],
  resourceType: "auto",
});

const upload = multer({ storage });
module.exports = upload;
