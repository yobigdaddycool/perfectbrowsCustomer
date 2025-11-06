<?php
// consent-api.php - API endpoint for Perfect Brow Consent Module
// Public-facing endpoints for consent workflow

// Force no caching
header("Cache-Control: no-cache, no-store, must-revalidate");
header("Pragma: no-cache");
header("Expires: 0");

// Force error reporting for debugging
error_reporting(E_ALL);
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);

// Set CORS headers
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Content-Type: application/json');
header('Access-Control-Max-Age: 86400');

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Allowed origins for CORS
$allowed_origins = [
    'http://website-2eb58030.ich.rqh.mybluehost.me',
    'https://website-2eb58030.ich.rqh.mybluehost.me',
    'http://localhost:4200',
    'http://localhost:5200'
];

$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if (in_array($origin, $allowed_origins)) {
    header("Access-Control-Allow-Origin: $origin");
}

// Include configuration files
require_once 'db-config.php';
require_once 'consent-config.php';

// Get the action from URL
$action = $_GET['action'] ?? $_POST['action'] ?? '';

// Initialize response
$response = [
    'success' => false,
    'message' => '',
    'data' => null,
    'error' => null,
    'debug' => []
];

try {
    $response['debug'][] = "Consent API Endpoint: consent-api.php";
    $response['debug'][] = "Action requested: " . ($action ?: 'none');
    $response['debug'][] = "PHP Version: " . PHP_VERSION;

    switch($action) {
        case 'find-customer-matches':
            findCustomerMatchesEndpoint($response);
            break;
        case 'create-consent-submission':
            createConsentSubmission($response);
            break;
        case 'verify-consent-code':
            verifyConsentCode($response);
            break;
        case 'resend-verification-code':
            resendVerificationCode($response);
            break;
        case 'finalize-consent':
            finalizeConsent($response);
            break;
        case 'list-consent-history':
            listConsentHistory($response);
            break;
        default:
            $response['success'] = false;
            $response['message'] = 'No action specified';
            $response['error'] = 'Valid actions: find-customer-matches, create-consent-submission, verify-consent-code, resend-verification-code, finalize-consent, list-consent-history';
            break;
    }

} catch (Exception $e) {
    $response['success'] = false;
    $response['message'] = 'API processing error';
    $response['error'] = $e->getMessage();
    $response['debug'][] = "Exception: " . $e->getMessage();
}

// Return JSON response
echo json_encode($response, JSON_PRETTY_PRINT);

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Normalize phone number to digits only
 */
function normalizePhone($phone) {
    return preg_replace('/\D/', '', $phone);
}

/**
 * Normalize name for comparison (trim and lowercase)
 */
function normalizeName($name) {
    return strtolower(trim($name));
}

/**
 * Generate random 6-digit verification code
 */
function generateVerificationCode($length = 6) {
    return str_pad(rand(0, pow(10, $length) - 1), $length, '0', STR_PAD_LEFT);
}

/**
 * Find customer matches based on phone and name
 */
