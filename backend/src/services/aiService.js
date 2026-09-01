const { ApiError } = require('../utils/errorHandler');
const groq = require('./groqService');
const {
  tryNavigationInstant,
  trySmallTalk,
  synthesizeResearchReply,
  composeGeneralReply,
  buildGuideSystem,
} = require('./guideResearch');

const AI_PROVIDER = (process.env.AI_PROVIDER || 'groq').toLowerCase();

const useGuide = () => AI_PROVIDER === 'guide';
const useGroq = () => AI_PROVIDER === 'groq' || (!useGuide() && groq.hasKey());

const parseJsonFromText = (text) => {
  const cleaned = String(text).replace(/```json\n?/g, '').replace(/```/g, '').trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (match) return JSON.parse(match[0]);
    throw new Error('Invalid JSON from AI');
  }
};

const collectImageUrls = (payload = {}) => {
  const urls = [];
  const push = (u) => {
    if (typeof u === 'string' && /^https?:\/\//i.test(u.trim())) urls.push(u.trim());
  };
  (payload.imageUrls || payload.images || []).forEach(push);
  push(payload.featuredImage);
  return [...new Set(urls)].slice(0, 4);
};

async function analyzeImagesWithVision(imageUrls, locale = 'fr') {
  if (!imageUrls.length || !useGroq() || !groq.hasKey()) return null;

  const lang = locale === 'ar' ? 'arabe' : locale === 'en' ? 'anglais' : 'français';
  const content = [
    {
      type: 'text',
      text: `Tu es expert immobilier en Tunisie. Analyse ces photos d'un bien.
Réponds UNIQUEMENT en JSON (${lang} pour les textes):
{"propertyType":"apartment|house|villa|studio|land|commercial|office",
 "condition":"new|good|renovate",
 "conditionLabel":"état visible en 2 mots",
 "roomsHint":"ex: salon, cuisine, chambre",
 "amenitiesGuess":["clim","parking",...],
 "qualityScore":1-10,
 "style":"moderne|classique|luxe|simple",
 "summary":"2 phrases sur ce que montrent les photos"}`,
    },
    ...imageUrls.map((url) => ({
      type: 'image_url',
      image_url: { url },
    })),
  ];

  try {
    const text = await groq.chatVision(
      [{ role: 'user', content }],
      { temperature: 0.2, maxTokens: 600 },
    );
    return parseJsonFromText(text);
  } catch (err) {
    console.warn('[AI] Vision analyze failed:', err.message);
    return null;
  }
}

async function llmGenerate(prompt, options = {}) {
  const { json = false, temperature = 0.4, system } = options;

  if (useGroq() && groq.hasKey()) {
    const messages = [];
    if (system) messages.push({ role: 'system', content: system });
    messages.push({
      role: 'user',
      content: json ? `${prompt}\nRéponds UNIQUEMENT avec du JSON valide.` : prompt,
    });
    const text = await groq.chat(messages, { temperature });
    return json ? parseJsonFromText(text) : text;
  }
  throw new ApiError('Aucun fournisseur IA configuré', 503);
}

async function llmChat(messages, options = {}) {
  if (useGroq() && groq.hasKey()) {
    return groq.chat(messages, options);
  }
  throw new ApiError('Aucun fournisseur IA configuré', 503);
}

const isConfigured = async () => {
  if (useGuide()) return true;
  return useGroq() && groq.hasKey();
};

exports.analyzeImages = async (payload, locale = 'fr') => {
  const urls = collectImageUrls(payload);
  if (!urls.length) {
    return {
      summary: 'Ajoutez des photos pour une analyse IA.',
      amenitiesGuess: [],
      condition: null,
      qualityScore: null,
    };
  }
  const vision = await analyzeImagesWithVision(urls, locale);
  if (vision) return vision;
  return {
    summary: 'Analyse visuelle indisponible — utilisez condition et équipements manuels.',
    amenitiesGuess: [],
    condition: payload.condition || null,
    qualityScore: null,
  };
};

exports.generateListing = async (payload, locale = 'fr') => {
  const urls = collectImageUrls(payload);
  if (!urls.length) {
    throw new ApiError('Ajoutez au moins une photo pour générer le texte', 400);
  }

  const lang = locale === 'ar' ? 'arabe' : locale === 'en' ? 'anglais' : 'français';
  const vision = await analyzeImagesWithVision(urls, locale);

  const enriched = {
    ...payload,
    imageAnalysis: vision || undefined,
    condition: payload.condition || vision?.condition,
    amenities: [
      ...new Set([...(payload.amenities || []), ...(vision?.amenitiesGuess || [])]),
    ],
  };

  const prompt = `Rédige une annonce immobilière attractive en ${lang} pour la Tunisie.
Base-toi sur les données ET l'analyse des photos (si présente).
Ne invente pas d'équipements absents des données/photos.
Données: ${JSON.stringify(enriched)}
JSON: {"title":"...","description":"...","suggestedAmenities":["..."],"suggestedCondition":"new|good|renovate"}`;

  try {
    const result = await llmGenerate(prompt, { json: true, temperature: 0.5 });
    return {
      title: result.title,
      description: result.description,
      suggestedAmenities: result.suggestedAmenities || vision?.amenitiesGuess || [],
      suggestedCondition: result.suggestedCondition || vision?.condition || null,
      imageSummary: vision?.summary || null,
    };
  } catch {
    return {
      title: payload.title || `${payload.propertyType || 'Bien'} à ${payload.city || 'Tunis'}`,
      description:
        payload.description ||
        `Bien ${payload.condition || ''} à ${payload.city || 'Tunis'}. ${vision?.summary || ''} Prix: ${payload.price || ''} TND.`.trim(),
      suggestedAmenities: vision?.amenitiesGuess || [],
      suggestedCondition: vision?.condition || null,
      imageSummary: vision?.summary || null,
    };
  }
};

exports.estimatePrice = async (payload, locale = 'fr') => {
  const urls = collectImageUrls(payload);
  const vision = await analyzeImagesWithVision(urls, locale);

  const area = Number(payload.area || payload.squareFeet) || 100;
  const bedrooms = Number(payload.bedrooms) || 2;
  const condition = payload.condition || vision?.condition || 'good';
  const listingType = payload.listingType === 'rent' ? 'rent' : 'sale';
  const city = payload.city || 'Tunis';
  const amenities = [
    ...new Set([...(payload.amenities || []), ...(vision?.amenitiesGuess || [])]),
  ];
  const quality = Number(vision?.qualityScore) || (condition === 'new' ? 8 : condition === 'renovate' ? 4 : 6);

  const prompt = `Estime le prix immobilier en Tunisie (TND) de façon réaliste.
Prends en compte: ville/quartier, type, surface, chambres, état (new/good/renovate),
équipements, score qualité photos (1-10), vente vs location journalière.
Données: ${JSON.stringify({
    city,
    state: payload.state,
    propertyType: payload.propertyType,
    listingType,
    area,
    bedrooms,
    bathrooms: payload.bathrooms,
    lotSize: payload.lotSize,
    condition,
    amenities,
    photoQuality: quality,
    photoSummary: vision?.summary,
    style: vision?.style,
  })}
JSON: {"minPrice":number,"maxPrice":number,"currency":"TND","explanation":"2-3 phrases justifiant l'état et les photos","factors":["..."]}`;

  try {
    const result = await llmGenerate(prompt, { json: true, temperature: 0.35 });
    return {
      ...result,
      imageSummary: vision?.summary || null,
      usedCondition: condition,
      usedAmenities: amenities,
    };
  } catch {
    const cityMul =
      /marsa|carthage|lac|gammarth/i.test(city) ? 1.35 :
      /sousse|sfax|nabeul/i.test(city) ? 0.95 :
      /tunis/i.test(city) ? 1.1 : 0.85;
    const condMul = condition === 'new' ? 1.2 : condition === 'renovate' ? 0.75 : 1;
    const amenMul = 1 + Math.min(amenities.length, 6) * 0.03;
    const qualityMul = 0.85 + quality * 0.025;
    let base = area * 2200 * cityMul * condMul * amenMul * qualityMul;
    if (listingType === 'rent') {
      base = Math.round((base / 220) * (bedrooms >= 3 ? 1.15 : 1));
    }
    return {
      minPrice: Math.round(base * 0.88),
      maxPrice: Math.round(base * 1.12),
      currency: 'TND',
      explanation:
        `Estimation hors-ligne: ${area} m², état « ${condition} », ${amenities.length} équipement(s), score photo ${quality}/10 à ${city}.`,
      factors: ['surface', 'état', 'ville', 'équipements', 'photos'],
      imageSummary: vision?.summary || null,
      usedCondition: condition,
      usedAmenities: amenities,
    };
  }
};

exports.chat = async (messages, context = {}, locale = 'fr') => {
  const last = messages[messages.length - 1]?.content || '';
  const research = context.research || {};
  const attachments = Array.isArray(context.attachments) ? context.attachments : [];
  const hasAttachments = attachments.length > 0;

  // Small talk / app intents — skip when user sent a file to analyze
  if (!hasAttachments) {
    const small = trySmallTalk(last, locale);
    if (small) return { reply: small };

    const nav = tryNavigationInstant(last, context, locale);
    if (nav) return { reply: nav };
  }

  const imageUrls = attachments
    .filter((a) => a?.type === 'image' && typeof a.url === 'string')
    .map((a) => a.url.trim())
    .filter((u) => /^https?:\/\//i.test(u))
    .slice(0, 4);

  const docBlocks = attachments
    .filter((a) => a && (a.extractedText || a.type === 'pdf' || a.type === 'text'))
    .map((a) => {
      const name = a.name || a.type || 'fichier';
      const body = a.extractedText
        ? a.extractedText
        : a.note || '(contenu non extractible — demandez une photo des pages si besoin)';
      return `--- ${name} ---\n${body}`;
    })
    .join('\n\n')
    .slice(0, 7000);

  if (useGroq() && groq.hasKey()) {
    const system = `${buildGuideSystem(research, context, locale)}${
      docBlocks
        ? `\n\nUSER ATTACHED DOCUMENTS (extracted text — use this):\n${docBlocks}`
        : ''
    }${
      imageUrls.length
        ? `\n\nThe user attached ${imageUrls.length} image(s). Analyze them in a real-estate / Immo Dary context.`
        : ''
    }`;

    try {
      if (imageUrls.length) {
        const caption =
          last?.trim() ||
          (locale === 'en'
            ? 'Analyze this attachment and help me (Tunisia real estate / Immo Dary).'
            : 'Analyse ce fichier et aide-moi (immobilier Tunisie / Immo Dary).');
        const visionMessages = [
          { role: 'system', content: system },
          {
            role: 'user',
            content: [
              { type: 'text', text: caption },
              ...imageUrls.map((url) => ({
                type: 'image_url',
                image_url: { url },
              })),
            ],
          },
        ];
        const reply = await groq.chatVision(visionMessages, {
          temperature: 0.4,
          maxTokens: 900,
        });
        if (reply?.trim()) return { reply: reply.trim() };
      }

      const chatMessages = [
        { role: 'system', content: system },
        ...messages
          .filter((m) => m?.content?.trim() || (m === messages[messages.length - 1] && hasAttachments))
          .filter((m) => !isTransientGuideBubble(m.content))
          .slice(-12)
          .map((m) => ({
            role: m.role === 'assistant' ? 'assistant' : 'user',
            content:
              m.content?.trim() ||
              (hasAttachments
                ? locale === 'en'
                  ? 'Please review my attachment.'
                  : 'Merci d’analyser mon fichier joint.'
                : ''),
          }))
          .filter((m) => m.content),
      ];

      const reply = await llmChat(chatMessages, { temperature: 0.45, maxTokens: 700 });
      if (reply?.trim()) return { reply: reply.trim() };
    } catch (err) {
      console.warn('[AI] Guide chat failed:', err?.message || err);
    }
  }

  if (hasAttachments) {
    const fr = locale !== 'en';
    const names = attachments.map((a) => a.name || a.type).join(', ');
    if (docBlocks) {
      return {
        reply: fr
          ? `J’ai bien reçu votre fichier (${names}). Extrait :\n${docBlocks.slice(0, 1200)}\n\nQue voulez-vous en savoir (prix, quartier, conformité…) ?`
          : `Got your file (${names}). Ask me what you need from it.`,
      };
    }
    if (imageUrls.length) {
      return {
        reply: fr
          ? `J’ai reçu votre photo. Décrivez ce que vous voulez en savoir (état du bien, type, estimation…) et je vous aide.`
          : `Got your photo — tell me what you want to know about it.`,
      };
    }
  }

  const synthesized = synthesizeResearchReply(last, research, context, locale);
  if (synthesized) return { reply: synthesized };

  return { reply: composeGeneralReply(last, research, context, locale) };
};

function isTransientGuideBubble(content = '') {
  const c = String(content).toLowerCase();
  return (
    c.includes('réfléch') ||
    c.includes('thinking') ||
    c.includes('جاري') ||
    c.includes('impossible de répondre') ||
    c.includes('could not reach')
  );
}

exports.suggestContactMessage = async (property, locale = 'fr') => {
  const prompt = `Message poli pour contacter le vendeur: ${JSON.stringify({ title: property.title, city: property.city, price: property.price })}
Langue: ${locale}. JSON: {"message":"..."}`;

  try {
    return await llmGenerate(prompt, { json: true });
  } catch {
    return {
      message: `Bonjour, je suis intéressé(e) par votre annonce "${property.title}" à ${property.city || 'Tunis'}. Merci.`,
    };
  }
};

exports.summarizeNotification = async (notification, locale = 'fr') => {
  try {
    const prompt = `Résume en 1 phrase (${locale}): ${JSON.stringify(notification)}
JSON: {"summary":"...","priority":"low|normal|high"}`;
    return await llmGenerate(prompt, { json: true });
  } catch {
    return { summary: notification.message || notification.title || 'Notification', priority: 'normal' };
  }
};

exports.isConfigured = isConfigured;
exports.getProvider = () => {
  if (useGuide()) return 'guide';
  if (useGroq() && groq.hasKey()) return 'groq';
  return 'guide';
};
exports.getModel = () => {
  if (useGuide()) return 'guide-intelligent';
  if (useGroq() && groq.hasKey()) return groq.GROQ_MODEL;
  return 'guide-intelligent';
};
