/**
 * Replace demo sample videos with real-estate walkthrough clips.
 * Run inside API container or locally against Azure DB:
 *   node scripts/updatePropertyVideos.js
 */
const path = require('path');

// Prefer container paths when present
let query;
let ensurePropertiesSchema;
try {
  ({query} = require('/app/src/models/database'));
  ({ensurePropertiesSchema} = require('/app/src/utils/ensurePropertiesSchema'));
} catch {
  ({query} = require('../src/models/database'));
  ({ensurePropertiesSchema} = require('../src/utils/ensurePropertiesSchema'));
}

/** Real-estate / property tour MP4s (Mixkit) */
const VIDEOS = {
  apartment: 'https://assets.mixkit.co/videos/13107/13107-720.mp4',
  villa: 'https://assets.mixkit.co/videos/29029/29029-720.mp4',
  studio: 'https://assets.mixkit.co/videos/5962/5962-720.mp4',
  house: 'https://assets.mixkit.co/videos/29029/29029-720.mp4',
  default: 'https://assets.mixkit.co/videos/13107/13107-720.mp4',
};

const OLD_SAMPLES = [
  'w3schools.com',
  'filesamples.com',
  'mov_bbb',
  'sample_640x360',
  'commondatastorage.googleapis.com',
];

function pickVideo(propertyType) {
  const key = String(propertyType || '').toLowerCase();
  if (key.includes('villa')) return VIDEOS.villa;
  if (key.includes('studio')) return VIDEOS.studio;
  if (key.includes('house') || key.includes('maison')) return VIDEOS.house;
  if (key.includes('apartment') || key.includes('appart')) return VIDEOS.apartment;
  return VIDEOS.default;
}

async function main() {
  await ensurePropertiesSchema();

  const rows = await query(
    `SELECT PropertyId, PropertyType, VideoUrl, Title
     FROM [dbo].[Properties]
     WHERE IsActive = 1 AND VideoUrl IS NOT NULL AND LTRIM(RTRIM(VideoUrl)) <> ''`,
  );

  let updated = 0;
  for (const row of rows.recordset || []) {
    const url = String(row.VideoUrl || '');
    const isOld = OLD_SAMPLES.some(s => url.includes(s));
    if (!isOld && url.includes('mixkit.co')) continue;

    const next = pickVideo(row.PropertyType);
    if (next === url) continue;

    await query(
      `UPDATE [dbo].[Properties] SET VideoUrl = @video, UpdatedAt = GETUTCDATE() WHERE PropertyId = @id`,
      {video: next, id: row.PropertyId},
    );
    updated += 1;
    console.log(`[videos] #${row.PropertyId} ${row.Title} → ${next}`);
  }

  // Also ensure a few titled media listings always have tours if empty
  const titled = await query(
    `SELECT PropertyId, PropertyType, Title, VideoUrl
     FROM [dbo].[Properties]
     WHERE IsActive = 1 AND (
       Title LIKE N'%vidéo%' OR Title LIKE N'%video%' OR Title LIKE N'%visite%'
     )`,
  );
  for (const row of titled.recordset || []) {
    if (row.VideoUrl && String(row.VideoUrl).includes('mixkit.co')) continue;
    const next = pickVideo(row.PropertyType);
    await query(
      `UPDATE [dbo].[Properties] SET VideoUrl = @video, UpdatedAt = GETUTCDATE() WHERE PropertyId = @id`,
      {video: next, id: row.PropertyId},
    );
    updated += 1;
    console.log(`[videos] ensure #${row.PropertyId} ${row.Title}`);
  }

  console.log(`[videos] done. updated=${updated}`);
  process.exit(0);
}

main().catch(err => {
  console.error('[videos] failed', err);
  process.exit(1);
});
