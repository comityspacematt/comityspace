-- Update task statuses to simplified model
-- Convert existing statuses to new simplified model

-- Update main tasks table
UPDATE tasks 
SET status = 'assigned' 
WHERE status IN ('pending', 'in_progress');

-- Update task assignments table  
UPDATE task_assignments 
SET status = 'assigned' 
WHERE status IN ('assigned', 'in_progress');

-- Keep completed tasks as completed
-- No changes needed for completed status

-- Optional: Add check constraints to prevent invalid statuses in future
ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_status_check;
ALTER TABLE tasks ADD CONSTRAINT tasks_status_check 
CHECK (status IN ('assigned', 'completed'));

ALTER TABLE task_assignments DROP CONSTRAINT IF EXISTS task_assignments_status_check;
ALTER TABLE task_assignments ADD CONSTRAINT task_assignments_status_check 
CHECK (status IN ('assigned', 'completed'));

-- Update sample data to ensure consistency
UPDATE tasks SET status = 'assigned' WHERE status NOT IN ('completed');
UPDATE task_assignments SET status = 'assigned' WHERE status NOT IN ('completed');