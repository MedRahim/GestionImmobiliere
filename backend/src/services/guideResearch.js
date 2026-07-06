const CITY_INSIGHTS = {
  tunis: {
    safety: 'Centre animé le jour ; certains secteurs demandent prudence la nuit. Visite sur place recommandée.',
    transport: 'Métro léger, bus, taxis. Bonne desserte vers les banlieues.',
    lifestyle: 'Commerces, administrations, universités selon le secteur.',
  },
  'la marsa': {
    safety: 'Zone côtière résidentielle, globalement calme. Vérifiez la rue précise.',
    transport: 'Accès Tunis, taxis, corniche.',
    lifestyle: 'Restaurants, plage, ambiance balnéaire.',
  },
  hammamet: {
    safety: 'Ville touristique ; centre plutôt sûr. Renseignez-vous sur le quartier exact.',
    transport: 'Route Nabeul/Tunis, louages.',
    lifestyle: 'Plages, médina, activités estivales.',
  },
  sousse: {
    safety: 'Centre fréquenté ; visitez jour et soir avant de décider.',
    transport: 'Gare, louages, hub régional.',
    lifestyle: 'Port, médina, côte.',
  },
  sfax: {
    safety: 'Grande ville ; quartiers variés — visite conseillée.',
    transport: 'Aéroport, transport local.',
    lifestyle: 'Port, centre historique.',
  },
  ariana: {
    safety: 'Banlieue nord résidentielle et commerciale.',
    transport: 'Proche Tunis, bus et métro.',
    lifestyle: 'Cadre familial.',
  },
  'ben arous': {
    safety: 'Zone urbaine mixte ; privilégiez les visites accompagnées.',
    transport: 'Proche Tunis sud.',
    lifestyle: 'Zones industrielles et résidentielles.',
  },
  nabeul: {
    safety: 'Cap Bon, zones touristiques et agricoles.',
    transport: 'Route côtière, louages.',
    lifestyle: 'Poterie, plages, Hammamet proche.',
  },
  bizerte: {
    safety: 'Ville portuaire ; centre animé, quartiers résidentiels calmes au nord.',
    transport: 'Gare routière, liaison Tunis.',
    lifestyle: 'Port, médina, lac de Bizerte.',
  },
  monastir: {
    safety: 'Zone touristique et universitaire, globalement sûre.',
    transport: 'Aéroport proche, train vers Sousse.',
    lifestyle: 'Ribat, plages, université.',
  },
  mahdia: {
    safety: 'Ville côtière calme ; centre historique agréable.',
    transport: 'Louages, route côtière.',
    lifestyle: 'Pêche, plages, médina.',
  },
  gabes: {
    safety: 'Grande ville du sud ; visitez le quartier visé.',
    transport: 'Hub régional, oasis proche.',
    lifestyle: 'Oasis, industrie, côte.',
  },
  kairouan: {
    safety: 'Ville historique ; centre fréquenté le jour.',
    transport: 'Louages vers le centre.',
    lifestyle: 'Patrimoine, artisanat, médina.',
  },
  djerba: {
    safety: 'Île touristique, zones balnéaires plutôt sûres.',
    transport: 'Aéroport, route causeway.',
    lifestyle: 'Plages, hôtels, Houmt Souk.',
  },
  manouba: {
    safety: 'Banlieue ouest de Tunis, mixte résidentiel.',
    transport: 'Proche Tunis, bus.',
    lifestyle: 'Université, zones agricoles.',
  },
  carthage: {
    safety: 'Quartier résidentiel huppé et touristique.',
    transport: 'TGM vers Tunis, taxis.',
    lifestyle: 'Sites antiques, vue mer.',
  },
  'sidi bou said': {
    safety: 'Village touristique très fréquenté, sûr en journée.',
    transport: 'TGM Carthage, taxis.',
    lifestyle: 'Vue mer, cafés, artisanat.',
  },
};

const norm = (s) => (s || '').toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '');

function haversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function findCityKey(text) {
  const q = norm(text);
  for (const city of Object.keys(CITY_INSIGHTS)) {
    if (q.includes(city)) return city;
  }
  return null;
}

function cityInsight(cityName) {
  if (!cityName) return null;
  return CITY_INSIGHTS[norm(cityName)] || null;
}

exports.isNavigationQuestion = (question) => {
  const q = norm(question);
  return (
    /publier|publication|annonce|vendre|favori|message|utiliser l.?application|navigation|comment ca marche|comment ça marche|^recherche|trouver des biens/.test(
      q,
    ) && !/s[uû]r|securit|quartier|proche|pr[eè]s|lieu|place|ville|zone|proximit/.test(q)
  );
};

exports.tryNavigationInstant = (question, _context = {}, locale = 'fr') => {
  const q = norm(question);
  const fr = locale === 'fr' || !locale;

  if (/^(bonjour|salut|hello|hi|coucou|bonsoir)\b/.test(q)) {
    return fr
      ? `Bonjour ! Je suis le guide Immo Dary. Interrogez-moi sur un bien, un quartier, la proximité, la sécurité ou l'app.`
      : `Hello! Ask about properties, areas, or the app.`;
  }

  if (/publier|publication|annonce|vendre|ajouter un bien/.test(q)) {
    return fr
      ? `Pour publier :\n1. Accueil → bouton +\n2. Formulaire (photos, prix, ville)\n3. Validez — visible sur carte et recherche.`
      : `Home → + → fill form → submit.`;
  }

  if (/utiliser l.?application|navigation|comment ca marche|comment ça marche/.test(q) && !/quartier|lieu|ville/.test(q)) {
    return fr
      ? `• Accueil : carte + liste\n• Recherche : filtres\n• Favoris / Messages : connexion requise\n• Profil : compte & langue\n• Guide : onglet central`
      : `Home, Search, Favorites, Messages, Profile.`;
  }

  if (/contacter|contact|vendeur|ecrire au|écrire au/.test(q)) {
    return fr
      ? `Pour contacter le vendeur :\n1. Ouvrez la fiche du bien\n2. Appuyez sur « Contacter le vendeur »\n3. Envoyez votre message dans l'onglet Messages`
      : `Open property → Contact seller → Messages tab.`;
  }

  if (/favori|conversation/.test(q) && !/vendeur|contact/.test(q)) {
    return fr
      ? `Favoris : cœur sur une annonce.\nMessages : onglet Messages ou « Contacter le vendeur ».`
      : `Heart for favorites. Messages tab.`;
  }

  if (/^recherche|trouver des biens/.test(q)) {
    return fr ? `Recherche → ville, budget, type → « Trouver des biens ».` : `Search → filters.`;
  }

  return null;
};

