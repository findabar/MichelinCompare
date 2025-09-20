import nodemailer from 'nodemailer';

interface FeedbackEmailData {
  userEmail: string;
  userName: string;
  feedbackType: string;
  description: string;
}

class EmailService {
  private transporter: nodemailer.Transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });
  }

  async sendFeedbackEmail(data: FeedbackEmailData): Promise<void> {
    const { userEmail, userName, feedbackType, description } = data;

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: 'jondoz@gmail.com',
      subject: `Michelin Star Hunter Feedback: ${feedbackType}`,
      html: `
        <h2>New Feedback from Michelin Star Hunter</h2>
        <p><strong>From:</strong> ${userName} (${userEmail})</p>
        <p><strong>Feedback Type:</strong> ${feedbackType}</p>
        <p><strong>Description:</strong></p>
        <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 10px 0;">
          ${description.replace(/\n/g, '<br>')}
        </div>
        <hr>
        <p style="color: #666; font-size: 12px;">
          This feedback was submitted through the Michelin Star Hunter application.
        </p>
      `
    };

    try {
      await this.transporter.sendMail(mailOptions);
      console.log('Feedback email sent successfully');
    } catch (error) {
      console.error('Error sending feedback email:', error);
      throw new Error('Failed to send feedback email');
    }
  }
}

export const emailService = new EmailService();