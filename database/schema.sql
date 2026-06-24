-- =====================================================
-- Real Estate Management Application
-- SQL Server Database Schema
-- =====================================================

-- Set database properties
SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;

-- =====================================================
-- 1. USERS TABLE
-- =====================================================
CREATE TABLE [dbo].[Users] (
    [UserId] INT IDENTITY(1,1) PRIMARY KEY NOT NULL,
    [FirstName] NVARCHAR(100) NOT NULL,
    [LastName] NVARCHAR(100) NOT NULL,
    [Email] NVARCHAR(255) UNIQUE NOT NULL,
    [PasswordHash] NVARCHAR(MAX) NOT NULL,
    [PhoneNumber] NVARCHAR(20),
    [Role] NVARCHAR(20) NOT NULL CHECK ([Role] IN ('agent', 'client')), -- 'agent' or 'client'
    [ProfileImage] NVARCHAR(MAX), -- URL to profile image
    [Bio] NVARCHAR(500),
    [IsActive] BIT DEFAULT 1,
    [IsVerified] BIT DEFAULT 0,
    [VerificationCode] NVARCHAR(100),
    [LastLogin] DATETIME,
    [CreatedAt] DATETIME DEFAULT GETUTCDATE(),
    [UpdatedAt] DATETIME DEFAULT GETUTCDATE(),
    [DeletedAt] DATETIME NULL -- Soft delete
);

-- =====================================================
-- 2. AGENCIES TABLE (for agents)
-- =====================================================
CREATE TABLE [dbo].[Agencies] (
    [AgencyId] INT IDENTITY(1,1) PRIMARY KEY NOT NULL,
    [AgentId] INT NOT NULL,
    [AgencyName] NVARCHAR(255) NOT NULL,
    [AgencyEmail] NVARCHAR(255),
    [AgencyPhone] NVARCHAR(20),
    [Address] NVARCHAR(MAX),
    [City] NVARCHAR(100),
    [State] NVARCHAR(100),
    [ZipCode] NVARCHAR(20),
    [Country] NVARCHAR(100),
    [Logo] NVARCHAR(MAX), -- URL to logo
    [WebsiteUrl] NVARCHAR(MAX),
    [Description] NVARCHAR(MAX),
    [Latitude] DECIMAL(10, 8),
    [Longitude] DECIMAL(11, 8),
    [IsActive] BIT DEFAULT 1,
    [CreatedAt] DATETIME DEFAULT GETUTCDATE(),
    [UpdatedAt] DATETIME DEFAULT GETUTCDATE(),
    FOREIGN KEY ([AgentId]) REFERENCES [dbo].[Users]([UserId]) ON DELETE CASCADE
);

-- =====================================================
-- 3. PROPERTIES TABLE
-- =====================================================
CREATE TABLE [dbo].[Properties] (
    [PropertyId] INT IDENTITY(1,1) PRIMARY KEY NOT NULL,
    [AgentId] INT NOT NULL,
    [PropertyType] NVARCHAR(50) NOT NULL CHECK ([PropertyType] IN ('apartment', 'house', 'villa', 'land', 'office', 'commercial')),
    [Title] NVARCHAR(255) NOT NULL,
    [Description] NVARCHAR(MAX),
    [Price] DECIMAL(15, 2) NOT NULL,
    [Currency] NVARCHAR(10) DEFAULT 'USD',
    [Address] NVARCHAR(MAX) NOT NULL,
    [City] NVARCHAR(100) NOT NULL,
    [State] NVARCHAR(100),
    [ZipCode] NVARCHAR(20),
    [Country] NVARCHAR(100),
    [Latitude] DECIMAL(10, 8),
    [Longitude] DECIMAL(11, 8),
    
    -- Property Details
    [Bedrooms] INT,
    [Bathrooms] INT,
    [SquareFeet] DECIMAL(10, 2),
    [LotSize] DECIMAL(10, 2),
    [YearBuilt] INT,
    [Amenities] NVARCHAR(MAX), -- JSON format: ["pool", "garage", "balcony", etc.]
    
    -- Status & Availability
    [Status] NVARCHAR(20) DEFAULT 'active' CHECK ([Status] IN ('active', 'sold', 'pending', 'rented')),
    [IsAvailable] BIT DEFAULT 1,
    [AvailableFrom] DATETIME,
    
    -- Tracking
    [ViewCount] INT DEFAULT 0,
    [FavoriteCount] INT DEFAULT 0,
    [InquiryCount] INT DEFAULT 0,
    
    -- Media
    [FeaturedImage] NVARCHAR(MAX),
    [Images] NVARCHAR(MAX), -- JSON array of image URLs
    [VideoUrl] NVARCHAR(MAX),
    
    -- Metadata
    [IsActive] BIT DEFAULT 1,
    [CreatedAt] DATETIME DEFAULT GETUTCDATE(),
    [UpdatedAt] DATETIME DEFAULT GETUTCDATE(),
    [DeletedAt] DATETIME NULL,
    
    FOREIGN KEY ([AgentId]) REFERENCES [dbo].[Users]([UserId]) ON DELETE CASCADE
);

