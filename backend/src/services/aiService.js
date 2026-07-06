const { ApiError } = require('../utils/errorHandler');
const groq = require('./groqService');
const {
  tryNavigationInstant,
  synthesizeResearchReply,
  composeGeneralReply,
  buildGuideSystem,
} = require('./guideResearch');

const AI_PROVIDER = (process.env.AI_PROVIDER || 'groq').toLowerCase();

const useGuide = () => AI_PROVIDER === 'guide';
const useGroq = () => AI_PROVIDER === 'groq' || (!useGuide() && groq.hasKey());

const parseJsonFromText = (text) => {
  const cleaned = text.replace(/```json\n?/g, '').replace(/```/g, '').trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (match) return JSON.parse(match[0]);
    throw new Error('Invalid JSON from AI');
  }
};

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

exports.generateListing = async (payload, locale = 'fr') => {
  const lang = locale === 'ar' ? 'arabe' : locale === 'en' ? 'anglais' : 'français';
  const prompt = `Rédige une annonce immobilière en ${lang} pour la Tunisie.
Données: ${JSON.stringify(payload)}
JSON: {"title":"...","description":"..."}`;

  try {
    return await llmGenerate(prompt, { json: true });
  } catch {
    return {
      title: payload.title || `${payload.propertyType || 'Bien'} à ${payload.city || 'Tunis'}`,
      description: payload.description || `Bien à ${payload.city || 'Tunis'}. Prix: ${payload.price || ''} TND.`,
    };
  }
};

exports.estimatePrice = async (payload) => {
  const prompt = `Estime le prix en TND (Tunisie): ${JSON.stringify(payload)}
JSON: {"minPrice":number,"maxPrice":number,"currency":"TND","explanation":"2 phrases"}`;

  try {
    return await llmGenerate(prompt, { json: true });
  } catch {
    const area = Number(payload.area || payload.squareFeet) || 100;
    const base = area * 2500;
    return {
      minPrice: Math.round(base * 0.85),
      maxPrice: Math.round(base * 1.15),
      currency: 'TND',
      explanation: 'Estimation indicative basée sur la surface (hors-ligne).',
    };
  }
};

exports.chat = async (messages, context = {}, locale = 'fr') => {
  const last = messages[messages.length - 1]?.content || '';
  const research = context.research || {};

  if (useGroq() && groq.hasKey()) {
    const chatMessages = [
      { role: 'system', content: buildGuideSystem(research, context, locale) },
      ...messages
        .filter((m) => m?.content?.trim())
        .slice(-12)
        .map((m) => ({
          role: m.role === 'assistant' ? 'assistant' : 'user',
          content: m.content,
        })),
    ];

    try {
      const reply = await llmChat(chatMessages, { temperature: 0.65, maxTokens: 600 });
      return { reply };
    } catch {
      return { reply: composeGeneralReply(last, research, context, locale) };
    }
  }

  const nav = tryNavigationInstant(last, context, locale);
  if (nav) return { reply: nav };

  const synthesized = synthesizeResearchReply(last, research, context, locale);
  if (synthesized) return { reply: synthesized };

  return { reply: composeGeneralReply(last, research, context, locale) };
};

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
