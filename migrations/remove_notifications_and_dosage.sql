-- Migration: Remove notifications table and dosage field from health_records
-- Date: 2025-10-20
-- Description: Clean up schema by removing notifications system and dosage field

-- Step 1: Drop notifications table completely
DROP TABLE IF EXISTS notifications CASCADE;

-- Step 2: Remove dosage column from health_records table
ALTER TABLE health_records DROP COLUMN IF EXISTS dosage;

-- Step 3: Add comment to health_records table for clarity
COMMENT ON TABLE health_records IS 'Health records for seniors - dosage information should be included in description field';
COMMENT ON COLUMN health_records.description IS 'Health record description - include dosage information here if applicable';

-- Verification queries (uncomment to check changes)
-- SELECT column_name FROM information_schema.columns WHERE table_name = 'health_records';
-- SELECT table_name FROM information_schema.tables WHERE table_name = 'notifications';
