export interface InternInvitationParams {
  candidateName: string;
  candidateEmail: string;
  generatedPassword: string;
  companyName?: string;
  supportEmail?: string;
}

export function buildInternInvitationEmail({
  candidateName,
  candidateEmail,
  generatedPassword,
  companyName = "Job Jockey",
  supportEmail = "admin@jobjockey.in",
}: InternInvitationParams): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to ${companyName}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap');
    body {
      margin: 0;
      padding: 0;
      font-family: 'Inter', Arial, sans-serif;
      background-color: #f1f5f9;
      color: #334155;
      -webkit-font-smoothing: antialiased;
    }
    .email-wrapper {
      max-width: 600px;
      margin: 40px auto;
      background: #0f172a; /* Dark navy */
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
    }
    .header {
      background-color: #f59e0b; /* Orange */
      padding: 32px 24px;
      text-align: center;
    }
    .header h1 {
      margin: 0;
      color: #000000;
      font-size: 28px;
      font-weight: 700;
      letter-spacing: -0.5px;
    }
    .header p {
      margin: 8px 0 0;
      color: #1e293b;
      font-size: 14px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    .content {
      padding: 40px 32px;
      color: #e2e8f0;
    }
    .content h2 {
      margin-top: 0;
      color: #f59e0b;
      font-size: 24px;
      font-weight: 700;
    }
    .content p {
      font-size: 15px;
      line-height: 1.6;
      color: #cbd5e1;
      margin: 16px 0;
    }
    .card {
      background: #1e293b;
      border: 1px solid #334155;
      border-radius: 10px;
      padding: 24px;
      margin: 32px 0;
    }
    .card-title {
      font-size: 13px;
      text-transform: uppercase;
      color: #94a3b8;
      margin-bottom: 16px;
      font-weight: 600;
      letter-spacing: 0.5px;
    }
    .credential-group {
      margin-bottom: 16px;
    }
    .credential-group:last-child {
      margin-bottom: 0;
    }
    .credential-label {
      font-size: 12px;
      color: #94a3b8;
      display: block;
      margin-bottom: 4px;
    }
    .credential-value {
      font-size: 16px;
      color: #f59e0b;
      font-weight: 600;
      background: #0f172a;
      padding: 10px 14px;
      border-radius: 6px;
      display: inline-block;
      width: calc(100% - 28px);
      word-break: break-all;
    }
    .alert-box {
      background: rgba(245, 158, 11, 0.1);
      border-left: 4px solid #f59e0b;
      padding: 16px;
      border-radius: 4px;
      margin-top: 32px;
    }
    .alert-box p {
      margin: 0;
      color: #fcd34d;
      font-size: 14px;
    }
    .footer {
      text-align: center;
      padding-top: 32px;
      border-top: 1px solid #334155;
      margin-top: 32px;
    }
    .footer p {
      color: #64748b;
      font-size: 13px;
      margin: 4px 0;
    }
    @media only screen and (max-width: 600px) {
      .email-wrapper {
        margin: 20px 10px;
        width: auto;
      }
      .content {
        padding: 24px 20px;
      }
    }
  </style>
</head>
<body>
  <div class="email-wrapper">
    <div class="header">
      <h1>${companyName.replace("Jockey", "<span>Jockey</span>")}</h1>
      <p>Intern Management Platform</p>
    </div>
    <div class="content">
      <h2>Welcome aboard, ${candidateName}! 🎉</h2>
      <p>Your application has been <strong style="color: #10b981;">approved</strong>. We are thrilled to have you join our team.</p>
      
      <div class="card">
        <div class="card-title">Your Login Credentials</div>
        
        <div class="credential-group">
          <span class="credential-label">Email</span>
          <span class="credential-value">📧 ${candidateEmail}</span>
        </div>
        
        <div class="credential-group">
          <span class="credential-label">Temporary Password</span>
          <span class="credential-value">🔑 ${generatedPassword}</span>
        </div>
      </div>

      <div class="alert-box">
        <p><strong>Security Notice:</strong> For security reasons, please change your password immediately after your first login. Your dashboard access will be restricted until your password is updated.</p>
      </div>

      <div class="footer">
        <p>&mdash; The ${companyName} Team</p>
        <p>If you have any issues, contact <a href="mailto:${supportEmail}" style="color: #f59e0b; text-decoration: none;">${supportEmail}</a></p>
      </div>
    </div>
  </div>
</body>
</html>
  `;
}
