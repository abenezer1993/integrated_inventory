-- Add job_type column to employees table
ALTER TABLE employees 
ADD COLUMN job_type VARCHAR(20) DEFAULT 'gypsum';

-- Add comment
COMMENT ON COLUMN employees.job_type IS 'Job type: gypsum or woodwork';
