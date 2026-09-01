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
    typeof aiService.getModel === 'function'
      ? aiService.getModel()
      : provider === 'groq'
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
    const result = await aiService.estimatePrice(req.body, localeFromReq(req));
    res.json({ success: true, ...result });
  } catch (e) { next(e); }
};

exports.analyzeImages = async (req, res, next) => {
  try {
    const result = await aiService.analyzeImages(req.body, localeFromReq(req));
    res.json({ success: true, ...result });
  } catch (e) { next(e); }
};

exports.chat = async (req, res, next) => {
  try {
    const { messages = [], context = {} } = req.body;
    const enriched = { ...context };

    enriched.appGuide = {
      tabs: {
        Accueil: 'Carte OpenStreetMap + liste des biens (feuille glissante en bas). Bouton + pour publier. Bouton GPS pour ma position.',
        Favoris: 'Biens sauvegardés (connexion requise) — onglet cœur en bas.',
        Guide: 'Onglet central en bas — assistant IA pour questions sur l’app, les quartiers, les prix.',
        Messages: 'Conversations avec vendeurs/acheteurs (connexion requise).',
        Profil: 'Compte, langue, mot de passe, déconnexion — onglet profil en bas.',
      },
      header: {
        menu: 'Icône menu (☰) à gauche → Mes annonces, Demandes, Notifications, Publier.',
        search: 'Loupe en haut à droite → recherche avancée (ville, prix, type…). PAS un onglet du bas.',
        notifications: 'Cloche en haut → notifications.',
      },
      actions: {
        publish: 'Accueil → bouton + turquoise, ou menu → Publier une annonce.',
        contactSeller: 'Fiche bien → Contacter le vendeur (en bas).',
        favorites: 'Cœur sur une annonce ou sur la photo du détail.',
        share: 'Bouton partager sur la photo du détail.',
        myListings: 'Menu → Mes annonces (modifier / supprimer / stats).',
        inquiries: 'Menu → Demandes (messages des acheteurs).',
      },
      tip: 'Ne dis JAMAIS qu’il y a un onglet Recherche en bas — la recherche est l’icône loupe du header.',
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

    const lastMsg = messages[messages.length - 1] || {};
    const lastQ = lastMsg.content || '';
    if (!enriched.attachments?.length && Array.isArray(lastMsg.attachments)) {
      enriched.attachments = lastMsg.attachments;
    }
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