function findCustomerMatches($pdo, $firstName, $lastName, $phone) {
    $normalizedPhone = normalizePhone($phone);
    $normalizedFirst = normalizeName($firstName);
    $normalizedLast = normalizeName($lastName);

    $matches = [];

    // Exact match: same phone + same first + same last name
    $exactSql = "SELECT
        customer_id,
        first_name,
        last_name,
        phone,
        email,
        'exact' as match_type
    FROM customers
    WHERE REPLACE(REPLACE(REPLACE(phone, '-', ''), '(', ''), ')', '') = :phone
    AND LOWER(TRIM(first_name)) = :firstName
    AND LOWER(TRIM(last_name)) = :lastName
    AND is_active = 1
    LIMIT 1";

    $stmt = $pdo->prepare($exactSql);
    $stmt->execute([
        ':phone' => $normalizedPhone,
        ':firstName' => $normalizedFirst,
        ':lastName' => $normalizedLast
    ]);
    $exactMatch = $stmt->fetch(PDO::FETCH_ASSOC);

    if ($exactMatch) {
        $matches[] = $exactMatch;
        return $matches; // Return immediately on exact match
    }

    // Suggested match: same phone, different name
    $suggestedSql = "SELECT
        customer_id,
        first_name,
        last_name,
        phone,
        email,
        'suggested' as match_type
    FROM customers
    WHERE REPLACE(REPLACE(REPLACE(phone, '-', ''), '(', ''), ')', '') = :phone
    AND (LOWER(TRIM(first_name)) != :firstName OR LOWER(TRIM(last_name)) != :lastName)
    AND is_active = 1
    ORDER BY created_at DESC
    LIMIT 3";

    $stmt = $pdo->prepare($suggestedSql);
    $stmt->execute([
        ':phone' => $normalizedPhone,
        ':firstName' => $normalizedFirst,
        ':lastName' => $normalizedLast
    ]);
    $suggestedMatches = $stmt->fetchAll(PDO::FETCH_ASSOC);

    if ($suggestedMatches) {
        $matches = array_merge($matches, $suggestedMatches);
    }

    return $matches;
}

/**
 * Send verification code email to customer
 */
function sendVerificationEmail($email, $firstName, $code, $expiryMinutes) {
    global $EMAIL_CONFIG;

    $to = $email;
    $subject = $EMAIL_CONFIG['customer_subject'];
    $message = getCustomerEmailTemplate($firstName, $code, $expiryMinutes);
    $headers = "MIME-Version: 1.0\r\n";
    $headers .= "Content-type: text/html; charset=UTF-8\r\n";
    $headers .= "From: {$EMAIL_CONFIG['from_name']} <{$EMAIL_CONFIG['from_email']}>\r\n";

    // Attempt to send email
    $sent = @mail($to, $subject, $message, $headers);

    return $sent;
}

/**
 * Send staff notification email
 */
function sendStaffNotification($firstName, $lastName, $phone, $email, $submissionId) {
    global $CONSENT_STAFF_EMAILS, $EMAIL_CONFIG;

    if (!$EMAIL_CONFIG['enable_staff_notifications'] || empty($CONSENT_STAFF_EMAILS)) {
        return true; // Skip if disabled or no emails configured
    }

    $subject = $EMAIL_CONFIG['staff_subject'];
    $message = getStaffEmailTemplate($firstName, $lastName, $phone, $email, $submissionId);
    $headers = "MIME-Version: 1.0\r\n";
    $headers .= "Content-type: text/html; charset=UTF-8\r\n";
    $headers .= "From: {$EMAIL_CONFIG['from_name']} <{$EMAIL_CONFIG['from_email']}>\r\n";

    foreach ($CONSENT_STAFF_EMAILS as $staffEmail) {
        @mail($staffEmail, $subject, $message, $headers);
    }

    return true;
}

/**
 * Check rate limiting for IP address
 */
function checkRateLimit($pdo, $ipAddress) {
    global $CONSENT_CONFIG;

    $windowMinutes = $CONSENT_CONFIG['rate_limit_window_minutes'];
    $maxSubmissions = $CONSENT_CONFIG['rate_limit_max_submissions'];

    $sql = "SELECT COUNT(*) as submission_count
            FROM consent_submissions
            WHERE ip_address = :ip
            AND created_at >= DATE_SUB(NOW(), INTERVAL :window MINUTE)";

    $stmt = $pdo->prepare($sql);
    $stmt->execute([
        ':ip' => $ipAddress,
        ':window' => $windowMinutes
    ]);
    $result = $stmt->fetch(PDO::FETCH_ASSOC);

    return ($result['submission_count'] < $maxSubmissions);
}

// ============================================
// API ENDPOINT FUNCTIONS
// ============================================

/**
 * Create new consent submission and send verification code
 */
