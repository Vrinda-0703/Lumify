/**
 * Lumify Email Notification Service
 * Supports SMTP (via nodemailer) when environment variables are set.
 * In development or when SMTP is not configured, safely logs invitation
 * events to the server console and delivers in-app notifications without faking.
 */

let nodemailer = null;
try {
    nodemailer = require("nodemailer");
} catch {
    // nodemailer not installed or failed to load
}

const isSmtpConfigured = () => {
    return Boolean(
        process.env.SMTP_HOST &&
        process.env.SMTP_USER &&
        process.env.SMTP_PASS
    );
};

const sendSharedBudgetInvite = async ({
    toEmail,
    inviterName,
    inviterEmail,
    budgetName,
    budgetAmount,
    inviteToken,
    appUrl = process.env.CLIENT_URL || "http://localhost:5173",
}) => {
    const cleanAppUrl = String(appUrl || "").trim().replace(/\/+$/, "");
    const formattedAmount = new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 0,
    }).format(Number(budgetAmount) || 0);

    const inviteUrl = inviteToken ? `${cleanAppUrl}/tools?invite=${inviteToken}` : `${cleanAppUrl}/tools`;

    // If SMTP is NOT configured, provide transparent dev fallback:
    if (!isSmtpConfigured() || !nodemailer) {
        console.log("--------------------------------------------------");
        console.log("✉️ [Lumify Email Service - Local/Dev Mode]");
        console.log(`To: ${toEmail}`);
        console.log(`Subject: Invitation to collaborate on "${budgetName}"`);
        console.log(`Invited By: ${inviterName || inviterEmail}`);
        console.log(`Budget Target: ${formattedAmount}`);
        console.log(`Action Link: ${inviteUrl}`);
        if (inviteToken) console.log(`Token: ${inviteToken} (expires in 7 days)`);
        console.log("Note: In development mode, in-app and token invitations are both active.");
        console.log("--------------------------------------------------");

        return {
            sent: false,
            provider: "local-dev",
            notice: "Invitation dispatched in development mode. In-app invitation available for recipient.",
            inviteUrl,
        };
    }

    // SMTP is configured, attempt real email transmission
    try {
        const isSecure = process.env.SMTP_SECURE === "true" || Number(process.env.SMTP_PORT) === 465;
        const transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: Number(process.env.SMTP_PORT) || 587,
            secure: isSecure,
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS,
            },
        });

        const fromAddress = process.env.EMAIL_FROM || process.env.FROM_EMAIL || `"Lumify" <${process.env.SMTP_USER}>`;
        const info = await transporter.sendMail({
            from: fromAddress,
            to: toEmail,
            subject: `${inviterName || "A friend"} invited you to collaborate on "${budgetName}" on Lumify`,
            html: `
                <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 580px; margin: 0 auto; background-color: #090d16; color: #f8fafc; border-radius: 20px; overflow: hidden; border: 1px solid #1e293b;">
                    <div style="background: linear-gradient(135deg, #7c3aed 0%, #06b6d4 100%); padding: 32px 24px; text-align: center;">
                        <h1 style="color: #ffffff; margin: 0; font-size: 26px; font-weight: 800; letter-spacing: -0.5px;">Lumify</h1>
                        <p style="color: rgba(255,255,255,0.85); margin: 6px 0 0 0; font-size: 13px; text-transform: uppercase; letter-spacing: 1.5px; font-weight: 600;">Bring light to your finances.</p>
                    </div>
                    <div style="padding: 32px 28px;">
                        <h2 style="font-size: 20px; font-weight: 700; margin: 0 0 14px 0; color: #f8fafc;">Shared Budget Invitation</h2>
                        <p style="font-size: 14px; line-height: 1.6; color: #94a3b8; margin: 0 0 20px 0;">
                            <strong>${inviterName || inviterEmail}</strong> has invited you to collaborate on the shared budget <strong>"${budgetName}"</strong> with a planned allocation of <strong>${formattedAmount}</strong>.
                        </p>
                        <div style="background-color: #141e33; border: 1px solid #1e293b; border-radius: 14px; padding: 20px; margin: 20px 0;">
                            <div style="font-size: 12px; color: #94a3b8; text-transform: uppercase; letter-spacing: 1px; font-weight: 700;">Budget Name</div>
                            <div style="font-size: 18px; font-weight: 800; color: #38bdf8; margin-top: 4px;">${budgetName}</div>
                            <div style="font-size: 12px; color: #94a3b8; text-transform: uppercase; letter-spacing: 1px; font-weight: 700; margin-top: 14px;">Total Allocation</div>
                            <div style="font-size: 18px; font-weight: 800; color: #10b981; margin-top: 4px;">${formattedAmount}</div>
                        </div>
                        <div style="text-align: center; margin: 30px 0 20px 0;">
                            <a href="${inviteUrl}" style="background-color: #7c3aed; color: #ffffff; text-decoration: none; font-weight: 700; font-size: 14px; padding: 12px 30px; border-radius: 12px; display: inline-block;">
                                View &amp; Accept Invitation
                            </a>
                        </div>
                        <p style="font-size: 12px; color: #64748b; line-height: 1.5; margin: 24px 0 0 0; text-align: center;">
                            This invitation link will expire in 7 days. If you do not have an account, you can create one with this email address to accept the invitation.
                        </p>
                    </div>
                </div>
            `,
        });

        return {
            sent: true,
            provider: "smtp",
            messageId: info.messageId,
        };
    } catch (err) {
        console.error("❌ [Lumify Email Service - Error]:", err.message);
        return {
            sent: false,
            provider: "smtp-failed",
            error: err.message,
            notice: "Real email transmission failed. In-app invitation delivered.",
        };
    }
};

module.exports = {
    sendSharedBudgetInvite,
    isSmtpConfigured,
};
