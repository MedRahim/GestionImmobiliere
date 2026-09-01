/**
 * Keep only 15 showcase listings; soft-delete the rest.
 * Run inside API container:
 *   node /tmp/trimListingsTo15.js
 */
const { query } = require('/app/src/models/database');

/** Curated demo set: photos/vidéo, GPS, mix vente/location, villes variées */
const KEEP_IDS = [
  4042, // Appartement S+2 Lac 2 — photos & vidéo (Tunis)
  4043, // Villa Gammarth avec jardin — vidéo
  4044, // Studio Sousse centre — location jour + vidéo
  4034, // Studio centre Tunis — location mensuelle + vidéo
  4033, // S+2 meublé à La Marsa — location
  4036, // Appartement vue mer Hammamet — location
  2012, // Maison d'architecte Sidi Bou Said
  2011, // Villa de prestige Carthage
  2013, // Penthouse La Marsa corniche
  2004, // Studio meublé centre-ville Tunis + vidéo
  2034, // Studio Rue de France + vidéo
  2045, // Penthouse Rue de la Plage Hammamet
  2047, // Villa Monastir
  2019, // Appartement neuf Sousse
  2020, // Villa bord de mer Monastir
];

async function main() {
  const keepList = KEEP_IDS.join(',');

  const before = await query(
    `SELECT COUNT(*) AS c FROM [dbo].[Properties] WHERE DeletedAt IS NULL AND IsActive = 1`,
  );
  console.log(`[trim] active before: ${before.recordset[0].c}`);

  const existing = await query(
    `SELECT PropertyId FROM [dbo].[Properties] WHERE PropertyId IN (${keepList}) AND DeletedAt IS NULL`,
  );
  const found = existing.recordset.map((r) => r.PropertyId);
  const missing = KEEP_IDS.filter((id) => !found.includes(id));
  if (missing.length) {
    console.warn('[trim] missing keep ids (will skip):', missing.join(', '));
  }

  const validKeep = found.length ? found.join(',') : keepList;

  const removed = await query(
    `UPDATE [dbo].[Properties]
     SET DeletedAt = GETUTCDATE(), IsActive = 0, UpdatedAt = GETUTCDATE()
     WHERE DeletedAt IS NULL
       AND PropertyId NOT IN (${validKeep})`,
  );
  console.log(`[trim] soft-deleted rows: ${removed.rowsAffected?.[0] ?? '?'}`);

  // Remove duplicate seed copies of same titles (keep highest id per title among kept set)
  await query(
    `UPDATE p SET DeletedAt = GETUTCDATE(), IsActive = 0, UpdatedAt = GETUTCDATE()
     FROM [dbo].[Properties] p
     INNER JOIN (
       SELECT Title, MAX(PropertyId) AS KeepId
       FROM [dbo].[Properties]
       WHERE DeletedAt IS NULL AND PropertyId IN (${validKeep})
       GROUP BY Title
       HAVING COUNT(*) > 1
     ) d ON p.Title = d.Title AND p.PropertyId <> d.KeepId
     WHERE p.DeletedAt IS NULL`,
  );

  const after = await query(
    `SELECT COUNT(*) AS c FROM [dbo].[Properties] WHERE DeletedAt IS NULL AND IsActive = 1`,
  );
  console.log(`[trim] active after: ${after.recordset[0].c}`);

  const list = await query(
    `SELECT PropertyId, Title, City, Price, ListingType
     FROM [dbo].[Properties]
     WHERE DeletedAt IS NULL AND IsActive = 1
     ORDER BY PropertyId DESC`,
  );
  list.recordset.forEach((p) => {
    console.log(`  #${p.PropertyId} — ${p.Title} (${p.City}) ${p.Price} TND [${p.ListingType}]`);
  });

  process.exit(0);
}

main().catch((err) => {
  console.error('[trim] failed', err);
  process.exit(1);
});