-- =====================================================
-- 4. PROPERTY VIEWS TABLE (for analytics)
-- =====================================================
CREATE TABLE [dbo].[PropertyViews] (
    [ViewId] INT IDENTITY(1,1) PRIMARY KEY NOT NULL,
    [PropertyId] INT NOT NULL,
    [UserId] INT,
    [ViewedAt] DATETIME DEFAULT GETUTCDATE(),
    [Source] NVARCHAR(50), -- 'search', 'browse', 'favorite', etc.
    [TimeSpent] INT, -- seconds on property page
    
    FOREIGN KEY ([PropertyId]) REFERENCES [dbo].[Properties]([PropertyId]) ON DELETE CASCADE,
    FOREIGN KEY ([UserId]) REFERENCES [dbo].[Users]([UserId]) ON DELETE SET NULL
);

-- =====================================================
-- 5. FAVORITES TABLE (Wishlist)
-- =====================================================
CREATE TABLE [dbo].[Favorites] (
    [FavoriteId] INT IDENTITY(1,1) PRIMARY KEY NOT NULL,
    [UserId] INT NOT NULL,
    [PropertyId] INT NOT NULL,
    [CreatedAt] DATETIME DEFAULT GETUTCDATE(),
    
    UNIQUE([UserId], [PropertyId]),
    FOREIGN KEY ([UserId]) REFERENCES [dbo].[Users]([UserId]) ON DELETE CASCADE,
    FOREIGN KEY ([PropertyId]) REFERENCES [dbo].[Properties]([PropertyId]) ON DELETE CASCADE
);

-- =====================================================
-- 6. INQUIRIES TABLE (Client inquiries/leads)
-- =====================================================
CREATE TABLE [dbo].[Inquiries] (
    [InquiryId] INT IDENTITY(1,1) PRIMARY KEY NOT NULL,
    [PropertyId] INT NOT NULL,
    [ClientId] INT NOT NULL,
    [AgentId] INT NOT NULL,
    [Subject] NVARCHAR(255),
    [Message] NVARCHAR(MAX),
    [InquiryType] NVARCHAR(50) DEFAULT 'general' CHECK ([InquiryType] IN ('viewing', 'general', 'offer', 'complaint')),
    [Status] NVARCHAR(20) DEFAULT 'new' CHECK ([Status] IN ('new', 'responded', 'scheduled', 'closed')),
    [Priority] NVARCHAR(20) DEFAULT 'normal' CHECK ([Priority] IN ('low', 'normal', 'high')),
    [ScheduledViewingDate] DATETIME,
    [Response] NVARCHAR(MAX),
    [ResponseDate] DATETIME,
    [IsRead] BIT DEFAULT 0,
    [CreatedAt] DATETIME DEFAULT GETUTCDATE(),
    [UpdatedAt] DATETIME DEFAULT GETUTCDATE(),
    
    FOREIGN KEY ([PropertyId]) REFERENCES [dbo].[Properties]([PropertyId]) ON DELETE CASCADE,
    FOREIGN KEY ([ClientId]) REFERENCES [dbo].[Users]([UserId]) ON DELETE CASCADE,
    FOREIGN KEY ([AgentId]) REFERENCES [dbo].[Users]([UserId]) ON DELETE CASCADE
);

