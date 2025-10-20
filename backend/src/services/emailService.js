const nodemailer = require('nodemailer');
const cron = require('node-cron');
const db = require('../config/database');

class EmailService {
  constructor() {
    this.transporter = null;
    this.initializeTransporter();
    this.initializeReminderJobs();
  }

  // Initialize email transporter
  initializeTransporter() {
    try {
      this.transporter = nodemailer.createTransport({
        host: process.env.EMAIL_HOST || 'smtp.gmail.com',
        port: process.env.EMAIL_PORT || 587,
        secure: false, // true for 465, false for other ports
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS,
        },
      });

      // Verify connection configuration
      this.transporter.verify((error, success) => {
        if (error) {
          console.error('Email service error:', error);
        } else {
          console.log('Email service is ready');
        }
      });
    } catch (error) {
      console.error('Failed to initialize email service:', error);
    }
  }

  // Send task assignment notification
  async sendTaskAssignmentNotification({
    volunteerEmail,
    volunteerName,
    taskTitle,
    taskDescription,
    dueDate,
    priority,
    estimatedHours,
    assignedByName,
    organizationName
  }) {
    if (!this.transporter) {
      throw new Error('Email service not available');
    }

    const dueDateStr = dueDate ? new Date(dueDate).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }) : 'No due date';

    const priorityColor = {
      urgent: '#dc2626',
      high: '#ea580c',
      medium: '#2563eb',
      low: '#16a34a'
    }[priority] || '#6b7280';

    const mailOptions = {
      from: `"${organizationName}" <${process.env.EMAIL_USER}>`,
      to: volunteerEmail,
      subject: `New Task Assigned: ${taskTitle}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>New Task Assignment</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
            <h1 style="margin: 0; font-size: 24px;">New Task Assigned</h1>
            <p style="margin: 10px 0 0 0; opacity: 0.9;">${organizationName}</p>
          </div>
          
          <div style="background: #fff; border: 1px solid #e5e7eb; border-top: none; padding: 30px; border-radius: 0 0 10px 10px;">
            <p style="font-size: 16px; margin-bottom: 20px;">Hello ${volunteerName},</p>
            
            <p>You have been assigned a new task:</p>
            
            <div style="background: #f9fafb; border-left: 4px solid ${priorityColor}; padding: 20px; margin: 20px 0; border-radius: 5px;">
              <h2 style="margin: 0 0 15px 0; color: #1f2937; font-size: 20px;">${taskTitle}</h2>
              
              <div style="margin-bottom: 15px;">
                <span style="background: ${priorityColor}; color: white; padding: 4px 12px; border-radius: 20px; font-size: 12px; text-transform: uppercase; font-weight: bold;">
                  ${priority} Priority
                </span>
              </div>
              
              ${taskDescription ? `
                <div style="margin-bottom: 15px;">
                  <strong>Description:</strong>
                  <p style="margin: 5px 0; color: #6b7280;">${taskDescription}</p>
                </div>
              ` : ''}
              
              <div style="display: flex; flex-wrap: wrap; gap: 20px; margin-top: 20px;">
                <div>
                  <strong>Due Date:</strong>
                  <p style="margin: 5px 0; color: #6b7280;">${dueDateStr}</p>
                </div>
                
                ${estimatedHours ? `
                  <div>
                    <strong>Estimated Time:</strong>
                    <p style="margin: 5px 0; color: #6b7280;">${estimatedHours} hours</p>
                  </div>
                ` : ''}
                
                <div>
                  <strong>Assigned By:</strong>
                  <p style="margin: 5px 0; color: #6b7280;">${assignedByName}</p>
                </div>
              </div>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${process.env.FRONTEND_URL}/my-tasks" 
                 style="background: #3b82f6; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">
                View Task in Dashboard
              </a>
            </div>
            
            <div style="border-top: 1px solid #e5e7eb; padding-top: 20px; margin-top: 30px; color: #6b7280; font-size: 14px;">
              <p>You can view and manage all your tasks by logging into your ComitySpace dashboard.</p>
              <p style="margin-top: 15px;">Best regards,<br>The ${organizationName} Team</p>
            </div>
          </div>
        </body>
        </html>
      `
    };

    try {
      const result = await this.transporter.sendMail(mailOptions);
      console.log('Task assignment email sent:', result.messageId);
      return result;
    } catch (error) {
      console.error('Failed to send task assignment email:', error);
      throw error;
    }
  }

  // Send task completion notification to admin
  async sendTaskCompletedNotification({
    adminEmail,
    adminName,
    volunteerName,
    taskTitle,
    completionNotes,
    organizationName
  }) {
    if (!this.transporter) {
      throw new Error('Email service not available');
    }

    const mailOptions = {
      from: `"${organizationName}" <${process.env.EMAIL_USER}>`,
      to: adminEmail,
      subject: `Task Completed: ${taskTitle}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Task Completed</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
            <h1 style="margin: 0; font-size: 24px;">Task Completed ✓</h1>
            <p style="margin: 10px 0 0 0; opacity: 0.9;">${organizationName}</p>
          </div>
          
          <div style="background: #fff; border: 1px solid #e5e7eb; border-top: none; padding: 30px; border-radius: 0 0 10px 10px;">
            <p style="font-size: 16px; margin-bottom: 20px;">Hello ${adminName},</p>
            
            <p>A volunteer has completed a task:</p>
            
            <div style="background: #f0fdf4; border-left: 4px solid #10b981; padding: 20px; margin: 20px 0; border-radius: 5px;">
              <h2 style="margin: 0 0 15px 0; color: #1f2937; font-size: 20px;">${taskTitle}</h2>
              
              <div style="margin-bottom: 15px;">
                <strong>Completed By:</strong>
                <p style="margin: 5px 0; color: #6b7280;">${volunteerName}</p>
              </div>
              
              <div style="margin-bottom: 15px;">
                <strong>Completed On:</strong>
                <p style="margin: 5px 0; color: #6b7280;">${new Date().toLocaleDateString('en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}</p>
              </div>
              
              ${completionNotes ? `
                <div>
                  <strong>Completion Notes:</strong>
                  <div style="background: white; border: 1px solid #d1d5db; border-radius: 5px; padding: 15px; margin-top: 10px;">
                    <p style="margin: 0; color: #374151;">${completionNotes}</p>
                  </div>
                </div>
              ` : ''}
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${process.env.FRONTEND_URL}/admin-dashboard" 
                 style="background: #3b82f6; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">
                View in Admin Dashboard
              </a>
            </div>
            
            <div style="border-top: 1px solid #e5e7eb; padding-top: 20px; margin-top: 30px; color: #6b7280; font-size: 14px;">
              <p>You can view task details and provide feedback through your admin dashboard.</p>
            </div>
          </div>
        </body>
        </html>
      `
    };

    try {
      const result = await this.transporter.sendMail(mailOptions);
      console.log('Task completion email sent:', result.messageId);
      return result;
    } catch (error) {
      console.error('Failed to send task completion email:', error);
      throw error;
    }
  }

  // Send task reminder notification
  async sendTaskReminderNotification({
    volunteerEmail,
    volunteerName,
    taskTitle,
    taskDescription,
    dueDate,
    priority,
    daysUntilDue,
    organizationName
  }) {
    if (!this.transporter) {
      throw new Error('Email service not available');
    }

    let subject;
    let urgencyMessage;
    let headerColor;

    if (daysUntilDue === 0) {
      subject = `Task Due Today: ${taskTitle}`;
      urgencyMessage = 'This task is due today!';
      headerColor = '#dc2626';
    } else if (daysUntilDue === 1) {
      subject = `Task Due Tomorrow: ${taskTitle}`;
      urgencyMessage = 'This task is due tomorrow.';
      headerColor = '#ea580c';
    } else if (daysUntilDue <= 3) {
      subject = `Task Due Soon: ${taskTitle}`;
      urgencyMessage = `This task is due in ${daysUntilDue} days.`;
      headerColor = '#f59e0b';
    } else {
      return; // Don't send reminders for tasks due more than 3 days out
    }

    const dueDateStr = new Date(dueDate).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    const mailOptions = {
      from: `"${organizationName}" <${process.env.EMAIL_USER}>`,
      to: volunteerEmail,
      subject: subject,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Task Reminder</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, ${headerColor} 0%, ${headerColor}dd 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
            <h1 style="margin: 0; font-size: 24px;">Task Reminder</h1>
            <p style="margin: 10px 0 0 0; opacity: 0.9;">${organizationName}</p>
          </div>
          
          <div style="background: #fff; border: 1px solid #e5e7eb; border-top: none; padding: 30px; border-radius: 0 0 10px 10px;">
            <p style="font-size: 16px; margin-bottom: 20px;">Hello ${volunteerName},</p>
            
            <p><strong>${urgencyMessage}</strong></p>
            
            <div style="background: #fef3c7; border-left: 4px solid ${headerColor}; padding: 20px; margin: 20px 0; border-radius: 5px;">
              <h2 style="margin: 0 0 15px 0; color: #1f2937; font-size: 20px;">${taskTitle}</h2>
              
              <div style="margin-bottom: 15px;">
                <strong>Due Date:</strong>
                <p style="margin: 5px 0; color: #6b7280;">${dueDateStr}</p>
              </div>
              
              ${taskDescription ? `
                <div style="margin-bottom: 15px;">
                  <strong>Description:</strong>
                  <p style="margin: 5px 0; color: #6b7280;">${taskDescription}</p>
                </div>
              ` : ''}
              
              <div style="margin-bottom: 15px;">
                <span style="background: ${headerColor}; color: white; padding: 4px 12px; border-radius: 20px; font-size: 12px; text-transform: uppercase; font-weight: bold;">
                  ${priority} Priority
                </span>
              </div>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${process.env.FRONTEND_URL}/my-tasks" 
                 style="background: #3b82f6; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">
                View Task
              </a>
            </div>
            
            <div style="border-top: 1px solid #e5e7eb; padding-top: 20px; margin-top: 30px; color: #6b7280; font-size: 14px;">
              <p>Please complete this task before the due date. If you need assistance or have questions, contact your team administrator.</p>
              <p style="margin-top: 15px;">Best regards,<br>The ${organizationName} Team</p>
            </div>
          </div>
        </body>
        </html>
      `
    };

    try {
      const result = await this.transporter.sendMail(mailOptions);
      console.log('Task reminder email sent:', result.messageId);
      return result;
    } catch (error) {
      console.error('Failed to send task reminder email:', error);
      throw error;
    }
  }

  // Schedule reminder emails for a task
  async scheduleTaskReminders(taskId, dueDate, volunteers) {
    try {
      // Store reminder schedules in database for persistence
      const reminderDates = [3, 1, 0]; // 3 days before, 1 day before, on due date
      
      for (const daysBeforeDue of reminderDates) {
        const reminderDate = new Date(dueDate);
        reminderDate.setDate(reminderDate.getDate() - daysBeforeDue);
        
        if (reminderDate > new Date()) { // Only schedule future reminders
          for (const volunteer of volunteers) {
            await db.query(`
              INSERT INTO task_reminders (task_id, user_email, reminder_date, days_before_due, sent)
              VALUES ($1, $2, $3, $4, false)
              ON CONFLICT (task_id, user_email, days_before_due) DO NOTHING
            `, [taskId, volunteer.email, reminderDate, daysBeforeDue]);
          }
        }
      }

      console.log(`Scheduled reminders for task ${taskId}`);
    } catch (error) {
      console.error('Failed to schedule task reminders:', error);
    }
  }

  // Initialize cron jobs for sending reminder emails
  initializeReminderJobs() {
    // Run every day at 9 AM to check for task reminders
    cron.schedule('0 9 * * *', async () => {
      console.log('Checking for task reminders to send...');
      await this.processTaskReminders();
    });

    console.log('Task reminder cron job initialized');
  }

  // Process and send pending task reminders
  async processTaskReminders() {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const remindersQuery = `
        SELECT 
          tr.*,
          t.title,
          t.description,
          t.due_date,
          t.priority,
          u.first_name,
          u.last_name,
          o.name as organization_name
        FROM task_reminders tr
        JOIN tasks t ON tr.task_id = t.id
        JOIN task_assignments ta ON t.id = ta.task_id
        JOIN users u ON ta.user_id = u.id AND u.email = tr.user_email
        JOIN organizations o ON t.organization_id = o.id
        WHERE tr.reminder_date::date = $1
          AND tr.sent = false
          AND ta.status != 'completed'
        ORDER BY tr.reminder_date
      `;

      const reminders = await db.query(remindersQuery, [today.toISOString().split('T')[0]]);

      for (const reminder of reminders.rows) {
        try {
          await this.sendTaskReminderNotification({
            volunteerEmail: reminder.user_email,
            volunteerName: `${reminder.first_name} ${reminder.last_name}`.trim() || reminder.user_email,
            taskTitle: reminder.title,
            taskDescription: reminder.description,
            dueDate: reminder.due_date,
            priority: reminder.priority,
            daysUntilDue: reminder.days_before_due === 0 ? 0 : reminder.days_before_due,
            organizationName: reminder.organization_name
          });

          // Mark reminder as sent
          await db.query(`
            UPDATE task_reminders 
            SET sent = true, sent_at = CURRENT_TIMESTAMP 
            WHERE id = $1
          `, [reminder.id]);

          console.log(`Sent reminder for task ${reminder.task_id} to ${reminder.user_email}`);
        } catch (error) {
          console.error(`Failed to send reminder for task ${reminder.task_id}:`, error);
        }
      }

      if (reminders.rows.length > 0) {
        console.log(`Processed ${reminders.rows.length} task reminders`);
      }
    } catch (error) {
      console.error('Failed to process task reminders:', error);
    }
  }
}

// Create singleton instance
const emailService = new EmailService();

// Export the class methods
module.exports = {
  sendTaskAssignmentNotification: emailService.sendTaskAssignmentNotification.bind(emailService),
  sendTaskCompletedNotification: emailService.sendTaskCompletedNotification.bind(emailService),
  sendTaskReminderNotification: emailService.sendTaskReminderNotification.bind(emailService),
  scheduleTaskReminders: emailService.scheduleTaskReminders.bind(emailService)
};