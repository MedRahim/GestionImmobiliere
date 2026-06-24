-- =====================================================
-- Real Estate Management Application
-- Sample/Seed Data
-- =====================================================

-- =====================================================
-- 1. INSERT SAMPLE USERS (Agents & Clients)
-- =====================================================

-- Insert Agents
INSERT INTO [dbo].[Users] (FirstName, LastName, Email, PasswordHash, PhoneNumber, Role, ProfileImage, Bio, IsActive, IsVerified)
VALUES
    ('Ahmed', 'Ben Ali', 'ahmed.benali@immobilien.tn', '$2a$10$RSuygwXpCJbXKimvlF4DZe5Q54tl4cl2nTZZFlXjKNkJz0RVJQd7S', '21612345678', 'agent', NULL, 'Experienced real estate agent with 10+ years', 1, 1),
    ('Fatima', 'Saidi', 'fatima.saidi@immobilien.tn', '$2a$10$RSuygwXpCJbXKimvlF4DZe5Q54tl4cl2nTZZFlXjKNkJz0RVJQd7S', '21622345678', 'agent', NULL, 'Specializing in luxury properties', 1, 1),
    ('Mohamed', 'Guellouz', 'mohamed.guellouz@immobilien.tn', '$2a$10$RSuygwXpCJbXKimvlF4DZe5Q54tl4cl2nTZZFlXjKNkJz0RVJQd7S', '21632345678', 'agent', NULL, 'Commercial real estate specialist', 1, 1);

-- Insert Clients
INSERT INTO [dbo].[Users] (FirstName, LastName, Email, PasswordHash, PhoneNumber, Role, ProfileImage, Bio, IsActive, IsVerified)
VALUES
    ('Ali', 'Khamis', 'ali.khamis@email.tn', '$2a$10$RSuygwXpCJbXKimvlF4DZe5Q54tl4cl2nTZZFlXjKNkJz0RVJQd7S', '21650001111', 'client', NULL, NULL, 1, 1),
    ('Hana', 'Meddeb', 'hana.meddeb@email.tn', '$2a$10$RSuygwXpCJbXKimvlF4DZe5Q54tl4cl2nTZZFlXjKNkJz0RVJQd7S', '21650002222', 'client', NULL, NULL, 1, 1),
    ('Sami', 'Yahyaoui', 'sami.yahyaoui@email.tn', '$2a$10$RSuygwXpCJbXKimvlF4DZe5Q54tl4cl2nTZZFlXjKNkJz0RVJQd7S', '21650003333', 'client', NULL, NULL, 1, 1),
    ('Nadia', 'Bouattour', 'nadia.bouattour@email.tn', '$2a$10$RSuygwXpCJbXKimvlF4DZe5Q54tl4cl2nTZZFlXjKNkJz0RVJQd7S', '21650004444', 'client', NULL, NULL, 1, 1);

-- =====================================================
-- 2. INSERT AGENCIES
-- =====================================================

INSERT INTO [dbo].[Agencies] (AgentId, AgencyName, AgencyEmail, AgencyPhone, Address, City, State, ZipCode, Country, Logo, WebsiteUrl, Description, IsActive)
VALUES
    (1, 'Prime Immobilier Tunis', 'contact@primeimmobilier.tn', '21612345678', 'Avenue Habib Bourguiba 123', 'Tunis', 'Tunis', '1000', 'Tunisia', NULL, 'https://primeimmobilier.tn', 'Leading real estate agency in Tunis', 1),
    (2, 'Luxe Properties', 'info@luxeproperties.tn', '21622345678', 'Avenue de la Liberté 456', 'Tunis', 'Tunis', '1000', 'Tunisia', NULL, 'https://luxeproperties.tn', 'Premium luxury properties', 1),
    (3, 'Commercial Realty Group', 'hello@commercialrealty.tn', '21632345678', 'Rue de la République 789', 'Tunis', 'Tunis', '1000', 'Tunisia', NULL, 'https://commercialrealty.tn', 'Commercial and office spaces', 1);

-- =====================================================
-- 3. INSERT SAMPLE PROPERTIES
-- =====================================================

-- Apartment listings
INSERT INTO [dbo].[Properties] 
(AgentId, PropertyType, Title, Description, Price, Currency, Address, City, State, ZipCode, Country, 
 Latitude, Longitude, Bedrooms, Bathrooms, SquareFeet, LotSize, YearBuilt, Amenities, 
 Status, IsAvailable, FeaturedImage, Images, IsActive)