-- =====================================================
-- 7. MESSAGES TABLE (Direct messaging)
-- =====================================================
CREATE TABLE [dbo].[Messages] (
    [MessageId] INT IDENTITY(1,1) PRIMARY KEY NOT NULL,
    [SenderId] INT NOT NULL,
    [ReceiverId] INT NOT NULL,
    [InquiryId] INT,
    [MessageText] NVARCHAR(MAX) NOT NULL,
    [AttachmentUrl] NVARCHAR(MAX),
    [IsRead] BIT DEFAULT 0,
    [ReadAt] DATETIME,
    [CreatedAt] DATETIME DEFAULT GETUTCDATE(),
    
    FOREIGN KEY ([SenderId]) REFERENCES [dbo].[Users]([UserId]) ON DELETE CASCADE,
    FOREIGN KEY ([ReceiverId]) REFERENCES [dbo].[Users]([UserId]) ON DELETE CASCADE,
    FOREIGN KEY ([InquiryId]) REFERENCES [dbo].[Inquiries]([InquiryId]) ON DELETE SET NULL
);

-- =====================================================
-- 8. CONVERSATIONS TABLE (Thread management)
-- =====================================================
CREATE TABLE [dbo].[Conversations] (
    [ConversationId] INT IDENTITY(1,1) PRIMARY KEY NOT NULL,
    [User1Id] INT NOT NULL,
    [User2Id] INT NOT NULL,
    [PropertyId] INT,
    [LastMessageAt] DATETIME,
    [IsActive] BIT DEFAULT 1,
    [CreatedAt] DATETIME DEFAULT GETUTCDATE(),
    
    UNIQUE([User1Id], [User2Id]),
    FOREIGN KEY ([User1Id]) REFERENCES [dbo].[Users]([UserId]) ON DELETE CASCADE,
    FOREIGN KEY ([User2Id]) REFERENCES [dbo].[Users]([UserId]) ON DELETE CASCADE,
    FOREIGN KEY ([PropertyId]) REFERENCES [dbo].[Properties]([PropertyId]) ON DELETE SET NULL
);

-- =====================================================
-- 9. NOTIFICATIONS TABLE
-- =====================================================
CREATE TABLE [dbo].[Notifications] (
    [NotificationId] INT IDENTITY(1,1) PRIMARY KEY NOT NULL,
    [UserId] INT NOT NULL,
    [Type] NVARCHAR(50) NOT NULL CHECK ([Type] IN ('new_property', 'inquiry', 'message', 'viewing_reminder', 'price_alert')),
    [Title] NVARCHAR(255) NOT NULL,
    [Message] NVARCHAR(MAX),
    [RelatedPropertyId] INT,
    [RelatedInquiryId] INT,
    [IsRead] BIT DEFAULT 0,
    [ReadAt] DATETIME,
    [CreatedAt] DATETIME DEFAULT GETUTCDATE(),
    
    FOREIGN KEY ([UserId]) REFERENCES [dbo].[Users]([UserId]) ON DELETE CASCADE,
    FOREIGN KEY ([RelatedPropertyId]) REFERENCES [dbo].[Properties]([PropertyId]) ON DELETE SET NULL,
    FOREIGN KEY ([RelatedInquiryId]) REFERENCES [dbo].[Inquiries]([InquiryId]) ON DELETE SET NULL
);

-- =====================================================
-- 10. SAVED SEARCHES TABLE
-- =====================================================
CREATE TABLE [dbo].[SavedSearches] (
    [SearchId] INT IDENTITY(1,1) PRIMARY KEY NOT NULL,
    [UserId] INT NOT NULL,
    [SearchName] NVARCHAR(255),
    [SearchFilters] NVARCHAR(MAX) NOT NULL, -- JSON format
    [PropertyTypeFilter] NVARCHAR(MAX),
    [MinPrice] DECIMAL(15, 2),
    [MaxPrice] DECIMAL(15, 2),
    [MinBedrooms] INT,
    [MaxBedrooms] INT,
    [CityFilter] NVARCHAR(100),
    [NotifyOnNewMatch] BIT DEFAULT 1,
    [CreatedAt] DATETIME DEFAULT GETUTCDATE(),
    [UpdatedAt] DATETIME DEFAULT GETUTCDATE(),
    
    FOREIGN KEY ([UserId]) REFERENCES [dbo].[Users]([UserId]) ON DELETE CASCADE
);

-- =====================================================
-- INDEXES FOR PERFORMANCE OPTIMIZATION
-- =====================================================

-- Users indexes
CREATE INDEX [idx_users_email] ON [dbo].[Users]([Email]);
CREATE INDEX [idx_users_role] ON [dbo].[Users]([Role]);
CREATE INDEX [idx_users_is_active] ON [dbo].[Users]([IsActive]);

