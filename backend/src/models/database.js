// =====================================================
// SQL Server Database Connection Pool
// =====================================================

require('dotenv').config();

const useWindowsAuth = process.env.DB_USE_WINDOWS_AUTH === 'true';
const sql = useWindowsAuth ? require('mssql/msnodesqlv8') : require('mssql');
const dbConfig = require('../config/database');

let pool = null;

const isConnectionError = (err) =>
  err?.code === 'ECONNCLOSED' ||
  err?.code === 'ENOTOPEN' ||
  err?.message?.includes('Connection is closed');

const initializePool = async () => {
  try {
    if (pool?.connected) {
      return pool;
    }

    if (pool) {
      try {
        await pool.close();
      } catch {
        // ignore close errors on stale pool
      }
    }

    pool = new sql.ConnectionPool(dbConfig);
    await pool.connect();
    console.log(
      `✅ SQL Server database connected successfully${useWindowsAuth ? ' (Windows auth)' : ''}`
    );
    return pool;
  } catch (err) {
    pool = null;
    console.error('❌ Failed to connect to database:', err.message);
    throw err;
  }
};

const getPool = async () => {
  if (!pool || !pool.connected) {
    await initializePool();
  }
  return pool;
};

const query = async (sqlQuery, params = []) => {
  try {
    const activePool = await getPool();
    const request = activePool.request();

    if (params && typeof params === 'object') {
      Object.keys(params).forEach((key) => {
        request.input(key, params[key]);
      });
    }

    console.log(`[DB Query] ${sqlQuery.substring(0, 100)}...`);
    return await request.query(sqlQuery);
  } catch (err) {
    if (isConnectionError(err)) {
      console.warn('[DB] Connection lost, reconnecting...');
      pool = null;
      return query(sqlQuery, params);
    }
    console.error('[DB Error]', err);
    throw err;
  }
};

const storedProcedure = async (procedureName, params = {}) => {
  try {
    const activePool = await getPool();
    const request = activePool.request();

    Object.keys(params).forEach((key) => {
      request.input(key, params[key]);
    });

    console.log(`[Procedure] ${procedureName}`);
    const result = await request.execute(procedureName);
    return result;
  } catch (err) {
    console.error('[Procedure Error]', err);
    throw err;
  }
};

const closePool = async () => {
  try {
    if (pool) {
      await pool.close();
      console.log('✅ Database connection closed');
    }
  } catch (err) {
    console.error('❌ Error closing database connection:', err);
    throw err;
  }
};

module.exports = {
  initializePool,
  getPool,
  query,
  storedProcedure,
  closePool,
  sql,
};