exports.buildResearch = async (question, context, dbQuery) => {
  const research = {
    questionCity: findCityKey(question),
    focusProperty: context.focusProperty || null,
    userLocation: context.userLocation || null,
    distanceToFocusKm: null,
    cityStats: null,
    sameCityListings: [],
    nearbyListings: [],
    nearUserListings: [],
    cityInsight: null,
  };

  const prop = research.focusProperty;
  const city = prop?.city || research.questionCity;
  const user = research.userLocation;

  if (user?.latitude && user?.longitude) {
    if (prop?.latitude && prop?.longitude) {
      research.distanceToFocusKm =
        Math.round(haversineKm(user.latitude, user.longitude, prop.latitude, prop.longitude) * 10) / 10;
    }

    if (dbQuery) {
      try {
        const withCoords = await dbQuery(
          `SELECT TOP 40 PropertyId, Title, City, Price, Latitude, Longitude
           FROM [dbo].[Properties]
           WHERE IsActive = 1 AND DeletedAt IS NULL
             AND Latitude IS NOT NULL AND Longitude IS NOT NULL`,
        );
        research.nearUserListings = (withCoords.recordset || [])
          .map((p) => ({
            id: p.PropertyId,
            title: p.Title,
            city: p.City,
            price: p.Price,
            distanceKm:
              Math.round(
                haversineKm(user.latitude, user.longitude, p.Latitude, p.Longitude) * 10,
              ) / 10,
          }))
          .sort((a, b) => a.distanceKm - b.distanceKm)
          .slice(0, 6);
      } catch {
        // ignore
      }
    }
  }

  if (city && dbQuery) {
    try {
      const stats = await dbQuery(
        `SELECT COUNT(*) AS cnt, AVG(CAST(Price AS FLOAT)) AS avgPrice,
                MIN(Price) AS minPrice, MAX(Price) AS maxPrice
         FROM [dbo].[Properties]
         WHERE IsActive = 1 AND DeletedAt IS NULL AND LOWER(City) LIKE @city`,
        { city: `%${norm(city)}%` },
      );
      if (stats.recordset[0]) research.cityStats = stats.recordset[0];

      const sameCity = await dbQuery(
        `SELECT TOP 6 PropertyId, Title, City, Price, Latitude, Longitude, PropertyType
         FROM [dbo].[Properties]
         WHERE IsActive = 1 AND DeletedAt IS NULL
           AND LOWER(City) LIKE @city
           AND (@exclude IS NULL OR PropertyId <> @exclude)
         ORDER BY CreatedAt DESC`,
        { city: `%${norm(city)}%`, exclude: prop?.id || null },
      );
      research.sameCityListings = sameCity.recordset || [];
    } catch {
      // ignore
    }
  }

  if (prop?.latitude && prop?.longitude && research.sameCityListings.length) {
    research.nearbyListings = research.sameCityListings
      .filter((p) => p.Latitude && p.Longitude)
      .map((p) => ({
        id: p.PropertyId,
        title: p.Title,
        price: p.Price,
        distanceKm: Math.round(haversineKm(prop.latitude, prop.longitude, p.Latitude, p.Longitude) * 10) / 10,
      }))
      .filter((p) => p.distanceKm < 30)
      .sort((a, b) => a.distanceKm - b.distanceKm)
      .slice(0, 5);
  }

  research.cityInsight = cityInsight(city || prop?.city);
  return research;
};

