const {query} = require('/app/src/models/database');

(async () => {
  await query(
    `UPDATE [dbo].[Properties]
     SET VideoUrl = @v, UpdatedAt = GETUTCDATE()
     WHERE Title LIKE N'%Studio%'`,
    {v: 'https://assets.mixkit.co/videos/5962/5962-720.mp4'},
  );
  const r = await query(
    `SELECT PropertyId, Title, VideoUrl FROM [dbo].[Properties]
     WHERE VideoUrl LIKE '%mixkit%' ORDER BY PropertyId`,
  );
  console.log(JSON.stringify(r.recordset, null, 2));
  process.exit(0);
})().catch(e => {
  console.error(e);
  process.exit(1);
});
