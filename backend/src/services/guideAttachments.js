const fs = require('fs');
const path = require('path');

/** Best-effort PDF text extract without hard dependency on pdf-parse */
async function extractPdfText(filePath) {
  try {
    // Optional dependency — install on server if available
    // eslint-disable-next-line import/no-extraneous-dependencies
    const pdfParse = require('pdf-parse');
    const buf = fs.readFileSync(filePath);
    const data = await pdfParse(buf);
    const text = String(data?.text || '')
      .replace(/\s+/g, ' ')
      .trim();
    return text.slice(0, 8000) || null;
  } catch {
    try {
      return crudePdfText(fs.readFileSync(filePath));
    } catch {
      return null;
    }
  }
}

/** Very rough fallback: pull literal strings from PDF content streams */
function crudePdfText(buf) {
  const raw = buf.toString('latin1');
  const chunks = [];
  const re = /\((?:\\.|[^\\)]){2,200}\)/g;
  let m;
  while ((m = re.exec(raw)) && chunks.length < 400) {
    const inner = m[0]
      .slice(1, -1)
      .replace(/\\n/g, ' ')
      .replace(/\\(.)/g, '$1');
    if (/[A-Za-zÀ-ÿ\u0600-\u06FF]{3,}/.test(inner)) {
      chunks.push(inner);
    }
  }
  const text = chunks.join(' ').replace(/\s+/g, ' ').trim();
  return text.slice(0, 8000) || null;
}

function classifyMime(file) {
  const mime = (file.mimetype || '').toLowerCase();
  const name = file.originalname || file.filename || '';
  if (/^image\//.test(mime) || /\.(jpe?g|png|webp|gif)$/i.test(name)) return 'image';
  if (mime === 'application/pdf' || /\.pdf$/i.test(name)) return 'pdf';
  if (mime === 'text/plain' || /\.txt$/i.test(name)) return 'text';
  return 'file';
}

/**
 * Build public attachment metadata for Guide chat.
 * @param {Express.Multer.File} file
 * @param {string} publicBase e.g. http://host:5000
 */
async function processGuideUpload(file, publicBase) {
  const relativeUrl = `/uploads/${file.filename}`;
  const fullUrl = `${String(publicBase || '').replace(/\/$/, '')}${relativeUrl}`;
  const type = classifyMime(file);
  const base = {
    type,
    url: fullUrl,
    path: relativeUrl,
    name: file.originalname || file.filename,
    mime: file.mimetype || null,
  };

  if (type === 'image') {
    return base;
  }

  if (type === 'pdf') {
    const extractedText = await extractPdfText(file.path);
    return {
      ...base,
      extractedText:
        extractedText ||
        null,
      note: extractedText
        ? null
        : 'PDF reçu — texte difficile à extraire. L’utilisateur peut envoyer une capture des pages.',
    };
  }

  if (type === 'text') {
    try {
      const extractedText = fs.readFileSync(file.path, 'utf8').slice(0, 8000);
      return { ...base, extractedText };
    } catch {
      return base;
    }
  }

  return base;
}

module.exports = { processGuideUpload, extractPdfText, classifyMime };
