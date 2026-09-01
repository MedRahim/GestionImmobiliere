/**
 * Seed sample listings with images + video. Run inside API container:
 *   node /tmp/seedMediaListings.js
 */
const { query } = require('/app/src/models/database');
const { ensurePropertiesSchema } = require('/app/src/utils/ensurePropertiesSchema');

const SAMPLE_VIDEO = 'https://assets.mixkit.co/videos/13107/13107-720.mp4'; // agent showing apartment
const SAMPLE_VIDEO_2 = 'https://assets.mixkit.co/videos/29029/29029-720.mp4'; // houses / villa vibe
const SAMPLE_VIDEO_3 = 'https://assets.mixkit.co/videos/5962/5962-720.mp4'; // family / home visit

async function main() {
  await ensurePropertiesSchema();

  const agentRes = await query(
    `SELECT TOP 1 AgentId FROM [dbo].[Properties] WHERE AgentId IS NOT NULL ORDER BY PropertyId DESC`,
  );
  let agentId = agentRes.recordset[0]?.AgentId;
  if (!agentId) {
    const user = await query(`SELECT TOP 1 UserId FROM [dbo].[Users] ORDER BY UserId`);
    agentId = user.recordset[0]?.UserId;
  }
  if (!agentId) throw new Error('No AgentId/User found');

  const listings = [
    {
      title: 'Appartement S+2 Lac 2 — photos & vidéo',
      description:
        'Bel appartement moderne avec salon lumineux, cuisine équipée et balcon. Visite vidéo disponible.',
      price: 420000,
      listingType: 'sale',
      city: 'Tunis',
      state: 'Tunis',
      address: 'Les Berges du Lac 2',
      propertyType: 'apartment',
      bedrooms: 2,
      bathrooms: 1,
      squareFeet: 110,
      condition: 'good',
      lat: 36.8345,
      lng: 10.247,
      images: [
        'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=900',
        'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=900',
        'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=900',
      ],
      video: SAMPLE_VIDEO,
      amenities: JSON.stringify(['Climatisation', 'Ascenseur', 'Terrasse']),
    },
    {
      title: 'Villa Gammarth avec jardin — vidéo',
      description:
        'Villa familiale rénovée, grand jardin et parking. Idéale famille. Découvrez la visite vidéo.',
      price: 1250000,
      listingType: 'sale',
      city: 'Gammarth',
      state: 'Tunis',
      address: 'Route de la Marsa, Gammarth',
      propertyType: 'villa',
      bedrooms: 5,
      bathrooms: 3,
      squareFeet: 280,
      condition: 'new',
      lat: 36.918,
      lng: 10.298,
      images: [
        'https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=900',
        'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=900',
        'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=900',
      ],
      video: SAMPLE_VIDEO_2,
      amenities: JSON.stringify(['Piscine', 'Jardin', 'Garage', 'Sécurité']),
    },
    {
      title: 'Studio Sousse centre — location jour + vidéo',
      description:
        'Studio cosy proche corniche, wifi et clim. Réservation à la journée. Vidéo de présentation.',
      price: 95,
      listingType: 'rent',
      city: 'Sousse',
      state: 'Sousse',
      address: 'Avenue Habib Bourguiba, Sousse',
      propertyType: 'apartment',
      bedrooms: 1,
      bathrooms: 1,
      squareFeet: 38,
      condition: 'good',
      depositAmount: 190,
      lat: 35.8256,
      lng: 10.6411,
      images: [
        'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?w=900',
        'https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=900',
      ],
      video: SAMPLE_VIDEO_3,
      amenities: JSON.stringify(['Climatisation', 'Meublé']),
      ranges: [
        { start: '2026-07-01', end: '2026-12-31', status: 'available' },
      ],
    },
  ];

  const ids = [];
  for (const r of listings) {
    const dup = await query(
      `SELECT TOP 1 PropertyId FROM [dbo].[Properties]
       WHERE Title = @title AND DeletedAt IS NULL AND IsActive = 1`,
      { title: r.title },
    );
    if (dup.recordset[0]) {
      console.log(`[seed-media] skip duplicate — ${r.title} (#${dup.recordset[0].PropertyId})`);
      ids.push(dup.recordset[0].PropertyId);
      continue;
    }

    const images = JSON.stringify(r.images);
    const insert = await query(
      `INSERT INTO [dbo].[Properties]
       (AgentId, PropertyType, ListingType, Condition, Title, Description, Price, Currency,
        RentPeriod, DepositAmount,
        Address, City, State,
        Bedrooms, Bathrooms, SquareFeet, Latitude, Longitude,
        Amenities, Images, FeaturedImage, VideoUrl, Status, IsActive, CreatedAt, UpdatedAt)
       OUTPUT INSERTED.PropertyId
       VALUES
       (@agentId, @propertyType, @listingType, @condition, @title, @description, @price, 'TND',
        @rentPeriod, @depositAmount,
        @address, @city, @state,
        @bedrooms, @bathrooms, @squareFeet, @lat, @lng,
        @amenities, @images, @featured, @video, 'active', 1, GETUTCDATE(), GETUTCDATE())`,
      {
        agentId,
        propertyType: r.propertyType,
        listingType: r.listingType,
        condition: r.condition,
        title: r.title,
        description: r.description,
        price: r.price,
        rentPeriod: r.listingType === 'rent' ? 'day' : null,
        depositAmount: r.depositAmount || null,
        city: r.city,
        address: r.address,
        state: r.state,
        bedrooms: r.bedrooms,
        bathrooms: r.bathrooms,
        squareFeet: r.squareFeet,
        lat: r.lat,
        lng: r.lng,
        amenities: r.amenities,
        images,
        featured: r.images[0],
        video: r.video,
      },
    );
    const propertyId = insert.recordset[0].PropertyId;
    ids.push(propertyId);

    if (r.listingType === 'rent' && r.ranges) {
      for (const range of r.ranges) {
        await query(
          `INSERT INTO [dbo].[PropertyAvailability]
           (PropertyId, StartDate, EndDate, Status, Note)
           VALUES (@propertyId, @startDate, @endDate, @status, N'seed media')`,
          {
            propertyId,
            startDate: range.start,
            endDate: range.end,
            status: range.status,
          },
        );
      }
    }
    console.log(`[seed-media] #${propertyId} — ${r.title}`);
  }

  console.log(`[seed-media] done. ids: ${ids.join(', ')}`);
  process.exit(0);
}

main().catch((err) => {
  console.error('[seed-media] failed', err);
  process.exit(1);
});