-- Properties indexes
CREATE INDEX [idx_properties_agent_id] ON [dbo].[Properties]([AgentId]);
CREATE INDEX [idx_properties_status] ON [dbo].[Properties]([Status]);
CREATE INDEX [idx_properties_city] ON [dbo].[Properties]([City]);
CREATE INDEX [idx_properties_price] ON [dbo].[Properties]([Price]);
CREATE INDEX [idx_properties_property_type] ON [dbo].[Properties]([PropertyType]);
CREATE INDEX [idx_properties_available] ON [dbo].[Properties]([IsAvailable], [Status]);
CREATE INDEX [idx_properties_location] ON [dbo].[Properties]([Latitude], [Longitude]);
CREATE INDEX [idx_properties_created_at] ON [dbo].[Properties]([CreatedAt] DESC);

-- Property Views indexes
CREATE INDEX [idx_property_views_property_id] ON [dbo].[PropertyViews]([PropertyId]);
CREATE INDEX [idx_property_views_user_id] ON [dbo].[PropertyViews]([UserId]);
CREATE INDEX [idx_property_views_viewed_at] ON [dbo].[PropertyViews]([ViewedAt] DESC);

-- Favorites indexes
CREATE INDEX [idx_favorites_user_id] ON [dbo].[Favorites]([UserId]);
CREATE INDEX [idx_favorites_property_id] ON [dbo].[Favorites]([PropertyId]);

-- Inquiries indexes
CREATE INDEX [idx_inquiries_property_id] ON [dbo].[Inquiries]([PropertyId]);
CREATE INDEX [idx_inquiries_client_id] ON [dbo].[Inquiries]([ClientId]);
CREATE INDEX [idx_inquiries_agent_id] ON [dbo].[Inquiries]([AgentId]);
CREATE INDEX [idx_inquiries_status] ON [dbo].[Inquiries]([Status]);
CREATE INDEX [idx_inquiries_is_read] ON [dbo].[Inquiries]([IsRead]);
CREATE INDEX [idx_inquiries_created_at] ON [dbo].[Inquiries]([CreatedAt] DESC);

-- Messages indexes
CREATE INDEX [idx_messages_sender_id] ON [dbo].[Messages]([SenderId]);
CREATE INDEX [idx_messages_receiver_id] ON [dbo].[Messages]([ReceiverId]);
CREATE INDEX [idx_messages_conversation] ON [dbo].[Messages]([SenderId], [ReceiverId]);
CREATE INDEX [idx_messages_is_read] ON [dbo].[Messages]([IsRead]);
CREATE INDEX [idx_messages_created_at] ON [dbo].[Messages]([CreatedAt] DESC);

-- Conversations indexes
CREATE INDEX [idx_conversations_user1_id] ON [dbo].[Conversations]([User1Id]);
CREATE INDEX [idx_conversations_user2_id] ON [dbo].[Conversations]([User2Id]);

-- Notifications indexes
CREATE INDEX [idx_notifications_user_id] ON [dbo].[Notifications]([UserId]);
CREATE INDEX [idx_notifications_is_read] ON [dbo].[Notifications]([IsRead]);
CREATE INDEX [idx_notifications_created_at] ON [dbo].[Notifications]([CreatedAt] DESC);

-- Saved Searches indexes
CREATE INDEX [idx_saved_searches_user_id] ON [dbo].[SavedSearches]([UserId]);
CREATE INDEX [idx_saved_searches_min_max_price] ON [dbo].[SavedSearches]([MinPrice], [MaxPrice]);

GO

-- =====================================================
-- STORED PROCEDURES FOR COMPLEX QUERIES
-- =====================================================

-- Get agent dashboard statistics
CREATE PROCEDURE [dbo].[sp_GetAgentDashboard]
    @AgentId INT
AS
BEGIN
    SELECT
        (SELECT COUNT(*) FROM [dbo].[Properties] WHERE [AgentId] = @AgentId AND [IsActive] = 1) AS TotalProperties,
        (SELECT COUNT(*) FROM [dbo].[Properties] WHERE [AgentId] = @AgentId AND [Status] = 'active') AS ActiveListings,
        (SELECT SUM([ViewCount]) FROM [dbo].[Properties] WHERE [AgentId] = @AgentId) AS TotalViews,
        (SELECT COUNT(*) FROM [dbo].[Inquiries] WHERE [AgentId] = @AgentId AND [Status] = 'new') AS NewInquiries,
        (SELECT COUNT(*) FROM [dbo].[Inquiries] WHERE [AgentId] = @AgentId AND [Status] = 'responded') AS RespondedInquiries,
        (SELECT COUNT(*) FROM [dbo].[Messages] WHERE [ReceiverId] = @AgentId AND [IsRead] = 0) AS UnreadMessages;
