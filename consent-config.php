<?php
// consent-config.php
// Configuration for Perfect Brow Consent Module

// ============================================
// STAFF NOTIFICATION EMAIL ADDRESSES
// ============================================
// Add/remove email addresses as needed for staff notifications
$CONSENT_STAFF_EMAILS = [
    'staff@perfectbrow.com',
    'manager@perfectbrow.com'
    // Add more email addresses here as needed
];

// ============================================
// VERIFICATION CODE SETTINGS
// ============================================
$CONSENT_CONFIG = [
    // Verification code length (number of digits)
    'code_length' => 6,

    // Code expiry time in minutes
    'code_expiry_minutes' => 10,

    // Maximum verification attempts before locking
    'max_attempts' => 5,

    // Resend cooldown in seconds (prevent spam)
    'resend_cooldown_seconds' => 60,

    // Maximum number of resend requests allowed
    'max_resend_count' => 5,

    // Rate limiting settings
    'rate_limit_window_minutes' => 60, // 1 hour window
    'rate_limit_max_submissions' => 5  // Max 5 submissions per hour per IP
];

// ============================================
// EMAIL SETTINGS
// ============================================
$EMAIL_CONFIG = [
    // From address for consent emails
    'from_email' => 'noreply@perfectbrow.com',
    'from_name' => 'Perfect Brow',

    // Email subject lines
    'customer_subject' => 'Your Perfect Brow Verification Code',
    'staff_subject' => 'New Consent Form Submission',

    // Support email for customers to contact
    'support_email' => 'support@perfectbrow.com',
    'support_phone' => '(555) 123-4567',

    // Enable/disable staff notifications
    'enable_staff_notifications' => true
];

// ============================================
// CUSTOMER EMAIL TEMPLATE
// ============================================
function getCustomerEmailTemplate($firstName, $code, $expiryMinutes) {
    $supportEmail = $GLOBALS['EMAIL_CONFIG']['support_email'];
    $supportPhone = $GLOBALS['EMAIL_CONFIG']['support_phone'];

    return "
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #d946ef, #ec4899); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
        .code-box { background: white; border: 2px dashed #d946ef; padding: 20px; text-align: center; margin: 20px 0; border-radius: 8px; }
        .code { font-size: 32px; font-weight: bold; color: #d946ef; letter-spacing: 8px; }
        .footer { text-align: center; color: #666; font-size: 12px; margin-top: 20px; }
        .button { background: linear-gradient(135deg, #d946ef, #ec4899); color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin: 10px 0; }
    </style>
</head>
<body>
    <div class='container'>
        <div class='header'>
            <h1>Perfect Brow</h1>
            <p>Verification Code</p>
        </div>
        <div class='content'>
            <p>Hi {$firstName},</p>
            <p>Thank you for completing your Perfect Brow services consent form. To verify your identity, please enter the following code:</p>

            <div class='code-box'>
                <div class='code'>{$code}</div>
            </div>

            <p><strong>This code will expire in {$expiryMinutes} minutes.</strong></p>

            <p>If you did not request this code, please disregard this email or contact us immediately.</p>

            <hr style='border: 1px solid #ddd; margin: 20px 0;'>

            <p style='font-size: 14px; color: #666;'>
                <strong>Need help?</strong><br>
                Email: {$supportEmail}<br>
                Phone: {$supportPhone}
            </p>
        </div>
        <div class='footer'>
            <p>&copy; " . date('Y') . " Perfect Brow. All rights reserved.</p>
        </div>
    </div>
</body>
</html>
";
}

// ============================================
// STAFF NOTIFICATION EMAIL TEMPLATE
// ============================================
function getStaffEmailTemplate($firstName, $lastName, $phone, $email, $submissionId) {
    return "
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #4b5563; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
        .content { background: #f9f9f9; padding: 20px; border-radius: 0 0 8px 8px; }
        .info-row { padding: 8px 0; border-bottom: 1px solid #ddd; }
        .label { font-weight: bold; color: #666; }
    </style>
</head>
<body>
    <div class='container'>
        <div class='header'>
            <h2>New Consent Form Submission</h2>
        </div>
        <div class='content'>
            <p>A new consent form has been submitted:</p>

            <div class='info-row'>
                <span class='label'>Name:</span> {$firstName} {$lastName}
            </div>
            <div class='info-row'>
                <span class='label'>Phone:</span> {$phone}
            </div>
            <div class='info-row'>
                <span class='label'>Email:</span> {$email}
            </div>
            <div class='info-row'>
                <span class='label'>Submission ID:</span> {$submissionId}
            </div>
            <div class='info-row'>
                <span class='label'>Time:</span> " . date('Y-m-d h:i:s A') . "
            </div>

            <p style='margin-top: 20px; font-size: 14px; color: #666;'>
                The customer has been sent a verification code. Once verified, they will complete the signature step.
            </p>
        </div>
    </div>
</body>
</html>
";
}

?>
