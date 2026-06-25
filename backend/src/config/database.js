require('dotenv').config();

const useWindowsAuth = process.env.DB_USE_WINDOWS_AUTH === 'true';
const server = process.env.DB_HOST || 'MONSTER';
const database = process.env.DB_NAME || 'RealEstateManagement';
const odbcDriver = process.env.DB_ODBC_DRIVER || 'ODBC Driver 17 for SQL Server';

let config;

if (useWindowsAuth) {
  config = {
    connectionString: `Driver={${odbcDriver}};Server=${server};Database=${database};Trusted_Connection=yes;TrustServerCertificate=yes;`,
  };
} else {
  config = {
    server,
    port: parseInt(process.env.DB_PORT) || 1433,
    database,
    authentication: {
      type: 'default',
      options: {
        userName: process.env.DB_USER || 'sa',
        password: process.env.DB_PASSWORD || '',
      },
    },
    options: {
      encrypt: process.env.NODE_ENV === 'production',
      trustServerCertificate: true,
      enableKeepAlive: true,
      keepAliveInitialDelayMs: 30000,
      connectionTimeout: 30000,
      requestTimeout: 30000,
    },
  };
}

module.exports = config;