exports.synthesizeResearchReply = (question, research, context, locale = 'fr') => {
  const q = norm(question);
  const prop = research.focusProperty || context.focusProperty;
  const city = prop?.city || research.questionCity || findCityKey(question);
  const insight = research.cityInsight || cityInsight(city);
  const fr = locale !== 'en';

  const propBlock = prop
    ? `📍 ${prop.title}\n${[prop.address, prop.city, prop.state].filter(Boolean).join(', ')}\nPrix : ${prop.price || '—'} TND · ${prop.bedrooms || '?'} ch. · ${prop.area || '?'} m²${prop.description ? `\n${prop.description.slice(0, 180)}…` : ''}`
    : '';

  const stats = research.cityStats;
  const statsLine =
    stats && stats.cnt > 0
      ? `\n📊 Marché à ${city} : ${stats.cnt} annonce(s), prix moyen ~${Math.round(stats.avgPrice || 0).toLocaleString('fr-TN')} TND.`
      : '';

  const nearby =
    research.nearbyListings?.length > 0
      ? `\n🏘 Proches sur l'app :\n${research.nearbyListings.map((p) => `• ${p.title} — ${p.price} TND (~${p.distanceKm} km)`).join('\n')}`
      : research.sameCityListings?.length > 0
      ? `\n🏘 Autres biens à ${city} :\n${research.sameCityListings.slice(0, 4).map((p) => `• ${p.Title} — ${p.Price} TND`).join('\n')}`
      : '';

  const insightBlock = insight
    ? `\n🔎 Secteur :\n• Sécurité : ${insight.safety}\n• Transports : ${insight.transport}\n• Cadre : ${insight.lifestyle}`
    : '';

  const userLoc = research.userLocation || context.userLocation;
  const userPosLine = userLoc?.latitude
    ? `\n📍 Votre position GPS est utilisée pour les distances.`
    : '';

  const distToYou =
    research.distanceToFocusKm != null
      ? `\n🚗 Distance jusqu'à vous : **${research.distanceToFocusKm} km**${
          research.distanceToFocusKm < 5
            ? ' — très proche'
            : research.distanceToFocusKm < 15
            ? ' — à proximité'
            : research.distanceToFocusKm < 40
            ? ' — trajet modéré'
            : ' — assez éloigné'
        }.`
      : '';

  const nearUser =
    research.nearUserListings?.length > 0
      ? `\n🏠 Biens les plus proches de vous :\n${research.nearUserListings
          .map((p) => `• ${p.title} (${p.city}) — ${p.price} TND · ${p.distanceKm} km`)
          .join('\n')}`
      : '';

  if (/s[uû]r|securit|danger|quartier|crimin/.test(q)) {
    return fr
      ? `${propBlock ? propBlock + '\n\n' : ''}**Sécurité & quartier**${city ? ` — ${city}` : ''}${insightBlock}${statsLine}\n\n⚠️ Visitez le quartier avant de vous engager.`
      : `Safety notes for ${city}.${insightBlock}`;
  }

  if (/proche|pr[eè]s|distance|loin|chez moi|autour|proximit/.test(q)) {
    const mapTip = prop?.latitude
      ? "Voir l'épingle sur la carte Accueil."
      : 'Ouvrez la fiche ou la carte Accueil.';
    if (!userLoc?.latitude) {
      return fr
        ? `${propBlock ? propBlock + '\n\n' : ''}**Proximité**\n${mapTip}${nearby}${statsLine}\n\n⚠️ Activez la localisation dans le Guide pour calculer la distance depuis chez vous.`
        : `${mapTip}${nearby}`;
    }
    return fr
      ? `${propBlock ? propBlock + '\n\n' : ''}**Proximité**${userPosLine}${distToYou}${nearUser}${nearby}${statsLine}`
      : `${distToYou}${nearUser}`;
  }

  if (/lieu|place|ville|zone|localisation|adresse|carte|ou se trouve/.test(q) || (city && !propBlock)) {
    return fr
      ? `${propBlock ? propBlock + '\n\n' : ''}**Lieu & environnement**${city ? ` — ${city}` : ''}${insightBlock}${nearby}${statsLine}`
      : `Area info${city ? `: ${city}` : ''}.${insightBlock}`;
  }

  if (/prix|budget|combien|march/.test(q)) {
    return fr
      ? `${propBlock ? propBlock + '\n\n' : ''}**Prix & marché**${statsLine}${nearby}`
      : `Market${statsLine}`;
  }

  if (/recommand|suggest|meilleur|quel bien|propose|cherche un bien/.test(q)) {
    if (research.nearUserListings?.length > 0) {
      return fr
        ? `**Biens recommandés près de vous :**\n${research.nearUserListings
            .map((p) => `• ${p.title} (${p.city}) — ${Number(p.price).toLocaleString('fr-TN')} TND · ${p.distanceKm} km`)
            .join('\n')}\n\nOuvrez une fiche pour plus de détails.`
        : `Near you:\n${research.nearUserListings.map((p) => `• ${p.title}`).join('\n')}`;
    }
    if (research.sameCityListings?.length > 0) {
      const cityName = city || research.sameCityListings[0].City;
      return fr
        ? `**Biens à ${cityName} :**\n${research.sameCityListings
            .slice(0, 5)
            .map((p) => `• ${p.Title} — ${Number(p.Price).toLocaleString('fr-TN')} TND`)
            .join('\n')}`
        : `Listings in ${cityName}.`;
    }
    return fr
      ? `Consultez l'onglet **Accueil** (carte) ou **Recherche** avec vos filtres (ville, budget, type).`
      : `Use Home map or Search filters.`;
  }

  if (prop) {
    return fr
      ? `${propBlock}${insightBlock}${statsLine}${nearby}\n\nDemandez : sécurité, proximité, prix du marché, contact vendeur.`
      : propBlock;
  }

  if (city) {
    return fr
      ? `**${city}**${insightBlock}${statsLine}${nearby}`
      : `${city}${insightBlock}`;
  }

  return null;
};