function createConsentSubmission(&$response) {
    global $pdo, $CONSENT_CONFIG;

    try {
        // Get POST data
        $json = file_get_contents('php://input');
        $data = json_decode($json, true);

        if (!$data) {
            $response['success'] = false;
            $response['message'] = "Invalid JSON data";
            $response['error'] = "Failed to parse JSON";
            return;
        }

        $firstName = trim($data['first_name'] ?? '');
        $lastName = trim($data['last_name'] ?? '');
        $phone = $data['phone'] ?? '';
        $email = trim($data['email'] ?? '');
        $consentFormId = $data['consent_form_id'] ?? null;

        // Validate required fields
        if (empty($firstName) || empty($lastName) || empty($phone)) {
            $response['success'] = false;
            $response['message'] = "Missing required fields";
            $response['error'] = "first_name, last_name, and phone are required";
            return;
        }

        if (empty($email)) {
            $response['success'] = false;
            $response['message'] = "Email is required for verification code delivery";
            $response['error'] = "email is required";
            return;
        }

        // Get IP address for rate limiting and logging
        $ipAddress = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
        $userAgent = $_SERVER['HTTP_USER_AGENT'] ?? '';

        // Check rate limiting
        if (!checkRateLimit($pdo, $ipAddress)) {
            $response['success'] = false;
            $response['message'] = "Too many submissions. Please try again later.";
            $response['error'] = "RATE_LIMIT_EXCEEDED";
            $response['debug'][] = "Rate limit exceeded for IP: $ipAddress";
            return;
        }

        // Get active consent form if not specified
        if (empty($consentFormId)) {
            $formSql = "SELECT consent_form_id FROM consent_forms WHERE is_active = 1 ORDER BY effective_date DESC LIMIT 1";
            $stmt = $pdo->query($formSql);
            $form = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$form) {
                $response['success'] = false;
                $response['message'] = "No active consent form available";
                $response['error'] = "CONSENT_FORM_NOT_FOUND";
                return;
            }

            $consentFormId = $form['consent_form_id'];
        }

        // Find customer matches
        $customerMatches = findCustomerMatches($pdo, $firstName, $lastName, $phone);
        $response['debug'][] = "Found " . count($customerMatches) . " customer match(es)";

        // Generate verification code
        $verificationCode = generateVerificationCode($CONSENT_CONFIG['code_length']);
        $expiryMinutes = $CONSENT_CONFIG['code_expiry_minutes'];

        // Insert submission record
        $insertSql = "INSERT INTO consent_submissions (
            consent_form_id,
            first_name,
            last_name,
            phone,
            email,
            verification_code,
            code_expires_at,
            verification_status,
            attempts,
            last_code_sent_at,
            resend_available_at,
            resend_count,
            ip_address,
            user_agent,
            created_at
        ) VALUES (
            :consentFormId,
            :firstName,
            :lastName,
            :phone,
            :email,
            :verificationCode,
            DATE_ADD(NOW(), INTERVAL :expiryMinutes MINUTE),
            'pending',
            0,
            NOW(),
            DATE_ADD(NOW(), INTERVAL :cooldownSeconds SECOND),
            0,
            :ipAddress,
            :userAgent,
            NOW()
        )";

        $stmt = $pdo->prepare($insertSql);
        $stmt->execute([
            ':consentFormId' => $consentFormId,
            ':firstName' => $firstName,
            ':lastName' => $lastName,
            ':phone' => $phone,
            ':email' => $email,
            ':verificationCode' => $verificationCode,
            ':expiryMinutes' => $expiryMinutes,
            ':cooldownSeconds' => $CONSENT_CONFIG['resend_cooldown_seconds'],
            ':ipAddress' => $ipAddress,
            ':userAgent' => substr($userAgent, 0, 500)
        ]);

        $submissionId = $pdo->lastInsertId();
        $response['debug'][] = "Submission created with ID: $submissionId";

        // Send verification email to customer
        $emailSent = sendVerificationEmail($email, $firstName, $verificationCode, $expiryMinutes);

        if (!$emailSent) {
            $response['debug'][] = "⚠️ Warning: Failed to send verification email";
        } else {
            $response['debug'][] = "✅ Verification email sent to: $email";
        }

        // Send staff notification
        sendStaffNotification($firstName, $lastName, $phone, $email, $submissionId);

        // Get code expiry time
        $expiryQuery = "SELECT code_expires_at, resend_available_at FROM consent_submissions WHERE submission_id = :id";
        $stmt = $pdo->prepare($expiryQuery);
        $stmt->execute([':id' => $submissionId]);
        $times = $stmt->fetch(PDO::FETCH_ASSOC);

        $response['success'] = true;
        $response['message'] = "Consent submission created. Verification code sent to email.";
        $response['data'] = [
            'submission_id' => $submissionId,
            'code_expires_at' => $times['code_expires_at'],
            'resend_available_at' => $times['resend_available_at'],
            'customer_matches' => $customerMatches,
            'email_sent' => $emailSent
        ];

    } catch (PDOException $e) {
        $response['success'] = false;
        $response['message'] = "Failed to create consent submission";
        $response['error'] = $e->getMessage();
        $response['debug'][] = "❌ PDO Exception: " . $e->getMessage();
    }
}

