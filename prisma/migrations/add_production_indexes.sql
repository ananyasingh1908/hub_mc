-- Production scalability indexes
-- Run: mysql -u <user> -p <database> < prisma/migrations/add_production_indexes.sql
-- Or via Prisma: npx prisma db push (if you use db push workflow)
-- Requires MySQL 8.0+ for IF NOT EXISTS support

-- Product
CREATE INDEX IF NOT EXISTS Product_active_idx ON Product (active);
CREATE INDEX IF NOT EXISTS Product_category_idx ON Product (category);

-- Tournament
CREATE INDEX IF NOT EXISTS Tournament_status_idx ON Tournament (status);
CREATE INDEX IF NOT EXISTS Tournament_dateTime_idx ON Tournament (dateTime);

-- Order
CREATE INDEX IF NOT EXISTS Order_status_idx ON `Order` (status);
CREATE INDEX IF NOT EXISTS Order_deliveryStatus_idx ON `Order` (deliveryStatus);
CREATE INDEX IF NOT EXISTS Order_createdAt_idx ON `Order` (createdAt);
CREATE INDEX IF NOT EXISTS Order_minecraftUsername_idx ON `Order` (minecraftUsername);

-- SiteNotification
CREATE INDEX IF NOT EXISTS SiteNotification_active_idx ON SiteNotification (active);
CREATE INDEX IF NOT EXISTS SiteNotification_startAt_idx ON SiteNotification (startAt);
CREATE INDEX IF NOT EXISTS SiteNotification_expireAt_idx ON SiteNotification (expireAt);

-- ActivityLog
CREATE INDEX IF NOT EXISTS ActivityLog_createdAt_idx ON ActivityLog (createdAt);
CREATE INDEX IF NOT EXISTS ActivityLog_entity_idx ON ActivityLog (entity);
CREATE INDEX IF NOT EXISTS ActivityLog_severity_idx ON ActivityLog (severity);

-- SupportTicket
CREATE INDEX IF NOT EXISTS SupportTicket_status_idx ON SupportTicket (status);

-- PlayerBan
CREATE INDEX IF NOT EXISTS PlayerBan_minecraftUsername_idx ON PlayerBan (minecraftUsername);
CREATE INDEX IF NOT EXISTS PlayerBan_active_idx ON PlayerBan (active);

-- PlayerNote
CREATE INDEX IF NOT EXISTS PlayerNote_minecraftUsername_idx ON PlayerNote (minecraftUsername);
