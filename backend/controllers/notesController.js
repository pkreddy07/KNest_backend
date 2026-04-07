// const pool = require("../config/db");
// const uploadFile = require("../utils/googleDriveUpload");

// exports.uploadNote = async (req, res) => {
//   try {
//     const { title, description } = req.body;
//     const file = req.file;

//     if (!file) {
//       return res.status(400).json({ message: "File required" });
//     }

//     const driveFileId = await uploadFile(
//       file.path,
//       file.originalname,
//       file.mimetype,
//     );

//     const [result] = await pool.query(
//       `INSERT INTO notes (user_id, title, description, drive_file_id, file_type)
//        VALUES (?, ?, ?, ?, ?)`,
//       [req.user, title, description, driveFileId, file.mimetype],
//     );

//     res.json({
//       message: "Note uploaded successfully",
//       noteId: result.insertId,
//       driveFileId,
//     });
//   } catch (error) {
//     console.error(error);
//     res.status(500).json({ message: "Upload failed" });
//   }
// };

const pool = require("../config/db");
const uploadFile = require("../utils/cloudinaryUpload");

exports.uploadNote = async (req, res) => {
  try {
    const { title, description, allow_public_author } = req.body;
    const file = req.file;
    const allowPublicAuthor = parseInt(allow_public_author) || 0;
    if (!file) {
      return res.status(400).json({ message: "File required" });
    }

    const fileUrl = await uploadFile(file.buffer);

    const [result] = await pool.query(
      `INSERT INTO notes (user_id, title, description, file_url, file_type,allow_public_author)
       VALUES (?, ?, ?, ?, ?,?)`,
      [
        req.user.id,
        title,
        description,
        fileUrl,
        file.mimetype,
        allowPublicAuthor,
      ],
    );
    const text = `${title} ${description}`.toLowerCase();

    const words = text
      .replace(/[^\w\s]/g, "") // remove punctuation
      .split(/\s+/);

    const wordSet = new Set(words);

    const [keywordRows] = await pool.query("SELECT id, keyword FROM keywords");

    for (const row of keywordRows) {
      if (wordSet.has(row.keyword)) {
        await pool.query(
          `INSERT IGNORE INTO note_keywords (note_id, keyword_id)
           VALUES (?, ?)`,
          [result.insertId, row.id],
        );
      }
    }

    res.json({
      message: "Note uploaded successfully",
      noteId: result.insertId,
      fileUrl,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Upload failed" });
  }
};

exports.getMyNotes = async (req, res) => {
  try {
    const [notes] = await pool.query(
      "SELECT * FROM notes WHERE user_id = ? ORDER BY created_at DESC",
      [req.user.id],
    );

    res.json(notes);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to fetch notes" });
  }
};

exports.deleteNote = async (req, res) => {
  try {
    const noteId = req.params.id;

    await pool.query("DELETE FROM notes WHERE id = ? AND user_id = ?", [
      noteId,
      req.user.id,
    ]);

    res.json({ message: "Note deleted successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Delete failed" });
  }
};

exports.getNote = async (req, res) => {
  try {
    const noteId = req.params.id;
    await pool.query(`UPDATE notes SET views = views + 1 WHERE id = ?`, [
      noteId,
    ]);
    const [note] = await pool.query(
      `
  SELECT 
    n.*,
    u.username
  FROM notes n
  JOIN users u ON n.user_id = u.id
  WHERE n.id = ?
`,
      [noteId],
    );

    res.json(note[0]);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch note" });
  }
};

exports.getPublicNotes = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search || "";

    const offset = (page - 1) * limit;

    // Save search history
    if (search && req.user) {
      const words = search
        .toLowerCase()
        .replace(/[^\w\s]/g, "")
        .split(/\s+/)
        .filter((word) => word.length > 0);

      const uniqueWords = [...new Set(words)];

      for (const word of uniqueWords) {
        await pool.query(
          "INSERT INTO search_history (user_id, search_term) VALUES (?, ?)",
          [req.user.id, word],
        );
      }
    }

    const [notes] = await pool.query(
      `SELECT 
      n.id,
      n.title,
      n.description,
      n.file_url,
      n.created_at,
      SUM(v.vote_type = 'upvote') AS upvotes,
      SUM(v.vote_type = 'downvote') AS downvotes
   FROM notes n
   LEFT JOIN votes v ON n.id = v.note_id
   LEFT JOIN note_keywords nk ON n.id = nk.note_id
   LEFT JOIN keywords k ON nk.keyword_id = k.id
   WHERE n.is_hidden = 0
   AND (
        n.title LIKE ?
        OR n.description LIKE ?
        OR k.keyword LIKE ?
   )
   GROUP BY n.id
   ORDER BY n.created_at DESC
   LIMIT ? OFFSET ?`,
      [`%${search}%`, `%${search}%`, `%${search}%`, limit, offset],
    );

    res.json({
      page,
      limit,
      results: notes,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error fetching notes" });
  }
};

exports.downloadNote = async (req, res) => {
  try {
    const { id } = req.params;

    const [notes] = await pool.query(
      "SELECT file_url FROM notes WHERE id = ? AND is_hidden=0",
      [id],
    );

    if (notes.length === 0) {
      return res.status(404).json({ message: "Note not found" });
    }

    const fileUrl = notes[0].file_url;

    // redirect to cloudinary
    res.redirect(fileUrl);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Download failed" });
  }
};

exports.voteNote = async (req, res) => {
  try {
    const noteId = req.params.id;
    const userId = req.user.id;
    const { vote_type } = req.body;

    if (!["upvote", "downvote"].includes(vote_type)) {
      return res.status(400).json({ message: "Invalid vote type" });
    }

    const [existingVote] = await pool.query(
      "SELECT vote_type FROM votes WHERE user_id = ? AND note_id = ?",
      [userId, noteId],
    );

    if (existingVote.length > 0) {
      await pool.query(
        "UPDATE votes SET vote_type = ? WHERE user_id = ? AND note_id = ?",
        [vote_type, userId, noteId],
      );

      return res.json({ message: "Vote updated" });
    }

    await pool.query(
      "INSERT INTO votes (user_id, note_id, vote_type) VALUES (?, ?, ?)",
      [userId, noteId, vote_type],
    );

    res.json({ message: "Vote added" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

exports.getVoteCounts = async (req, res) => {
  try {
    const noteId = req.params.id;

    const [rows] = await pool.query(
      `
      SELECT
        SUM(vote_type = 'upvote') AS upvotes,
        SUM(vote_type = 'downvote') AS downvotes
      FROM votes
      WHERE note_id = ?
      `,
      [noteId],
    );

    res.json(rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

exports.getTrendingNotes = async (req, res) => {
  try {
    const [notes] = await pool.query(
      `SELECT 
          n.id,
          n.title,
          n.description,
          n.file_url,
          n.created_at,
          SUM(v.vote_type = 'upvote') AS upvotes,
          SUM(v.vote_type = 'downvote') AS downvotes,
          SUM(v.vote_type = 'upvote') - SUM(v.vote_type = 'downvote') AS score
       FROM notes n
       LEFT JOIN votes v ON n.id = v.note_id
       WHERE n.is_hidden = 0
       GROUP BY n.id
       ORDER BY score DESC, n.created_at DESC
       LIMIT 20`,
    );

    res.json(notes);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error fetching trending notes" });
  }
};

exports.getRecommendedNotes = async (req, res) => {
  try {
    const userId = req.user.id;

    const [notes] = await pool.query(
      `
      SELECT DISTINCT n.id, n.title, n.description, n.file_url
      FROM notes n
      JOIN note_keywords nk ON n.id = nk.note_id
      JOIN keywords k ON nk.keyword_id = k.id
      JOIN (
        SELECT search_term
        FROM search_history
        WHERE user_id = ?
        GROUP BY search_term
        ORDER BY MAX(created_at) DESC
        LIMIT 20
      ) sh ON k.keyword LIKE CONCAT('%', sh.search_term, '%')
      WHERE n.is_hidden = 0 
        AND n.user_id != ?
      ORDER BY n.created_at DESC
      LIMIT 10
      `,
      [userId, userId],
    );

    res.json(notes);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error getting recommendations" });
  }
};

exports.reportNote = async (req, res) => {
  try {
    const userId = req.user.id;
    const noteId = req.params.id;
    const { reason } = req.body;

    // 1. Insert report (prevent duplicate reports)
    await pool.query(
      `INSERT IGNORE INTO reports (reporter_id, note_id, reason)
       VALUES (?, ?, ?)`,
      [userId, noteId, reason || null],
    );

    // 2. Count reports
    const [reportCountRows] = await pool.query(
      `SELECT COUNT(*) AS count FROM reports WHERE note_id = ?`,
      [noteId],
    );

    const reportCount = reportCountRows[0].count;

    // 3. Hide note if threshold reached
    if (reportCount >= 5) {
      await pool.query(`UPDATE notes SET is_hidden = 1 WHERE id = ?`, [noteId]);

      // 4. Get owner of note
      const [noteOwner] = await pool.query(
        `SELECT user_id FROM notes WHERE id = ?`,
        [noteId],
      );

      const ownerId = noteOwner[0].user_id;

      // 5. Count hidden notes of this user
      const [hiddenNotes] = await pool.query(
        `SELECT COUNT(*) AS count 
         FROM notes 
         WHERE user_id = ? AND is_hidden = 1`,
        [ownerId],
      );

      const hiddenCount = hiddenNotes[0].count;

      // 6. Ban user if threshold reached
      if (hiddenCount >= 5) {
        await pool.query(`UPDATE users SET is_banned = 1 WHERE id = ?`, [
          ownerId,
        ]);

        await pool.query(
          `INSERT INTO user_bans (user_id, reason)
           VALUES (?, ?)`,
          [ownerId, "Exceeded report threshold"],
        );
      }
    }

    res.json({ message: "Report submitted successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Report failed" });
  }
};

exports.getTopContributor = async (req, res) => {
  try {
    // 1. Get top contributor (last 7 days, exclude hidden notes)
    const [rows] = await pool.query(`
      SELECT 
        u.id,
        u.username,
        COUNT(n.id) AS total_notes
      FROM notes n
      JOIN users u ON n.user_id = u.id
      WHERE 
        n.created_at >= NOW() - INTERVAL 7 DAY
        AND n.is_hidden = 0
      GROUP BY u.id
      ORDER BY total_notes DESC
      LIMIT 1
    `);

    // 2. Handle no data
    if (rows.length === 0) {
      return res.json(null);
    }

    const topUser = rows[0];

    // 3. (Optional) get extra profile details
    const [userDetails] = await pool.query(
      `SELECT email FROM users WHERE id = ?`,
      [topUser.id],
    );

    // 4. Final response
    res.json({
      id: topUser.id,
      name: topUser.name,
      email: userDetails[0]?.email || null,
      total_notes: topUser.total_notes,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to fetch top contributor" });
  }
};