/**
 * Verify the entered code
 */
function verifyConsentCode(&$response) {
    global $pdo, $CONSENT_CONFIG;

    try {
        // Get POST data
        $json = file_get_contents('php://input');
        $data = json_decode($json, true);

        if (!$data) {
            $response['success'] = false;
            $response['message'] = "Invalid JSON data";
            return;
        }

        $submissionId = $data['submission_id'] ?? '';
        $code = $data['code'] ?? '';

        if (empty($submissionId) || empty($code)) {
            $response['success'] = false;
            $response['message'] = "Missing required fields";
            $response['error'] = "submission_id and code are required";
            return;
        }

        // Get submission record
        $sql = "SELECT
            submission_id,
            verification_code,
            code_expires_at,
            verification_status,
            attempts,
            first_name,
            last_name
        FROM consent_submissions
        WHERE submission_id = :id";

        $stmt = $pdo->prepare($sql);
        $stmt->execute([':id' => $submissionId]);
        $submission = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$submission) {
            $response['success'] = false;
            $response['message'] = "Submission not found";
            $response['error'] = "SUBMISSION_NOT_FOUND";
            return;
        }

        // Check if already verified
        if ($submission['verification_status'] === 'verified') {
            $response['success'] = true;
            $response['message'] = "Code already verified";
            $response['data'] = [
                'verified' => true,
                'submission_id' => $submissionId
            ];
            return;
        }

        // Check if failed (too many attempts)
        if ($submission['verification_status'] === 'failed') {
            $response['success'] = false;
            $response['message'] = "Verification failed. Too many incorrect attempts.";
            $response['error'] = "VERIFICATION_FAILED";
            return;
        }

        // Check if expired
        $now = new DateTime();
        $expiresAt = new DateTime($submission['code_expires_at']);

        if ($now > $expiresAt) {
            // Mark as expired
            $updateSql = "UPDATE consent_submissions SET verification_status = 'expired' WHERE submission_id = :id";
            $stmt = $pdo->prepare($updateSql);
            $stmt->execute([':id' => $submissionId]);

            $response['success'] = false;
            $response['message'] = "Verification code has expired";
            $response['error'] = "CODE_EXPIRED";
            return;
        }

        // Increment attempts
        $newAttempts = $submission['attempts'] + 1;

        // Check if code matches
        if ($code === $submission['verification_code']) {
            // SUCCESS - Mark as verified
            $updateSql = "UPDATE consent_submissions
                SET verification_status = 'verified',
                    verified_at = NOW(),
                    attempts = :attempts
                WHERE submission_id = :id";

            $stmt = $pdo->prepare($updateSql);
            $stmt->execute([
                ':attempts' => $newAttempts,
                ':id' => $submissionId
            ]);

            $response['success'] = true;
            $response['message'] = "Verification successful";
            $response['data'] = [
                'verified' => true,
                'submission_id' => $submissionId
            ];

        } else {
            // FAILURE - Wrong code

            // Check if this is the last attempt
            if ($newAttempts >= $CONSENT_CONFIG['max_attempts']) {
                $updateSql = "UPDATE consent_submissions
                    SET verification_status = 'failed',
                        attempts = :attempts
                    WHERE submission_id = :id";

                $stmt = $pdo->prepare($updateSql);
                $stmt->execute([
                    ':attempts' => $newAttempts,
                    ':id' => $submissionId
                ]);

                $response['success'] = false;
                $response['message'] = "Maximum attempts exceeded. Verification failed.";
                $response['error'] = "MAX_ATTEMPTS_EXCEEDED";

            } else {
                // Still have attempts left
                $updateSql = "UPDATE consent_submissions
                    SET attempts = :attempts
                    WHERE submission_id = :id";

                $stmt = $pdo->prepare($updateSql);
                $stmt->execute([
                    ':attempts' => $newAttempts,
                    ':id' => $submissionId
                ]);

                $attemptsRemaining = $CONSENT_CONFIG['max_attempts'] - $newAttempts;

                $response['success'] = false;
                $response['message'] = "Invalid verification code";
                $response['error'] = "INVALID_CODE";
                $response['data'] = [
                    'attempts_remaining' => $attemptsRemaining
                ];
            }
        }

    } catch (PDOException $e) {
        $response['success'] = false;
        $response['message'] = "Failed to verify code";
        $response['error'] = $e->getMessage();
        $response['debug'][] = "❌ PDO Exception: " . $e->getMessage();
    }
}

