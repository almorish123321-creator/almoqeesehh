-- ============================================================
-- Vercel Postgres migration — ported from the original MySQL schema
-- Source: alehtiat-almorish/website/schema.sql
-- ============================================================
--
-- MySQL → PostgreSQL translation rules applied:
--   AUTO_INCREMENT          → GENERATED ALWAYS AS IDENTITY
--   TINYINT(1)              → BOOLEAN
--   TEXT / VARCHAR          → TEXT / VARCHAR (unchanged)
--   DATETIME                → TIMESTAMP
--   ON UPDATE CURRENT_TIMESTAMP → handled via trigger (added below)
--   MySQL `IF NOT EXISTS` index syntax → standard CREATE INDEX IF NOT EXISTS
--
-- All column names preserved verbatim. Table names preserved verbatim.
-- ============================================================

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    username VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'user',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Nationalities table
CREATE TABLE IF NOT EXISTS nationalities (
    id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name_ar VARCHAR(255),
    name_en VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Hospitals table
CREATE TABLE IF NOT EXISTS hospitals (
    id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    type VARCHAR(255),
    name_ar VARCHAR(255),
    name_en VARCHAR(255),
    logo TEXT,
    city VARCHAR(255),
    region VARCHAR(255),
    license_number VARCHAR(255),
    user_id INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Doctors table
CREATE TABLE IF NOT EXISTS doctors (
    id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name_ar VARCHAR(255),
    name_en VARCHAR(255),
    specialty_ar VARCHAR(255),
    specialty_en VARCHAR(255),
    doctor_group_id VARCHAR(255),
    hospital_id INTEGER,
    user_id INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Patients table — every column from the original schema preserved
CREATE TABLE IF NOT EXISTS patients (
    id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    gsl_code VARCHAR(255),
    identity_number VARCHAR(255),
    name_ar VARCHAR(255),
    name_en VARCHAR(255),
    date_from DATE,
    date_to DATE,
    day_count INT,
    time_from VARCHAR(50),
    time_to VARCHAR(50),
    employer VARCHAR(255),
    relation VARCHAR(255),
    visit_type VARCHAR(255),
    nationality_id INTEGER,
    hospital_id INTEGER,
    doctor_id INTEGER,
    employer_en VARCHAR(255),
    doctor_name_ar VARCHAR(255),
    doctor_name_en VARCHAR(255),
    doctor_specialty_ar VARCHAR(255),
    doctor_specialty_en VARCHAR(255),
    issue_date DATE,
    leave_file_path TEXT,
    prevent_inquiry BOOLEAN DEFAULT FALSE,
    leave_type VARCHAR(100),
    hijri_admission_date VARCHAR(50),
    hijri_discharge_date VARCHAR(50),
    user_id INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for faster searches (same as original)
CREATE INDEX IF NOT EXISTS idx_patients_gsl_code ON patients(gsl_code);
CREATE INDEX IF NOT EXISTS idx_patients_identity ON patients(identity_number);
CREATE INDEX IF NOT EXISTS idx_patients_user_id ON patients(user_id);
CREATE INDEX IF NOT EXISTS idx_hospitals_user_id ON hospitals(user_id);
CREATE INDEX IF NOT EXISTS idx_doctors_user_id ON doctors(user_id);

-- ============================================================
-- Triggers to replicate MySQL's ON UPDATE CURRENT_TIMESTAMP
-- ============================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS trg_nationalities_updated_at ON nationalities;
CREATE TRIGGER trg_nationalities_updated_at
    BEFORE UPDATE ON nationalities
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_hospitals_updated_at ON hospitals;
CREATE TRIGGER trg_hospitals_updated_at
    BEFORE UPDATE ON hospitals
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_doctors_updated_at ON doctors;
CREATE TRIGGER trg_doctors_updated_at
    BEFORE UPDATE ON doctors
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_patients_updated_at ON patients;
CREATE TRIGGER trg_patients_updated_at
    BEFORE UPDATE ON patients
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
