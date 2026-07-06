const { query } = require('../models/database');
const aiService = require('../services/aiService');
const groq = require('../services/groqService');
const { buildResearch } = require('../services/guideResearch');

const localeFromReq = (req) => req.body?.locale || req.query?.locale || 'fr';

const basePropertySelect = `
  SELECT TOP 50 p.PropertyId, p.Title, p.City, p.Price, p.PropertyType, p.Bedrooms,
         p.Bathrooms, p.SquareFeet, p.Description, p.FeaturedImage
  FROM [dbo].[Properties] p
  WHERE p.IsActive = 1 AND p.DeletedAt IS NULL AND p.Status = 'active'
`;

exports.status = async (req, res) => {
  const provider = aiService.getProvider();
  const configured = await aiService.isConfigured();
  const model =
    provider === 'groq'
      ? process.env.GROQ_MODEL || groq.GROQ_MODEL
      : 'guide-intelligent';
  res.json({
    success: true,
    provider,
    configured,
    model,
  });
};

exports.generateListing = async (req, res, next) => {
  try {
    const result = await aiService.generateListing(req.body, localeFromReq(req));
    res.json({ success: true, ...result });
  } catch (e) { next(e); }
};

exports.estimatePrice = async (req, res, next) => {
  try {
    const result = await aiService.estimatePrice(req.body);
    res.json({ success: true, ...result });
  } catch (e) { next(e); }
};

exports.chat = async (req, res, next) => {
  try {
    const { messages = [], context = {} } = req.body;
    const enriched = { ...context };

    enriched.appGuide = {
      tabs: {
        Home: 'Carte avec biens sur la carte, liste en bas, bouton + pour publier',
        Search: 'Filtres classiques (ville, prix, type, chambres...)',
        Favorites: 'Biens sauvegardés (connexion requise)',
        Messages: 'Conversations avec vendeurs (connexion requise)',
        Profile: 'Compte, langue, déconnexion',
      },
      actions: {
        publish: 'Accueil → bouton + ou menu Publier',
        contactSeller: 'Fiche bien → Contacter le vendeur',
        favorites: 'Cœur sur une annonce',
        guide: 'Bouton flottant Guide (💬) sur les écrans principaux',
      },
    };

    if (context.propertyId) {
      const propResult = await query(
        `SELECT p.PropertyId, p.Title, p.City, p.Address, p.State, p.Price, p.PropertyType,
                p.Bedrooms, p.Bathrooms, p.SquareFeet, p.Description, p.Latitude, p.Longitude
         FROM [dbo].[Properties] p
         WHERE p.PropertyId = @propertyId AND p.IsActive = 1 AND p.DeletedAt IS NULL`,
        { propertyId: Number(context.propertyId) },
      );
      if (propResult.recordset[0]) {
        const p = propResult.recordset[0];
        enriched.focusProperty = {
          id: p.PropertyId,
          title: p.Title,
          city: p.City,
          address: p.Address,
          state: p.State,
          price: p.Price,
          type: p.PropertyType,
          bedrooms: p.Bedrooms,
          bathrooms: p.Bathrooms,
          area: p.SquareFeet,
          description: p.Description?.slice(0, 500),
          latitude: p.Latitude,
          longitude: p.Longitude,
        };
      }
    }

    const propsResult = await query(`${basePropertySelect} ORDER BY p.CreatedAt DESC`);
    enriched.sampleProperties = propsResult.recordset.slice(0, 15).map((p) => ({
      id: p.PropertyId,
      title: p.Title,
      city: p.City,
      price: p.Price,
      type: p.PropertyType,
    }));

    const lastQ = messages[messages.length - 1]?.content || '';
    enriched.research = await buildResearch(lastQ, enriched, query);
    if (enriched.userLocation) {
      enriched.research.userLocation = enriched.userLocation;
    }

    const result = await aiService.chat(messages, enriched, localeFromReq(req));
    res.json({ success: true, ...result });
  } catch (e) { next(e); }
};

exports.suggestContactMessage = async (req, res, next) => {
  try {
    const { property } = req.body;
    if (!property?.title) {
      return res.status(400).json({ success: false, message: 'property is required' });
    }
    const result = await aiService.suggestContactMessage(property, localeFromReq(req));
    res.json({ success: true, ...result });
  } catch (e) { next(e); }
};

exports.summarizeNotification = async (req, res, next) => {
  try {
    const result = await aiService.summarizeNotification(req.body, localeFromReq(req));
    res.json({ success: true, ...result });
  } catch (e) { next(e); }
};