VALUES
    (1, 'apartment', 'Modern Luxury Apartment Downtown Tunis', 
     'Beautiful 3-bedroom apartment with stunning city views, modern kitchen, and updated bathrooms. Located in the heart of downtown Tunis.',
     450000, 'TND', '123 Avenue Habib Bourguiba', 'Tunis', 'Tunis', '1000', 'Tunisia',
     36.8065, 10.1955, 3, 2, 1800, 1800, 2015, '["pool", "gym", "parking", "balcony", "modern_kitchen"]',
     'active', 1, NULL, '[]', 1),
    
    (1, 'apartment', 'Cozy Studio Apartment near University',
     'Charming studio apartment perfect for students or young professionals. Close to university campus, local shops, and public transport.',
     120000, 'TND', '456 Rue de la Liberté', 'Tunis', 'Tunis', '1001', 'Tunisia',
     36.8050, 10.1960, 1, 1, 600, 600, 2010, '["furnished", "quiet_area", "parking"]',
     'active', 1, NULL, '[]', 1),
    
    (2, 'villa', 'Spacious Villa with Garden in La Marsa',
     'Luxury 5-bedroom villa with private garden, swimming pool, and outdoor terrace. Perfect for families seeking luxury and privacy.',
     950000, 'TND', '789 La Marsa Avenue', 'La Marsa', 'Ariana', '2070', 'Tunisia',
     36.8580, 10.3200, 5, 4, 3500, 8000, 2018, '["pool", "garden", "garage", "terrace", "security_system"]',
     'active', 1, NULL, '[]', 1),
    
    (2, 'house', 'Charming House in Sidi Bou Said',
     'Traditional Tunisian house with modern amenities. Located in the picturesque coastal village of Sidi Bou Said.',
     650000, 'TND', '321 Sidi Bou Said', 'Sidi Bou Said', 'Ariana', '2026', 'Tunisia',
     36.8667, 10.3500, 4, 2, 2200, 3000, 1995, '["seaview", "terrace", "traditional_style", "garden"]',
     'active', 1, NULL, '[]', 1),
    
    (3, 'office', 'Modern Office Space in Business District',
     'Professional office space with floor-to-ceiling windows, open floor plan, and modern amenities. Ready for immediate occupancy.',
     85000, 'TND', '555 Business Plaza', 'Tunis', 'Tunis', '1002', 'Tunisia',
     36.8100, 10.1900, 0, 2, 2000, 2000, 2019, '["parking", "security", "meeting_rooms", "break_room"]',
     'active', 1, NULL, '[]', 1),
    
    (3, 'commercial', 'Prime Commercial Shop with Display Window',
     'Excellent location for retail business. High foot traffic area with attractive storefront. Perfect for boutique, cafe, or restaurant.',
     150000, 'TND', '777 Shopping Center', 'Tunis', 'Tunis', '1003', 'Tunisia',
     36.8080, 10.1880, 0, 1, 1200, 1200, 2005, '["display_window", "storage", "parking"]',
     'active', 1, NULL, '[]', 1),
    
    (1, 'apartment', '2-Bedroom Apartment Bab Souika',
     'Well-maintained apartment in vibrant Bab Souika neighborhood. Walking distance to markets and restaurants.',
     280000, 'TND', '222 Bab Souika', 'Tunis', 'Tunis', '1004', 'Tunisia',
     36.7980, 10.1850, 2, 1, 1100, 1100, 2008, '["balcony", "parking", "close_to_shops"]',
     'active', 1, NULL, '[]', 1),
    
    (2, 'land', 'Residential Land Plot in New Development Area',
     'Beautiful residential land in upcoming development area. Perfect for building your dream home. Close to schools and shopping.',
     250000, 'TND', 'Unnamed Plot, Ben Arous', 'Ben Arous', 'Ben Arous', '2013', 'Tunisia',
     36.7500, 10.2300, 0, 0, 5000, 5000, NULL, '["residential_area", "planned_development"]',
     'active', 1, NULL, '[]', 1);

-- =====================================================
-- 4. INSERT SAMPLE INQUIRIES
-- =====================================================

INSERT INTO [dbo].[Inquiries] (PropertyId, ClientId, AgentId, Subject, Message, InquiryType, Status, Priority, IsRead)
VALUES
    (1, 4, 1, 'Inquiry about modern apartment', 'Hello, I am interested in viewing the luxury apartment. Can we schedule a viewing?', 'viewing', 'new', 'high', 0),
    (3, 5, 2, 'Question about villa features', 'Does the villa have air conditioning? What about water heater system?', 'general', 'new', 'normal', 0),
    (2, 6, 1, 'Student interest in studio', 'I am a university student looking for accommodation. Is this studio available immediately?', 'viewing', 'responded', 'normal', 1),
    (4, 7, 2, 'Coastal property viewing', 'Interested in the Sidi Bou Said house. Would like to see it this weekend.', 'viewing', 'scheduled', 'high', 1);

-- =====================================================
-- 5. INSERT SAMPLE FAVORITES
-- =====================================================

INSERT INTO [dbo].[Favorites] (UserId, PropertyId)
VALUES
    (4, 1),
    (4, 3),
    (5, 2),
    (5, 4),
    (6, 1),
    (6, 7),
    (7, 4),
    (7, 3);

-- =====================================================
-- 6. INSERT SAMPLE MESSAGES
-- =====================================================

INSERT INTO [dbo].[Messages] (SenderId, ReceiverId, InquiryId, MessageText, IsRead, ReadAt)
VALUES
    (4, 1, 1, 'Hi, I am very interested in the luxury apartment. When can I view it?', 0, NULL),
    (1, 4, 1, 'Hello! We can arrange a viewing this Saturday at 10 AM. Would that work for you?', 1, GETUTCDATE()),
    (4, 1, 1, 'Perfect! Saturday at 10 AM works great for me. See you then!', 1, GETUTCDATE()),
    (6, 1, 3, 'Thank you for the quick response about the studio!', 1, GETUTCDATE()),
    (7, 2, 4, 'Can you tell me more about the neighborhood?', 0, NULL);

