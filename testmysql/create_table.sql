-- SQL to create the test table manually
-- Run this in your MySQL database if the automatic table creation doesn't work

-- Insert some sample data
INSERT INTO test_data (name, email) VALUES 
('Test User 1', 'test1@example.com'),
('Test User 2', 'test2@example.com'),
('Test User 3', 'test3@example.com');

-- Verify the data was inserted
SELECT * FROM test_data;