/**
 * Resend verification code
 */
function resendVerificationCode(&$response) {
    global $pdo, $CONSENT_CONFIG;

    try {
        // Get POST data
        $json = file_get_contents('php://input');
        $data = json_decode($json, true);

        if (!$data) {
            $response['success'] = false;
            $response['message'] = "Invalid JSON data";
            return;
        }

        $submissionId = $data['submission_id'] ?? '';

        if (empty($submissionId)) {
            $response['success'] = false;
            $response['message'] = "Missing required field: submission_id";
            return;
        }

        // Get submission record
        $sql = "SELECT
            submission_id,
            first_name,
            email,
            verification_status,
            resend_available_at,
            resend_count
        FROM consent_submissions
        WHERE submission_id = :id";

        $stmt = $pdo->prepare($sql);
        $stmt->execute([':id' => $submissionId]);
        $submission = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$submission) {
            $response['success'] = false;
            $response['message'] = "Submission not found";
            $response['error'] = "SUBMISSION_NOT_FOUND";
            return;
        }

        // Check if already verified
        if ($submission['verification_status'] !== 'pending') {
            $response['success'] = false;
            $response['message'] = "Cannot resend code for this submission";
            $response['error'] = "INVALID_STATUS";
            return;
        }

        // Check cooldown period
        $now = new DateTime();
        $resendAvailableAt = new DateTime($submission['resend_available_at']);

        if ($now < $resendAvailableAt) {
            $secondsRemaining = $resendAvailableAt->getTimestamp() - $now->getTimestamp();

            $response['success'] = false;
            $response['message'] = "Please wait before requesting another code";
            $response['error'] = "RESEND_COOLDOWN";
            $response['data'] = [
                'seconds_remaining' => $secondsRemaining
            ];
            return;
        }

        // Check max resend count
        if ($submission['resend_count'] >= $CONSENT_CONFIG['max_resend_count']) {
            $response['success'] = false;
            $response['message'] = "Maximum resend attempts exceeded";
            $response['error'] = "MAX_RESEND_EXCEEDED";
            return;
        }

        // Generate new verification code
        $newCode = generateVerificationCode($CONSENT_CONFIG['code_length']);
        $expiryMinutes = $CONSENT_CONFIG['code_expiry_minutes'];

        // Update submission with new code
        $updateSql = "UPDATE consent_submissions
            SET verification_code = :code,
                code_expires_at = DATE_ADD(NOW(), INTERVAL :expiryMinutes MINUTE),
                last_code_sent_at = NOW(),
                resend_available_at = DATE_ADD(NOW(), INTERVAL :cooldownSeconds SECOND),
                resend_count = resend_count + 1,
                attempts = 0
            WHERE submission_id = :id";

        $stmt = $pdo->prepare($updateSql);
        $stmt->execute([
            ':code' => $newCode,
            ':expiryMinutes' => $expiryMinutes,
            ':cooldownSeconds' => $CONSENT_CONFIG['resend_cooldown_seconds'],
            ':id' => $submissionId
        ]);

        // Send new verification email
        $emailSent = sendVerificationEmail(
            $submission['email'],
            $submission['first_name'],
            $newCode,
            $expiryMinutes
        );

        // Get updated times
        $timesQuery = "SELECT code_expires_at, resend_available_at FROM consent_submissions WHERE submission_id = :id";
        $stmt = $pdo->prepare($timesQuery);
        $stmt->execute([':id' => $submissionId]);
        $times = $stmt->fetch(PDO::FETCH_ASSOC);

        $response['success'] = true;
        $response['message'] = "New verification code sent";
        $response['data'] = [
            'submission_id' => $submissionId,
            'code_expires_at' => $times['code_expires_at'],
            'resend_available_at' => $times['resend_available_at'],
            'email_sent' => $emailSent
        ];

    } catch (PDOException $e) {
        $response['success'] = false;
        $response['message'] = "Failed to resend verification code";
        $response['error'] = $e->getMessage();
        $response['debug'][] = "❌ PDO Exception: " . $e->getMessage();
    }
}

