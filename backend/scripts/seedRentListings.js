/**
 * Seed rent listings + availability. Run inside API container:
 *   node /tmp/seedRentListings.js
 */
const { query } = require('/app/src/models/database');
const { ensurePropertiesSchema } = require('/app/src/utils/ensurePropertiesSchema');

async function main() {
  await ensurePropertiesSchema();

  const agentRes = await query(
    `SELECT TOP 1 AgentId FROM [dbo].[Properties] WHERE AgentId IS NOT NULL ORDER BY PropertyId DESC`,
  );
  const agentId = agentRes.recordset[0]?.AgentId;
  if (!agentId) throw new Error('No AgentId found');

  const rents = [
    {
      title: 'S+2 meublé à La Marsa — location',
      description:
        'Appartement meublé proche plage et corniche. Ideal couple ou télétravail.',
      price: 1850,
      city: 'La Marsa',
      state: 'Tunis',
      address: '12 Avenue Habib Bourguiba, La Marsa',
      propertyType: 'apartment',
      bedrooms: 2,
      bathrooms: 1,
      squareFeet: 95,
      depositAmount: 3700,
      lat: 36.878,
      lng: 10.324,
      featured: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800',
      ranges: [
        { start: '2026-07-20', end: '2026-09-30', status: 'available' },
        { start: '2026-10-01', end: '2026-10-15', status: 'blocked' },
        { start: '2026-10-16', end: '2026-12-31', status: 'available' },
      ],
    },
    {
      title: 'Studio centre Tunis — location mensuelle',
      description:
        'Studio rénové près du lac. Cuisine équipée, clim, wifi. Disponible immédiatement.',
      price: 950,
      city: 'Tunis',
      state: 'Tunis',
      address: '8 Rue de Marseille, Tunis',
      propertyType: 'apartment',
      bedrooms: 1,
      bathrooms: 1,
      squareFeet: 42,
      depositAmount: 1900,
      lat: 36.8065,
      lng: 10.1815,
      featured: 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800',
      ranges: [
        { start: '2026-07-15', end: '2026-08-31', status: 'available' },
        { start: '2026-09-01', end: '2027-03-31', status: 'available' },
      ],
    },
    {
      title: 'Villa avec jardin Sousse — à louer',
      description:
        'Villa T4 avec jardin et parking. Quartier calme, proche écoles et plage.',
      price: 2800,
      city: 'Sousse',
      state: 'Sousse',
      address: 'Route de la Corniche, Sousse',
      propertyType: 'villa',
      bedrooms: 4,
      bathrooms: 2,
      squareFeet: 180,
      depositAmount: 5600,
      lat: 35.8254,
      lng: 10.636,
      featured: 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=800',
      ranges: [
        { start: '2026-08-01', end: '2026-11-30', status: 'available' },
        { start: '2026-12-01', end: '2026-12-20', status: 'booked' },
        { start: '2026-12-21', end: '2027-06-30', status: 'available' },
      ],
    },
    {
      title: 'Appartement vue mer Hammamet — location',
      description:
        'S+3 luminueux vue mer, piscine résidence. Location longue durée privilégiée.',
      price: 2200,
      city: 'Hammamet',
      state: 'Nabeul',
      address: 'Résidence Les Jardins, Hammamet',
      propertyType: 'apartment',
      bedrooms: 3,
      bathrooms: 2,
      squareFeet: 120,
      depositAmount: 4400,
      lat: 36.4,
      lng: 10.6167,
      featured: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800',
      ranges: [
        { start: '2026-07-01', end: '2026-09-15', status: 'available' },
        { start: '2026-09-16', end: '2026-09-30', status: 'blocked' },
        { start: '2026-10-01', end: '2027-01-31', status: 'available' },
      ],
    },
  ];

  const createdIds = [];

  for (const r of rents) {
    const dup = await query(
      `SELECT TOP 1 PropertyId FROM [dbo].[Properties]
       WHERE Title = @title AND DeletedAt IS NULL AND IsActive = 1`,
      { title: r.title },
    );
    if (dup.recordset[0]) {
      console.log(`[seed] skip duplicate — ${r.title} (#${dup.recordset[0].PropertyId})`);
      createdIds.push(dup.recordset[0].PropertyId);
      continue;
    }

    const images = JSON.stringify([r.featured]);
    const insert = await query(
      `INSERT INTO [dbo].[Properties]
       (AgentId, PropertyType, ListingType, Condition, Title, Description, Price, Currency,
        RentPeriod, DepositAmount, MinLeaseMonths,
        Address, City, State,
        Bedrooms, Bathrooms, SquareFeet, Latitude, Longitude,
        Images, FeaturedImage, Status, IsActive, CreatedAt, UpdatedAt)
       OUTPUT INSERTED.PropertyId
       VALUES
       (@agentId, @propertyType, 'rent', 'good', @title, @description, @price, 'TND',
        'month', @depositAmount, 6,
        @address, @city, @state,
        @bedrooms, @bathrooms, @squareFeet, @lat, @lng,
        @images, @featured, 'active', 1, GETUTCDATE(), GETUTCDATE())`,
      {
        agentId,
        propertyType: r.propertyType,
        title: r.title,
        description: r.description,
        price: r.price,
        depositAmount: r.depositAmount,
        city: r.city,
        address: r.address,
        state: r.state,
        bedrooms: r.bedrooms,
        bathrooms: r.bathrooms,
        squareFeet: r.squareFeet,
        lat: r.lat,
        lng: r.lng,
        images,
        featured: r.featured,
      },
    );

    const propertyId = insert.recordset[0].PropertyId;
    createdIds.push(propertyId);

    for (const range of r.ranges) {
      await query(
        `INSERT INTO [dbo].[PropertyAvailability]
         (PropertyId, StartDate, EndDate, Status, Note)
         VALUES (@propertyId, @startDate, @endDate, @status, NULL)`,
        {
          propertyId,
          startDate: range.start,
          endDate: range.end,
          status: range.status,
        },
      );
    }

    console.log(`[seed] rent #${propertyId} — ${r.title}`);
  }

  const count = await query(
    `SELECT COUNT(*) AS c FROM [dbo].[Properties] WHERE ListingType = 'rent' AND (Status = 'active' OR IsActive = 1)`,
  );
  console.log(`[seed] done. Active rent listings: ${count.recordset[0].c}`);
  console.log(`[seed] ids: ${createdIds.join(', ')}`);
  process.exit(0);
}

main().catch((err) => {
  console.error('[seed] failed', err);
  process.exit(1);
});
