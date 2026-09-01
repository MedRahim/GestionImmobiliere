const path = require('path');
const fs = require('fs');
const multer = require('multer');

const uploadDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, {recursive: true});
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const ext = path.extname(file.originalname) || '.jpg';
    cb(null, `${unique}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: {fileSize: 5 * 1024 * 1024},
  fileFilter: (_req, file, cb) => {
    if (/^image\/(jpeg|jpg|png|webp|gif)$/i.test(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  },
});

const uploadVideo = multer({
  storage,
  limits: {fileSize: 40 * 1024 * 1024},
  fileFilter: (_req, file, cb) => {
    if (/^video\/(mp4|quicktime|webm|x-m4v)$/i.test(file.mimetype) || /\.(mp4|mov|webm|m4v)$/i.test(file.originalname)) {
      cb(null, true);
    } else {
      cb(new Error('Only video files (mp4/mov/webm) are allowed'));
    }
  },
});

/** Guide chatbot: images, PDF, plain text (guests allowed) */
const uploadGuide = multer({
  storage,
  limits: {fileSize: 10 * 1024 * 1024},
  fileFilter: (_req, file, cb) => {
    const mime = file.mimetype || '';
    const name = file.originalname || '';
    const ok =
      /^image\/(jpeg|jpg|png|webp|gif)$/i.test(mime) ||
      mime === 'application/pdf' ||
      mime === 'text/plain' ||
      /\.(jpe?g|png|webp|gif|pdf|txt)$/i.test(name);
    if (ok) cb(null, true);
    else cb(new Error('Type non supporté (image, PDF ou texte)'));
  },
});

module.exports = {upload, uploadVideo, uploadGuide};