/**
 * Finalize consent - capture signature and link/create customer
 */
function finalizeConsent(&$response) {
    global $pdo;

    try {
        // Get POST data
        $json = file_get_contents('php://input');
        $data = json_decode($json, true);

        if (!$data) {
            $response['success'] = false;
            $response['message'] = "Invalid JSON data";
            return;
        }

        $submissionId = $data['submission_id'] ?? '';
        $signatureName = trim($data['signature_name'] ?? '');
        $confirmUpdates = $data['confirm_updates'] ?? false;
        $acknowledged = $data['acknowledged'] ?? false;
        $selectedCustomerId = $data['selected_customer_id'] ?? null;
        $updatePhone = $data['update_phone'] ?? false;

        // Validate required fields
        if (empty($submissionId) || empty($signatureName)) {
            $response['success'] = false;
            $response['message'] = "Missing required fields";
            $response['error'] = "submission_id and signature_name are required";
            return;
        }

        if (!$acknowledged) {
            $response['success'] = false;
            $response['message'] = "Terms must be acknowledged";
            $response['error'] = "TERMS_NOT_ACKNOWLEDGED";
            return;
        }

        // Get submission record
        $sql = "SELECT
            s.submission_id,
            s.consent_form_id,
            s.first_name,
            s.last_name,
            s.phone,
            s.email,
            s.verification_status,
            s.customer_id,
            cf.version,
            cf.title
        FROM consent_submissions s
        JOIN consent_forms cf ON s.consent_form_id = cf.consent_form_id
        WHERE s.submission_id = :id";

        $stmt = $pdo->prepare($sql);
        $stmt->execute([':id' => $submissionId]);
        $submission = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$submission) {
            $response['success'] = false;
            $response['message'] = "Submission not found";
            $response['error'] = "SUBMISSION_NOT_FOUND";
            return;
        }

        // Check if verified
        if ($submission['verification_status'] !== 'verified') {
            $response['success'] = false;
            $response['message'] = "Submission must be verified before finalizing";
            $response['error'] = "NOT_VERIFIED";
            return;
        }

        // Check if already finalized
        $checkSql = "SELECT customer_consent_id FROM customer_consents WHERE submission_id = :id";
        $stmt = $pdo->prepare($checkSql);
        $stmt->execute([':id' => $submissionId]);
        $existing = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($existing) {
            $response['success'] = false;
            $response['message'] = "Consent already finalized";
            $response['error'] = "ALREADY_FINALIZED";
            return;
        }

        $pdo->beginTransaction();

        try {
            $customerId = null;

            // Handle customer matching/creation logic
            if ($selectedCustomerId) {
                // User selected a specific customer from matches
                $customerId = $selectedCustomerId;

                // Update phone if requested
                if ($updatePhone) {
                    $updatePhoneSql = "UPDATE customers SET phone = :phone WHERE customer_id = :id";
                    $stmt = $pdo->prepare($updatePhoneSql);
                    $stmt->execute([
                        ':phone' => $submission['phone'],
                        ':id' => $customerId
                    ]);
                    $response['debug'][] = "Updated phone for customer ID: $customerId";
                }

            } else {
                // Check for exact match
                $matches = findCustomerMatches(
                    $pdo,
                    $submission['first_name'],
                    $submission['last_name'],
                    $submission['phone']
                );

                if (!empty($matches) && $matches[0]['match_type'] === 'exact') {
                    // Exact match found - auto-link
                    $customerId = $matches[0]['customer_id'];
                    $response['debug'][] = "Auto-linked to existing customer ID: $customerId";

                } else {
                    // No exact match - create new customer
                    $createSql = "INSERT INTO customers (
                        first_name,
                        last_name,
                        phone,
                        email,
                        sms_consent,
                        email_consent,
                        is_active,
                        created_at
                    ) VALUES (
                        :firstName,
                        :lastName,
                        :phone,
                        :email,
                        :smsConsent,
                        :emailConsent,
                        1,
                        NOW()
                    )";

                    $stmt = $pdo->prepare($createSql);
                    $stmt->execute([
                        ':firstName' => $submission['first_name'],
                        ':lastName' => $submission['last_name'],
                        ':phone' => $submission['phone'],
                        ':email' => $submission['email'],
                        ':smsConsent' => $confirmUpdates ? 1 : 0,
                        ':emailConsent' => $confirmUpdates ? 1 : 0
                    ]);

                    $customerId = $pdo->lastInsertId();
                    $response['debug'][] = "Created new customer ID: $customerId";
                }
            }

            // Create signature payload
            $signaturePayload = json_encode([
                'signature_name' => $signatureName,
                'confirmed_updates' => $confirmUpdates,
                'acknowledged' => $acknowledged,
                'ip_address' => $_SERVER['REMOTE_ADDR'] ?? 'unknown',
                'user_agent' => $_SERVER['HTTP_USER_AGENT'] ?? ''
            ]);

            // Insert customer_consents record
            $consentSql = "INSERT INTO customer_consents (
                customer_id,
                consent_form_id,
                submission_id,
                signed_at,
                signature_name,
                signature_payload,
                metadata_json,
                created_at
            ) VALUES (
                :customerId,
                :consentFormId,
                :submissionId,
                NOW(),
                :signatureName,
                :signaturePayload,
                :metadata,
                NOW()
            )";

            $metadata = json_encode([
                'consent_version' => $submission['version'],
                'consent_title' => $submission['title']
            ]);

            $stmt = $pdo->prepare($consentSql);
            $stmt->execute([
                ':customerId' => $customerId,
                ':consentFormId' => $submission['consent_form_id'],
                ':submissionId' => $submissionId,
                ':signatureName' => $signatureName,
                ':signaturePayload' => $signaturePayload,
                ':metadata' => $metadata
            ]);

            $customerConsentId = $pdo->lastInsertId();

            // Update customers.latest_consent_id and latest_consent_at
            $updateCustomerSql = "UPDATE customers
                SET latest_consent_id = :consentId,
                    latest_consent_at = NOW()
                WHERE customer_id = :customerId";

            $stmt = $pdo->prepare($updateCustomerSql);
            $stmt->execute([
                ':consentId' => $customerConsentId,
                ':customerId' => $customerId
            ]);

            // Update submission with customer_id
            $updateSubmissionSql = "UPDATE consent_submissions
                SET customer_id = :customerId
                WHERE submission_id = :submissionId";

            $stmt = $pdo->prepare($updateSubmissionSql);
            $stmt->execute([
                ':customerId' => $customerId,
                ':submissionId' => $submissionId
            ]);

            $pdo->commit();

            // Build receipt data
            $receiptData = [
                'customer_id' => $customerId,
                'customer_consent_id' => $customerConsentId,
                'receipt' => [
                    'customer_name' => $submission['first_name'] . ' ' . $submission['last_name'],
                    'signed_at' => date('Y-m-d H:i:s'),
                    'consent_version' => $submission['version'],
                    'verification_channel' => $submission['email'],
                    'signature_name' => $signatureName
                ]
            ];

            $response['success'] = true;
            $response['message'] = "Consent finalized successfully";
            $response['data'] = $receiptData;

        } catch (Exception $e) {
            $pdo->rollBack();
            throw $e;
        }

    } catch (PDOException $e) {
        $response['success'] = false;
        $response['message'] = "Failed to finalize consent";
        $response['error'] = $e->getMessage();
        $response['debug'][] = "❌ PDO Exception: " . $e->getMessage();
    }
}

