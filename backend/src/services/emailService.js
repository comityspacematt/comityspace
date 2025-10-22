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

  // Send welcome email to new volunteer
  async sendWelcomeEmail({
    volunteerEmail,
    volunteerName,
    role,
    organizationName,
    organizationPassword,
    adminName,
    adminEmail
  }) {
    if (!this.transporter) {
      throw new Error('Email service not available');
    }

    const isAdmin = role === 'nonprofit_admin';
    const roleTitle = isAdmin ? 'Administrator' : 'Volunteer';

    const mailOptions = {
      from: `"${organizationName}" <${process.env.EMAIL_USER}>`,
      to: volunteerEmail,
      subject: `Welcome to ${organizationName} on ComitySpace!`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Welcome to ${organizationName}</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
            <h1 style="margin: 0; font-size: 28px;">Welcome to ComitySpace! 🎉</h1>
            <p style="margin: 10px 0 0 0; opacity: 0.9; font-size: 18px;">${organizationName}</p>
          </div>

          <div style="background: #fff; border: 1px solid #e5e7eb; border-top: none; padding: 30px; border-radius: 0 0 10px 10px;">
            <p style="font-size: 16px; margin-bottom: 20px;">Hello ${volunteerName || 'there'},</p>

            <p>You've been added as a <strong>${roleTitle}</strong> to ${organizationName} on ComitySpace! We're excited to have you on board.</p>

            <div style="background: #f0f9ff; border-left: 4px solid #3b82f6; padding: 20px; margin: 25px 0; border-radius: 5px;">
              <h2 style="margin: 0 0 15px 0; color: #1f2937; font-size: 18px;">Your Login Credentials</h2>

              <div style="background: white; border: 1px solid #bfdbfe; border-radius: 5px; padding: 15px; margin: 15px 0;">
                <div style="margin-bottom: 10px;">
                  <strong>Login URL:</strong><br>
                  <a href="${process.env.FRONTEND_URL || 'https://comityspace.netlify.app'}"
                     style="color: #3b82f6; text-decoration: none;">
                    ${process.env.FRONTEND_URL || 'https://comityspace.netlify.app'}
                  </a>
                </div>

                <div style="margin-bottom: 10px;">
                  <strong>Your Email:</strong><br>
                  <code style="background: #f3f4f6; padding: 4px 8px; border-radius: 3px; color: #1f2937;">${volunteerEmail}</code>
                </div>

                <div>
                  <strong>Organization Password:</strong><br>
                  <code style="background: #fef3c7; padding: 4px 8px; border-radius: 3px; color: #92400e; font-weight: bold;">${organizationPassword}</code>
                </div>
              </div>

              <p style="margin: 15px 0 0 0; font-size: 14px; color: #6b7280;">
                <strong>Note:</strong> Everyone in ${organizationName} uses the same organization password to login. Keep it secure!
              </p>
            </div>

            ${isAdmin ? `
              <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 20px; margin: 25px 0; border-radius: 5px;">
                <h3 style="margin: 0 0 10px 0; color: #92400e; font-size: 16px;">🛡️ You're an Administrator</h3>
                <p style="margin: 0; color: #78350f; font-size: 14px;">
                  As an admin, you can create tasks, schedule events, upload documents, and manage volunteers.
                  Your dashboard has full access to all organization features.
                </p>
              </div>
            ` : `
              <div style="background: #f0fdf4; border-left: 4px solid #10b981; padding: 20px; margin: 25px 0; border-radius: 5px;">
                <h3 style="margin: 0 0 10px 0; color: #065f46; font-size: 16px;">What You Can Do</h3>
                <ul style="margin: 10px 0; padding-left: 20px; color: #047857;">
                  <li>View and complete assigned tasks</li>
                  <li>Sign up for upcoming events</li>
                  <li>Access shared documents</li>
                  <li>Connect with other volunteers</li>
                  <li>Track your volunteer hours</li>
                </ul>
              </div>
            `}

            <div style="text-align: center; margin: 30px 0;">
              <a href="${process.env.FRONTEND_URL || 'https://comityspace.netlify.app'}"
                 style="background: #3b82f6; color: white; padding: 14px 32px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block; font-size: 16px;">
                Login to Your Dashboard
              </a>
            </div>

            ${adminName ? `
              <div style="border-top: 1px solid #e5e7eb; padding-top: 20px; margin-top: 30px; color: #6b7280; font-size: 14px;">
                <p><strong>Questions or need help?</strong></p>
                <p>Contact your organization administrator:<br>
                ${adminName} - <a href="mailto:${adminEmail}" style="color: #3b82f6;">${adminEmail}</a></p>
              </div>
            ` : ''}

            <div style="border-top: 1px solid #e5e7eb; padding-top: 20px; margin-top: 20px; color: #6b7280; font-size: 14px; text-align: center;">
              <p>Welcome to the team!<br>The ${organizationName} Team</p>
            </div>
          </div>
        </body>
        </html>
      `
    };

    try {
      const result = await this.transporter.sendMail(mailOptions);
      console.log('Welcome email sent to:', volunteerEmail);
      return result;
    } catch (error) {
      console.error('Failed to send welcome email:', error);
      throw error;
    }
  }

  // Send event created notification
  async sendEventCreatedNotification({
    eventTitle,
    eventDescription,
    startDate,
    endDate,
    startTime,
    endTime,
    location,
    recipientEmails,
    organizationName,
    creatorName
  }) {
    if (!this.transporter) {
      throw new Error('Email service not available');
    }

    const formatDate = (dateStr) => {
      return new Date(dateStr).toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    };

    const formatTime = (timeStr) => {
      if (!timeStr) return '';
      const [hours, minutes] = timeStr.split(':');
      const hour = parseInt(hours);
      const ampm = hour >= 12 ? 'PM' : 'AM';
      const displayHour = hour % 12 || 12;
      return `${displayHour}:${minutes} ${ampm}`;
    };

    const startDateStr = formatDate(startDate);
    const endDateStr = endDate && endDate !== startDate ? formatDate(endDate) : null;
    const timeStr = startTime ? formatTime(startTime) : 'All day';
    const endTimeStr = endTime && endTime !== startTime ? ` - ${formatTime(endTime)}` : '';

    const mailOptions = {
      from: `"${organizationName}" <${process.env.EMAIL_USER}>`,
      to: recipientEmails,
      subject: `New Event: ${eventTitle}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>New Event</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
            <h1 style="margin: 0; font-size: 24px;">📅 New Event Scheduled</h1>
            <p style="margin: 10px 0 0 0; opacity: 0.9;">${organizationName}</p>
          </div>

          <div style="background: #fff; border: 1px solid #e5e7eb; border-top: none; padding: 30px; border-radius: 0 0 10px 10px;">
            <p style="font-size: 16px; margin-bottom: 20px;">A new event has been scheduled for our organization!</p>

            <div style="background: #f5f3ff; border-left: 4px solid #8b5cf6; padding: 20px; margin: 20px 0; border-radius: 5px;">
              <h2 style="margin: 0 0 15px 0; color: #1f2937; font-size: 22px;">${eventTitle}</h2>

              ${eventDescription ? `
                <div style="margin-bottom: 20px;">
                  <p style="margin: 0; color: #4b5563; line-height: 1.6;">${eventDescription}</p>
                </div>
              ` : ''}

              <div style="border-top: 1px solid #ddd6fe; padding-top: 15px; margin-top: 15px;">
                <div style="margin-bottom: 12px;">
                  <span style="display: inline-block; width: 100px; font-weight: bold; color: #6b7280;">📅 Date:</span>
                  <span style="color: #1f2937;">${startDateStr}</span>
                  ${endDateStr ? `<br><span style="display: inline-block; width: 100px;"></span><span style="color: #6b7280; font-size: 14px;">to ${endDateStr}</span>` : ''}
                </div>

                <div style="margin-bottom: 12px;">
                  <span style="display: inline-block; width: 100px; font-weight: bold; color: #6b7280;">🕐 Time:</span>
                  <span style="color: #1f2937;">${timeStr}${endTimeStr}</span>
                </div>

                ${location ? `
                  <div style="margin-bottom: 12px;">
                    <span style="display: inline-block; width: 100px; font-weight: bold; color: #6b7280;">📍 Location:</span>
                    <span style="color: #1f2937;">${location}</span>
                  </div>
                ` : ''}

                ${creatorName ? `
                  <div>
                    <span style="display: inline-block; width: 100px; font-weight: bold; color: #6b7280;">👤 Organizer:</span>
                    <span style="color: #1f2937;">${creatorName}</span>
                  </div>
                ` : ''}
              </div>
            </div>

            <div style="text-align: center; margin: 30px 0;">
              <a href="${process.env.FRONTEND_URL}/calendar"
                 style="background: #8b5cf6; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">
                View in Calendar
              </a>
            </div>

            <div style="border-top: 1px solid #e5e7eb; padding-top: 20px; margin-top: 30px; color: #6b7280; font-size: 14px;">
              <p>Mark your calendar! We hope to see you there.</p>
              <p style="margin-top: 15px;">Best regards,<br>The ${organizationName} Team</p>
            </div>
          </div>
        </body>
        </html>
      `
    };

    try {
      const result = await this.transporter.sendMail(mailOptions);
      console.log('Event created email sent to:', recipientEmails.length, 'recipients');
      return result;
    } catch (error) {
      console.error('Failed to send event created email:', error);
      throw error;
    }
  }

  // Send event reminder notification
  async sendEventReminderNotification({
    eventTitle,
    eventDescription,
    startDate,
    startTime,
    location,
    volunteerEmail,
    volunteerName,
    organizationName,
    daysUntilEvent
  }) {
    if (!this.transporter) {
      throw new Error('Email service not available');
    }

    let subject;
    let urgencyMessage;

    if (daysUntilEvent === 0) {
      subject = `Event Today: ${eventTitle}`;
      urgencyMessage = 'This event is happening today!';
    } else if (daysUntilEvent === 1) {
      subject = `Event Tomorrow: ${eventTitle}`;
      urgencyMessage = 'This event is happening tomorrow.';
    } else {
      subject = `Upcoming Event: ${eventTitle}`;
      urgencyMessage = `This event is happening in ${daysUntilEvent} days.`;
    }

    const formatDate = (dateStr) => {
      return new Date(dateStr).toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    };

    const formatTime = (timeStr) => {
      if (!timeStr) return 'All day';
      const [hours, minutes] = timeStr.split(':');
      const hour = parseInt(hours);
      const ampm = hour >= 12 ? 'PM' : 'AM';
      const displayHour = hour % 12 || 12;
      return `${displayHour}:${minutes} ${ampm}`;
    };

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
          <title>Event Reminder</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
            <h1 style="margin: 0; font-size: 24px;">⏰ Event Reminder</h1>
            <p style="margin: 10px 0 0 0; opacity: 0.9;">${organizationName}</p>
          </div>

          <div style="background: #fff; border: 1px solid #e5e7eb; border-top: none; padding: 30px; border-radius: 0 0 10px 10px;">
            <p style="font-size: 16px; margin-bottom: 20px;">Hello ${volunteerName},</p>

            <p><strong>${urgencyMessage}</strong></p>

            <div style="background: #fffbeb; border-left: 4px solid #f59e0b; padding: 20px; margin: 20px 0; border-radius: 5px;">
              <h2 style="margin: 0 0 15px 0; color: #1f2937; font-size: 20px;">${eventTitle}</h2>

              ${eventDescription ? `
                <p style="color: #6b7280; margin-bottom: 15px;">${eventDescription}</p>
              ` : ''}

              <div style="margin-top: 15px;">
                <div style="margin-bottom: 10px;">
                  <strong>📅 Date:</strong> ${formatDate(startDate)}
                </div>
                <div style="margin-bottom: 10px;">
                  <strong>🕐 Time:</strong> ${formatTime(startTime)}
                </div>
                ${location ? `
                  <div>
                    <strong>📍 Location:</strong> ${location}
                  </div>
                ` : ''}
              </div>
            </div>

            <div style="text-align: center; margin: 30px 0;">
              <a href="${process.env.FRONTEND_URL}/calendar"
                 style="background: #3b82f6; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">
                View Event Details
              </a>
            </div>

            <div style="border-top: 1px solid #e5e7eb; padding-top: 20px; margin-top: 30px; color: #6b7280; font-size: 14px;">
              <p>We look forward to seeing you there!</p>
              <p style="margin-top: 15px;">Best regards,<br>The ${organizationName} Team</p>
            </div>
          </div>
        </body>
        </html>
      `
    };

    try {
      const result = await this.transporter.sendMail(mailOptions);
      console.log('Event reminder email sent to:', volunteerEmail);
      return result;
    } catch (error) {
      console.error('Failed to send event reminder email:', error);
      throw error;
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
  sendWelcomeEmail: emailService.sendWelcomeEmail.bind(emailService),
  sendEventCreatedNotification: emailService.sendEventCreatedNotification.bind(emailService),
  sendEventReminderNotification: emailService.sendEventReminderNotification.bind(emailService),
  sendTaskAssignmentNotification: emailService.sendTaskAssignmentNotification.bind(emailService),
  sendTaskCompletedNotification: emailService.sendTaskCompletedNotification.bind(emailService),
  sendTaskReminderNotification: emailService.sendTaskReminderNotification.bind(emailService),
  scheduleTaskReminders: emailService.scheduleTaskReminders.bind(emailService)
};