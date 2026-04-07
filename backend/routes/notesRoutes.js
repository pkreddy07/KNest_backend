const express = require("express");
const router = express.Router();
const protect = require("../middleware/authMiddleware");
const upload = require("../middleware/uploadMiddleware");
const {
  uploadNote,
  getMyNotes,
  deleteNote,
  getNote,
  getPublicNotes,
  downloadNote,
  voteNote,
  getVoteCounts,
  getTrendingNotes,
  getRecommendedNotes,
  reportNote,
  getTopContributor,
} = require("../controllers/notesController");

// Static routes first ✅
router.get("/top-contributor", getTopContributor);
router.get("/trending", getTrendingNotes);
router.get("/public", getPublicNotes);
router.get("/my-notes", protect, getMyNotes);
router.get("/recommended", protect, getRecommendedNotes);
router.get("/download/:id", protect, downloadNote);
router.post("/upload", protect, upload.single("file"), uploadNote);

// Dynamic /:id routes last ✅
router.post("/:id/vote", protect, voteNote);
router.get("/:id/votes", getVoteCounts);
router.delete("/:id", protect, deleteNote);
router.get("/:id", protect, getNote);
router.post("/:id", protect, reportNote);

module.exports = router;
