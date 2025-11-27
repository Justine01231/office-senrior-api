-- Migration: Add Benefits Specialist Tables
-- Created: 2025-11-24
-- Description: Add benefit_applications, application_status_history, and documents tables

-- BENEFIT APPLICATIONS TABLE
CREATE TABLE IF NOT EXISTS benefit_applications (
    id SERIAL PRIMARY KEY,
    senior_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    application_type VARCHAR(100) NOT NULL,
    application_date DATE NOT NULL,
    status VARCHAR(50) DEFAULT 'pending',
    status_updated_at TIMESTAMP DEFAULT NOW(),
    status_updated_by INTEGER REFERENCES users(id),
    status_reason TEXT,
    priority VARCHAR(20) DEFAULT 'medium',
    estimated_amount VARCHAR(50),
    notes TEXT,
    assigned_to INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- APPLICATION STATUS HISTORY TABLE
CREATE TABLE IF NOT EXISTS application_status_history (
    id SERIAL PRIMARY KEY,
    application_id INTEGER NOT NULL REFERENCES benefit_applications(id) ON DELETE CASCADE,
    previous_status VARCHAR(50),
    new_status VARCHAR(50) NOT NULL,
    reason TEXT,
    updated_by INTEGER NOT NULL REFERENCES users(id),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- DOCUMENTS TABLE
CREATE TABLE IF NOT EXISTS documents (
    id SERIAL PRIMARY KEY,
    application_id INTEGER REFERENCES benefit_applications(id) ON DELETE CASCADE,
    senior_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    document_type VARCHAR(100) NOT NULL,
    status VARCHAR(50) DEFAULT 'required',
    file_name VARCHAR(255),
    file_path VARCHAR(500),
    file_size INTEGER,
    mime_type VARCHAR(100),
    uploaded_by INTEGER REFERENCES users(id),
    uploaded_at TIMESTAMP,
    reviewed_by INTEGER REFERENCES users(id),
    reviewed_at TIMESTAMP,
    review_notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_benefit_applications_senior_id ON benefit_applications(senior_id);
CREATE INDEX IF NOT EXISTS idx_benefit_applications_status ON benefit_applications(status);
CREATE INDEX IF NOT EXISTS idx_benefit_applications_assigned_to ON benefit_applications(assigned_to);
CREATE INDEX IF NOT EXISTS idx_application_status_history_application_id ON application_status_history(application_id);
CREATE INDEX IF NOT EXISTS idx_documents_application_id ON documents(application_id);
CREATE INDEX IF NOT EXISTS idx_documents_senior_id ON documents(senior_id);
CREATE INDEX IF NOT EXISTS idx_documents_status ON documents(status);

-- Insert sample data for testing
INSERT INTO benefit_applications (senior_id, application_type, application_date, status, priority, estimated_amount, notes) VALUES
(2, 'SNAP Benefits', '2024-11-01', 'approved', 'high', '$200/month', 'Approved for food assistance program'),
(3, 'Medicare', '2024-11-05', 'pending', 'medium', '$150/month', 'Medical coverage application under review'),
(4, 'Housing Assistance', '2024-11-10', 'under_review', 'high', '$500/month', 'Housing subsidy application'),
(2, 'Medicaid', '2024-11-15', 'approved', 'medium', '$100/month', 'Healthcare coverage approved'),
(5, 'SNAP Benefits', '2024-11-20', 'rejected', 'low', '$180/month', 'Income exceeds eligibility threshold');

-- Insert sample documents
INSERT INTO documents (application_id, senior_id, name, description, document_type, status) VALUES
(1, 2, 'Social Security Card', 'Copy of social security card', 'ID', 'approved'),
(1, 2, 'Income Statement', 'Monthly income verification', 'Income_Proof', 'approved'),
(1, 2, 'Bank Statement', 'Last 3 months bank statements', 'Financial', 'submitted'),
(2, 3, 'Medicare Card', 'Current medicare card copy', 'ID', 'required'),
(2, 3, 'Medical Records', 'Recent medical history', 'Medical_Records', 'submitted'),
(3, 4, 'Lease Agreement', 'Current housing lease', 'Housing', 'approved'),
(3, 4, 'Utility Bills', 'Last 2 months utility bills', 'Utility', 'submitted');
