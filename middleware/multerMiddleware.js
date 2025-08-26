import multer from "multer";
import fs from "fs";
import path from "path";

// Ensure temp folder exists
const tempDir = path.join(process.cwd(), "public", "temp");
if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, tempDir); // fixed path
  },
  filename: function (req, file, cb) {
    cb(null, file.originalname); // keep original name
  }
});

export const upload = multer({ storage: storage });
