-- Création de la base de données (exécuter en tant qu'admin SQL Server)
IF NOT EXISTS (SELECT name FROM sys.databases WHERE name = N'RealEstateManagement')
BEGIN
    CREATE DATABASE [RealEstateManagement];
END
GO

USE [RealEstateManagement];
GO

PRINT 'Base RealEstateManagement prête. Exécutez schema.sql puis seed-data.sql.';