/**
 * List consent history for a customer
 */
function listConsentHistory(&$response) {
    global $pdo;

    try {
        $customerId = $_GET['customer_id'] ?? '';

        if (empty($customerId)) {
            $response['success'] = false;
            $response['message'] = "Missing required parameter: customer_id";
            return;
        }

        $sql = "SELECT
            cc.customer_consent_id,
            cc.signed_at,
            cc.signature_name,
            cf.title as consent_form_title,
            cf.version as consent_version,
            cs.email as verification_email
        FROM customer_consents cc
        JOIN consent_forms cf ON cc.consent_form_id = cf.consent_form_id
        LEFT JOIN consent_submissions cs ON cc.submission_id = cs.submission_id
        WHERE cc.customer_id = :customerId
        ORDER BY cc.signed_at DESC";

        $stmt = $pdo->prepare($sql);
        $stmt->execute([':customerId' => $customerId]);
        $consents = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $response['success'] = true;
        $response['message'] = "Consent history retrieved successfully";
        $response['data'] = [
            'consents' => $consents
        ];

    } catch (PDOException $e) {
        $response['success'] = false;
        $response['message'] = "Failed to retrieve consent history";
        $response['error'] = $e->getMessage();
        $response['debug'][] = "❌ PDO Exception: " . $e->getMessage();
    }
}

