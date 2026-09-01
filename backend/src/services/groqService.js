const { ApiError } = require('../utils/errorHandler');

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';

/** Models shut down for free/dev tiers — remap so old .env still works */
const MODEL_ALIASES = {
  'llama-3.1-8b-instant': 'openai/gpt-oss-20b',
  'llama-3.3-70b-versatile': 'openai/gpt-oss-120b',
  'meta-llama/llama-4-scout-17b-16e-instruct': 'qwen/qwen3.6-27b',
  'meta-llama/llama-4-maverick-17b-128e-instruct': 'qwen/qwen3.6-27b',
  'qwen/qwen3-32b': 'openai/gpt-oss-120b',
};

function resolveModel(id) {
  const raw = id || 'openai/gpt-oss-20b';
  return MODEL_ALIASES[raw] || raw;
}

const GROQ_MODEL = resolveModel(process.env.GROQ_MODEL || 'openai/gpt-oss-20b');
const GROQ_VISION_MODEL = resolveModel(
  process.env.GROQ_VISION_MODEL || 'qwen/qwen3.6-27b',
);

const hasKey = () => Boolean(process.env.GROQ_API_KEY);

async function chat(messages, { temperature = 0.45, maxTokens = 500, model } = {}) {
  const key = process.env.GROQ_API_KEY;
  if (!key) throw new ApiError('GROQ_API_KEY non configurée', 503);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 45000);

  const response = await fetch(GROQ_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model: resolveModel(model || GROQ_MODEL),
      messages,
      temperature,
      max_tokens: maxTokens,
    }),
    signal: controller.signal,
  });
  clearTimeout(timer);

  const data = await response.json();
  if (!response.ok) {
    const msg = data?.error?.message || 'Groq API error';
    throw new ApiError(msg, response.status >= 500 ? 502 : 400);
  }

  const text = data.choices?.[0]?.message?.content?.trim();
  if (!text) throw new ApiError('Réponse Groq vide', 502);
  return text;
}

/** Multimodal chat (text + image URLs) using vision model */
async function chatVision(messages, options = {}) {
  return chat(messages, {
    ...options,
    model: options.model || GROQ_VISION_MODEL,
    maxTokens: options.maxTokens || 800,
  });
}

module.exports = { hasKey, chat, chatVision, GROQ_MODEL, GROQ_VISION_MODEL };
