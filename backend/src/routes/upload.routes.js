const {verifyToken, verifyTokenOptional} = require('../middleware/auth');
const {upload, uploadVideo, uploadGuide} = require('../middleware/upload');
const {processGuideUpload} = require('../services/guideAttachments');

const router = require('express').Router();

const publicBase = (req) => `${req.protocol}://${req.get('host')}`;

router.post('/image', verifyToken, upload.single('image'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({success: false, message: 'No image uploaded'});
  }
  const url = `/uploads/${req.file.filename}`;
  res.status(200).json({
    success: true,
    url,
    fullUrl: `${publicBase(req)}${url}`,
  });
});

router.post('/images', verifyToken, upload.array('images', 10), (req, res) => {
  if (!req.files?.length) {
    return res.status(400).json({success: false, message: 'No images uploaded'});
  }
  const files = req.files.map((f) => {
    const url = `/uploads/${f.filename}`;
    return {url, fullUrl: `${publicBase(req)}${url}`};
  });
  res.status(200).json({success: true, files});
});

router.post('/video', verifyToken, uploadVideo.single('video'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({success: false, message: 'No video uploaded'});
  }
  const url = `/uploads/${req.file.filename}`;
  res.status(200).json({
    success: true,
    url,
    fullUrl: `${publicBase(req)}${url}`,
  });
});

/** Guide attachments — optional auth so guests can chat with files */
router.post('/guide', verifyTokenOptional, uploadGuide.single('file'), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({success: false, message: 'Aucun fichier envoyé'});
    }
    const attachment = await processGuideUpload(req.file, publicBase(req));
    res.status(200).json({success: true, attachment});
  } catch (e) {
    next(e);
  }
});

module.exports = router;
