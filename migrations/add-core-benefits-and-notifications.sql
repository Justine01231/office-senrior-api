-- Add Core Benefits and Notifications Tables
-- Migration: add-core-benefits-and-notifications.sql

-- Create core_benefits table
CREATE TABLE IF NOT EXISTS core_benefits (
  id SERIAL PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  description TEXT NOT NULL,
  icon VARCHAR(50) NOT NULL,
  category VARCHAR(100) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(200) NOT NULL,
  message TEXT NOT NULL,
  type VARCHAR(50) NOT NULL,
  related_id INTEGER,
  is_read BOOLEAN DEFAULT false,
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  read_at TIMESTAMP
);

-- Insert the 8 core benefits
INSERT INTO core_benefits (name, description, icon, category, is_active, display_order) VALUES
('Healthcare Assistance', 'Medical care support, doctor visits, and health services', '🏥', 'health', true, 1),
('Transportation Services', 'Public transport assistance and ride services', '🚌', 'transport', true, 2),
('Housing Support', 'Housing assistance programs and affordable living', '🏠', 'housing', true, 3),
('Meal Programs', 'Food assistance programs and nutrition support', '🍽️', 'nutrition', true, 4),
('Prescription Drug Coverage', 'Medication assistance and prescription coverage', '💊', 'health', true, 5),
('Social Services', 'Community support and social engagement programs', '👥', 'social', true, 6),
('Home Care Services', 'In-home assistance and daily living support', '🔧', 'care', true, 7),
('Financial Assistance', 'Financial support programs and economic assistance', '💰', 'financial', true, 8);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_core_benefits_is_active ON core_benefits(is_active);
CREATE INDEX IF NOT EXISTS idx_core_benefits_display_order ON core_benefits(display_order);