-- =====================================================
-- 7. INSERT SAMPLE NOTIFICATIONS
-- =====================================================

INSERT INTO [dbo].[Notifications] (UserId, Type, Title, Message, RelatedPropertyId, IsRead)
VALUES
    (4, 'new_property', 'New Property Listed!', 'A new 3-bedroom apartment near your favorite area', 1, 0),
    (5, 'inquiry', 'New Inquiry Received', 'Ali Khamis is interested in your villa property', 3, 0),
    (6, 'message', 'New Message', 'You have a new message from Ahmed Ben Ali', NULL, 1),
    (7, 'viewing_reminder', 'Viewing Reminder', 'Your scheduled viewing is tomorrow at 10 AM', 4, 0),
    (4, 'price_alert', 'Price Alert', 'A similar property in your wishlist has a price drop!', 2, 1);

-- =====================================================
-- 8. INSERT SAMPLE CONVERSATIONS
-- =====================================================

INSERT INTO [dbo].[Conversations] (User1Id, User2Id, PropertyId, LastMessageAt, IsActive)
VALUES
    (4, 1, 1, GETUTCDATE(), 1),
    (5, 2, 3, GETUTCDATE(), 1),
    (6, 1, 2, GETUTCDATE(), 1),
    (7, 2, 4, GETUTCDATE(), 1);

-- =====================================================
-- 9. INSERT SAMPLE SAVED SEARCHES
-- =====================================================

INSERT INTO [dbo].[SavedSearches] (UserId, SearchName, PropertyTypeFilter, MinPrice, MaxPrice, MinBedrooms, MaxBedrooms, CityFilter, NotifyOnNewMatch, SearchFilters)
VALUES
    (4, 'Downtown Apartments Under 500k', 'apartment', 200000, 500000, 2, 3, 'Tunis', 1, '{"amenities": ["pool", "parking"]}'),
    (5, 'Villas in La Marsa', 'villa', 800000, 1500000, 4, 6, 'La Marsa', 1, '{"amenities": ["pool", "garden", "security"]}'),
    (6, 'Budget-Friendly Studios', 'apartment', 100000, 200000, 0, 1, 'Tunis', 1, '{"amenities": ["furnished", "parking"]}'),
    (7, 'Coastal Properties', 'villa', 500000, 1200000, 3, 5, 'Sidi Bou Said', 1, '{"amenities": ["seaview"]}');

-- =====================================================
-- 10. INSERT SAMPLE PROPERTY VIEWS (ANALYTICS)
-- =====================================================

INSERT INTO [dbo].[PropertyViews] (PropertyId, UserId, ViewedAt, Source, TimeSpent)
VALUES
    (1, 4, DATEADD(DAY, -3, GETUTCDATE()), 'search', 600),
    (1, 5, DATEADD(DAY, -2, GETUTCDATE()), 'browse', 450),
    (1, 6, DATEADD(DAY, -1, GETUTCDATE()), 'favorite', 720),
    (2, 4, DATEADD(DAY, -5, GETUTCDATE()), 'search', 300),
    (2, 6, DATEADD(DAY, -1, GETUTCDATE()), 'browse', 900),
    (3, 5, DATEADD(DAY, -4, GETUTCDATE()), 'search', 1200),
    (3, 7, DATEADD(DAY, -2, GETUTCDATE()), 'browse', 800),
    (4, 7, DATEADD(DAY, -1, GETUTCDATE()), 'favorite', 1500),
    (5, 4, DATEADD(DAY, -6, GETUTCDATE()), 'browse', 180),
    (7, 5, DATEADD(DAY, -3, GETUTCDATE()), 'search', 420);

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

-- Verify data was inserted correctly
SELECT 'Users' AS TableName, COUNT(*) AS RecordCount FROM [dbo].[Users]
UNION ALL
SELECT 'Agencies', COUNT(*) FROM [dbo].[Agencies]
UNION ALL
SELECT 'Properties', COUNT(*) FROM [dbo].[Properties]
UNION ALL
SELECT 'Inquiries', COUNT(*) FROM [dbo].[Inquiries]
UNION ALL
SELECT 'Favorites', COUNT(*) FROM [dbo].[Favorites]
UNION ALL
SELECT 'Messages', COUNT(*) FROM [dbo].[Messages]
UNION ALL
SELECT 'Notifications', COUNT(*) FROM [dbo].[Notifications]
UNION ALL
SELECT 'Conversations', COUNT(*) FROM [dbo].[Conversations]
UNION ALL
SELECT 'SavedSearches', COUNT(*) FROM [dbo].[SavedSearches]
UNION ALL
SELECT 'PropertyViews', COUNT(*) FROM [dbo].[PropertyViews];

-- =====================================================
-- END OF SEED DATA
-- =====================================================