/**
 * Find customer matches (endpoint version)
 * Used by identity step to find existing customers before creating submission
 */
function findCustomerMatchesEndpoint(&$response) {
    global $pdo;

    try {
        // Get POST or GET data
        $json = file_get_contents('php://input');
        $data = json_decode($json, true);

        // Fall back to GET params if POST is empty
        if (!$data) {
            $data = $_GET;
        }

        $firstName = trim($data['first_name'] ?? '');
        $lastName = trim($data['last_name'] ?? '');
        $phone = $data['phone'] ?? '';

        // Validate required fields
        if (empty($firstName) || empty($lastName) || empty($phone)) {
            $response['success'] = false;
            $response['message'] = "Missing required fields";
            $response['error'] = "first_name, last_name, and phone are required";
            return;
        }

        $response['debug'][] = "Finding matches for: $firstName $lastName, $phone";

        // Use the helper function to find matches
        $matches = findCustomerMatches($pdo, $firstName, $lastName, $phone);

        $response['debug'][] = "Found " . count($matches) . " match(es)";

        $response['success'] = true;
        $response['message'] = count($matches) > 0
            ? "Found " . count($matches) . " potential match(es)"
            : "No existing customer matches found";
        $response['data'] = [
            'matches' => $matches,
            'has_exact_match' => (!empty($matches) && $matches[0]['match_type'] === 'exact'),
            'has_suggested_matches' => (!empty($matches) && $matches[0]['match_type'] === 'suggested')
        ];

    } catch (PDOException $e) {
        $response['success'] = false;
        $response['message'] = "Failed to find customer matches";
        $response['error'] = $e->getMessage();
        $response['debug'][] = "❌ PDO Exception: " . $e->getMessage();
    }
}

?>
