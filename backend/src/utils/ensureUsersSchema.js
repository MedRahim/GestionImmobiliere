const { query } = require('../models/database');

/** Remove legacy Role column — all users can buy and sell. */
async function ensureUsersSchema() {
  await query(`
    DECLARE @constraint NVARCHAR(200);
    SELECT @constraint = cc.name
    FROM sys.check_constraints cc
    WHERE cc.parent_object_id = OBJECT_ID('dbo.Users')
      AND cc.definition LIKE '%Role%';

    IF @constraint IS NOT NULL
    BEGIN
      EXEC('ALTER TABLE [dbo].[Users] DROP CONSTRAINT ' + @constraint);
    END;

    IF COL_LENGTH('dbo.Users', 'Role') IS NOT NULL
    BEGIN
      IF EXISTS (
        SELECT 1 FROM sys.indexes
        WHERE name = 'idx_users_role' AND object_id = OBJECT_ID('dbo.Users')
      )
      BEGIN
        DROP INDEX [idx_users_role] ON [dbo].[Users];
      END;
      ALTER TABLE [dbo].[Users] DROP COLUMN [Role];
    END;
  `);
}

module.exports = { ensureUsersSchema };