/** Réponse utile même si la question ne matche aucun motif précis */
exports.composeGeneralReply = (question, research, context, locale = 'fr') => {
  const fr = locale !== 'en';
  const prop = research.focusProperty || context.focusProperty;
  const q = norm(question);

  if (/immo dary|cette app|application/.test(q)) {
    return fr
      ? `**Immo Dary** — immobilier en Tunisie.\n• Carte & annonces\n• Recherche avancée\n• Publier un bien (+)\n• Favoris & messages\n\nPosez-moi une question sur un bien, une ville ou la sécurité d'un quartier.`
      : `Immo Dary — Tunisia real estate app.`;
  }

  const synthesized = exports.synthesizeResearchReply(question, research, context, locale);
  if (synthesized) return synthesized;

  if (research.nearUserListings?.length > 0) {
    return fr
      ? `**Autour de vous :**\n${research.nearUserListings
          .slice(0, 4)
          .map((p) => `• ${p.title} (${p.city}) — ${Number(p.price).toLocaleString('fr-TN')} TND`)
          .join('\n')}\n\nDemandez : sécurité, prix du marché, proximité.`
      : `Listings near you available.`;
  }

  if (prop) {
    return fr
      ? `**${prop.title}** — ${prop.city || 'Tunisie'}\nPrix : ${prop.price ? `${Number(prop.price).toLocaleString('fr-TN')} TND` : '—'}\n\nJe peux vous parler du quartier, de la sécurité, des biens proches ou du contact vendeur.`
      : `Ask about ${prop.title}.`;
  }

  if (context.sampleProperties?.length > 0) {
    return fr
      ? `**Annonces récentes :**\n${context.sampleProperties
          .slice(0, 4)
          .map((p) => `• ${p.title} (${p.city}) — ${Number(p.price).toLocaleString('fr-TN')} TND`)
          .join('\n')}\n\nPrécisez une ville ou un bien pour aller plus loin.`
      : `Recent listings on the app.`;
  }

  return fr
    ? `Je suis le guide Immo Dary. Exemples :\n• « Ce quartier est-il sûr ? »\n• « Biens proches de moi »\n• « Prix moyen à Sousse »\n• « Comment contacter le vendeur ? »`
    : `Ask about areas, prices, or properties.`;
};

exports.buildGuideSystem = (research, context = {}, locale = 'fr') => {
  const lang = locale === 'en' ? 'English' : locale === 'ar' ? 'Arabic' : 'French';
  const appGuide = context.appGuide || {};
  const samples = (context.sampleProperties || [])
    .slice(0, 8)
    .map((p) => `- ${p.title} (${p.city}) ${p.price} TND`)
    .join('\n');

  return `You are the Immo Dary guide — a friendly real-estate assistant for Tunisia (mobile app).

RULES:
- Always reply in ${lang}.
- Answer the user's ACTUAL question directly — any topic they ask.
- Be natural and conversational, NOT a fixed script or menu.
- For property, city, safety, prices, proximity: use RESEARCH DATA below (do not invent listings).
- For general questions: answer helpfully, then link to real estate when relevant.
- Keep answers clear (short paragraphs or bullets), 3-12 sentences max.
- Never say "reformulez votre question" or list generic example prompts unless truly stuck.

APP HELP:
${JSON.stringify(appGuide, null, 0)}

LISTINGS ON APP:
${samples || '(none loaded)'}

RESEARCH DATA (listings, GPS, city stats — use when relevant):
${JSON.stringify(research).slice(0, 8000)}`;
};
