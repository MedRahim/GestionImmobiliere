const path = require('path');
const {verifyToken} = require('../middleware/auth');
const {upload} = require('../middleware/upload');

const router = require('express').Router();

router.post('/image', verifyToken, upload.single('image'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({success: false, message: 'No image uploaded'});
  }
  const url = `/uploads/${req.file.filename}`;
  res.status(200).json({
    success: true,
    url,
    fullUrl: `${req.protocol}://${req.get('host')}${url}`,
  });
});

router.post('/images', verifyToken, upload.array('images', 10), (req, res) => {
  if (!req.files?.length) {
    return res.status(400).json({success: false, message: 'No images uploaded'});
  }
  const files = req.files.map((f) => {
    const url = `/uploads/${f.filename}`;
    return {url, fullUrl: `${req.protocol}://${req.get('host')}${url}`};
  });
  res.status(200).json({success: true, files});
});

module.exports = router;