END;

GO

-- Search properties with filters
CREATE PROCEDURE [dbo].[sp_SearchProperties]
    @MinPrice DECIMAL(15, 2) = NULL,
    @MaxPrice DECIMAL(15, 2) = NULL,
    @PropertyType NVARCHAR(50) = NULL,
    @City NVARCHAR(100) = NULL,
    @MinBedrooms INT = NULL,
    @MaxBedrooms INT = NULL,
    @PageNumber INT = 1,
    @PageSize INT = 20
AS
BEGIN
    DECLARE @Offset INT = (@PageNumber - 1) * @PageSize;
    
    SELECT *
    FROM [dbo].[Properties]
    WHERE [IsActive] = 1
        AND [Status] = 'active'
        AND [IsAvailable] = 1
        AND (@MinPrice IS NULL OR [Price] >= @MinPrice)
        AND (@MaxPrice IS NULL OR [Price] <= @MaxPrice)
        AND (@PropertyType IS NULL OR [PropertyType] = @PropertyType)
        AND (@City IS NULL OR [City] LIKE '%' + @City + '%')
        AND (@MinBedrooms IS NULL OR [Bedrooms] >= @MinBedrooms)
        AND (@MaxBedrooms IS NULL OR [Bedrooms] <= @MaxBedrooms)
    ORDER BY [CreatedAt] DESC
    OFFSET @Offset ROWS
    FETCH NEXT @PageSize ROWS ONLY;
END;

GO

-- =====================================================
-- TRIGGERS FOR AUTOMATIC UPDATES
-- =====================================================

-- Update Properties UpdatedAt timestamp
CREATE TRIGGER [dbo].[tr_UpdateProperties]
ON [dbo].[Properties]
AFTER UPDATE
AS
BEGIN
    UPDATE [dbo].[Properties]
    SET [UpdatedAt] = GETUTCDATE()
    WHERE [PropertyId] IN (SELECT [PropertyId] FROM inserted);
END;

GO

-- Update Users UpdatedAt timestamp
CREATE TRIGGER [dbo].[tr_UpdateUsers]
ON [dbo].[Users]
AFTER UPDATE
AS
BEGIN
    UPDATE [dbo].[Users]
    SET [UpdatedAt] = GETUTCDATE()
    WHERE [UserId] IN (SELECT [UserId] FROM inserted);
END;

GO

-- Auto-increment FavoriteCount on Properties when added to Favorites
CREATE TRIGGER [dbo].[tr_IncrementPropertyFavorites]
ON [dbo].[Favorites]
AFTER INSERT
AS
BEGIN
    UPDATE p
    SET p.[FavoriteCount] = p.[FavoriteCount] + 1
    FROM [dbo].[Properties] p
    JOIN inserted i ON p.[PropertyId] = i.[PropertyId];
END;

GO

-- Auto-decrement FavoriteCount on Properties when removed from Favorites
CREATE TRIGGER [dbo].[tr_DecrementPropertyFavorites]
ON [dbo].[Favorites]
AFTER DELETE
AS
BEGIN
    UPDATE p
    SET p.[FavoriteCount] = CASE WHEN p.[FavoriteCount] > 0 THEN p.[FavoriteCount] - 1 ELSE 0 END
    FROM [dbo].[Properties] p
    JOIN deleted d ON p.[PropertyId] = d.[PropertyId];
END;

GO

-- Auto-increment ViewCount on property view
CREATE TRIGGER [dbo].[tr_IncrementPropertyViews]
ON [dbo].[PropertyViews]
AFTER INSERT
AS
BEGIN
    UPDATE p
    SET p.[ViewCount] = p.[ViewCount] + 1
    FROM [dbo].[Properties] p
    JOIN inserted i ON p.[PropertyId] = i.[PropertyId];
END;

GO

-- Auto-increment InquiryCount on property when inquiry is created
CREATE TRIGGER [dbo].[tr_IncrementPropertyInquiries]
ON [dbo].[Inquiries]
AFTER INSERT
AS
BEGIN
    UPDATE p
    SET p.[InquiryCount] = p.[InquiryCount] + 1
    FROM [dbo].[Properties] p
    JOIN inserted i ON p.[PropertyId] = i.[PropertyId];
END;

-- =====================================================
-- END OF SCHEMA
-- =====================================================
