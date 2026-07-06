const { ApiError } = require('../utils/errorHandler');

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL = process.env.GROQ_MODEL || 'llama-3.1-8b-instant';

const hasKey = () => Boolean(process.env.GROQ_API_KEY);

async function chat(messages, { temperature = 0.45, maxTokens = 500 } = {}) {
  const key = process.env.GROQ_API_KEY;
  if (!key) throw new ApiError('GROQ_API_KEY non configurée', 503);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 25000);

  const response = await fetch(GROQ_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
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

module.exports = { hasKey, chat, GROQ_MODEL };
