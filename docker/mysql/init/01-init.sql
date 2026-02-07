-- Create user if not exists (though environment variable handles this, good for reference)
-- CREATE USER IF NOT EXISTS 'user'@'%' IDENTIFIED BY 'password';
-- GRANT ALL PRIVILEGES ON glance.* TO 'user'@'%';
-- FLUSH PRIVILEGES;

-- Ensure UTF8MB4
ALTER DATABASE glance CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci;
