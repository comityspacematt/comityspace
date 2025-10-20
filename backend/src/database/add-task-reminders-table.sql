-- Add task reminders table for email scheduling
CREATE TABLE IF NOT EXISTS task_reminders (
    id SERIAL PRIMARY KEY,
    task_id INTEGER REFERENCES tasks(id) ON DELETE CASCADE,
    user_email VARCHAR(255) NOT NULL,
    reminder_date DATE NOT NULL,
    days_before_due INTEGER NOT NULL,
    sent BOOLEAN DEFAULT false,
    sent_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(task_id, user_email, days_before_due)
);

-- Index for efficient reminder processing
CREATE INDEX idx_task_reminders_date_sent ON task_reminders(reminder_date, sent);
CREATE INDEX idx_task_reminders_task ON task_reminders(task_id);

-- Insert sample reminder data for testing
INSERT INTO task_reminders (task_id, user_email, reminder_date, days_before_due, sent)
SELECT 
    t.id,
    u.email,
    t.due_date - INTERVAL '1 day',
    1,
    false
FROM tasks t
JOIN task_assignments ta ON t.id = ta.task_id
JOIN users u ON ta.user_id = u.id
WHERE t.due_date IS NOT NULL 
  AND t.due_date > CURRENT_DATE
  AND ta.status != 'completed'
ON CONFLICT (task_id, user_email, days_before_due) DO NOTHING;