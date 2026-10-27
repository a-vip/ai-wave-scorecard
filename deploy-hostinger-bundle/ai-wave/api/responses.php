<?php
/**
 * AI Wave Scorecard Backend API (Native Hostinger / PHP Engine)
 *
 * Handles:
 *   POST api/responses -> Honeypot check, rate limiting, validation, and insertion into database.
 *   GET  api/responses -> Authentication (Bearer token or logged-in WP Admin) and record delivery.
 */

// Strict error handling (don't output PHP notices into JSON)
error_reporting(0);
ini_set('display_errors', '0');

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('X-Content-Type-Options: nosniff');

// Helper to respond with JSON and HTTP code
function json_response($data, $code = 200) {
    http_response_code($code);
    echo json_encode($data, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    exit;
}

// 1. Try to load WordPress environment
$wp_loaded = false;
$possible_wp_paths = [
    dirname(__DIR__, 2) . '/wp-load.php',
    dirname(__DIR__, 1) . '/wp-load.php',
    (isset($_SERVER['DOCUMENT_ROOT']) ? rtrim($_SERVER['DOCUMENT_ROOT'], '/') . '/wp-load.php' : '')
];

foreach ($possible_wp_paths as $p) {
    if ($p && file_exists($p)) {
        require_once $p;
        $wp_loaded = true;
        break;
    }
}

// 2. Secret Owner Token (for frontend /?owner unlock)
// Can be set in wp-config.php via define('AIWAVE_ADMIN_TOKEN', 'your-key');
$expected_token = defined('AIWAVE_ADMIN_TOKEN') ? AIWAVE_ADMIN_TOKEN : getenv('ADMIN_TOKEN');
if (!$expected_token) {
    $expected_token = 'aiwave-owner-key-2026';
}

// 3. Client IP Extraction
$client_ip = '127.0.0.1';
if (!empty($_SERVER['HTTP_CF_CONNECTING_IP'])) {
    $client_ip = $_SERVER['HTTP_CF_CONNECTING_IP'];
} elseif (!empty($_SERVER['HTTP_X_FORWARDED_FOR'])) {
    $client_ip = trim(explode(',', $_SERVER['HTTP_X_FORWARDED_FOR'])[0]);
} elseif (!empty($_SERVER['REMOTE_ADDR'])) {
    $client_ip = $_SERVER['REMOTE_ADDR'];
}

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

/* =========================================================================
   POST: SAVE RESPONDENT SCORECARD
   ========================================================================= */
if ($method === 'POST') {
    // Read raw input
    $raw = file_get_contents('php://input');
    if (strlen($raw) > 65536) {
        json_response(['error' => 'Payload too large'], 413);
    }

    $body = json_decode($raw, true);
    if (!is_array($body)) {
        json_response(['error' => 'Invalid JSON input'], 400);
    }

    // Honeypot check: Bots fill this out; real users always have website === ""
    if (!empty($body['website'])) {
        json_response(['ok' => true]); // Silent success for bots
    }

    // Input Validation
    $name = trim((string)($body['name'] ?? ''));
    $email = strtolower(trim((string)($body['email'] ?? '')));
    $country = trim((string)($body['country'] ?? ''));
    $phone = trim((string)($body['phone'] ?? ''));
    $interest = trim((string)($body['interest'] ?? ''));
    $consent = !empty($body['consent']);

    if (empty($name)) {
        json_response(['error' => 'Name is required'], 400);
    }
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        json_response(['error' => 'A valid email is required'], 400);
    }
    if (empty($country)) {
        json_response(['error' => 'Country is required'], 400);
    }
    if (!$consent) {
        json_response(['error' => 'Consent is required'], 400);
    }

    $version = in_array($body['version'] ?? '', ['quick', 'deep', 'full'], true) ? $body['version'] : 'quick';
    $zone = in_array($body['zone'] ?? '', ['drowning', 'wading', 'paddling', 'riding'], true) ? $body['zone'] : 'wading';
    $zone2 = in_array($body['zone2'] ?? '', ['drowning', 'wading', 'paddling', 'riding'], true) ? $body['zone2'] : '';
    $level = max(1, min(5, (int)($body['level'] ?? 1)));
    $tier = in_array($body['tier'] ?? '', ['Foundational', 'Intermediate', 'Expert'], true) ? $body['tier'] : 'Foundational';
    $x = max(0, min(100, (int)($body['x'] ?? 50)));
    $y = max(0, min(100, (int)($body['y'] ?? 50)));
    $readiness = isset($body['readiness']) && $body['readiness'] !== null ? max(0, min(100, (int)$body['readiness'])) : null;
    $ts = isset($body['ts']) ? (int)$body['ts'] : (int)(microtime(true) * 1000);

    $pct = json_encode($body['pct'] ?? [], JSON_UNESCAPED_SLASHES);
    $friction = json_encode($body['friction'] ?? [], JSON_UNESCAPED_SLASHES);
    $answers = json_encode($body['answers'] ?? [], JSON_UNESCAPED_SLASHES);
    $notes = json_encode($body['notes'] ?? [], JSON_UNESCAPED_SLASHES);
    $ua = substr($_SERVER['HTTP_USER_AGENT'] ?? '', 0, 300);

    // Save to WordPress Database if available
    if ($wp_loaded) {
        global $wpdb;
        $table_name = $wpdb->prefix . 'aiwave_responses';

        // Auto-provision table if needed
        if (function_exists('aiwave_ensure_table')) {
            aiwave_ensure_table();
        }

        $inserted = $wpdb->insert(
            $table_name,
            [
                'ts'         => $ts,
                'version'    => $version,
                'zone'       => $zone,
                'zone2'      => $zone2,
                'level'      => $level,
                'tier'       => $tier,
                'x'          => $x,
                'y'          => $y,
                'readiness'  => $readiness,
                'pct'        => $pct,
                'friction'   => $friction,
                'answers'    => $answers,
                'notes'      => $notes,
                'name'       => $name,
                'email'      => $email,
                'country'    => $country,
                'phone'      => $phone,
                'interest'   => $interest,
                'consent'    => 1,
                'user_agent' => $ua
            ],
            [
                '%d', '%s', '%s', '%s', '%d', '%s', '%d', '%d',
                $readiness !== null ? '%d' : null,
                '%s', '%s', '%s', '%s', '%s', '%s', '%s', '%s', '%s', '%d', '%s'
            ]
        );

        if ($inserted !== false) {
            $new_id = $wpdb->insert_id;

            // Trigger WordPress Hook for Automations (ConvertKit, notifications, webhooks)
            do_action('aiwave_new_response', $new_id, [
                'name'     => $name,
                'email'    => $email,
                'zone'     => $zone,
                'level'    => $level,
                'interest' => $interest
            ]);

            json_response(['ok' => true, 'id' => $new_id]);
        }
    }

    // Fallback: local SQLite or JSON storage if outside WordPress
    $storage_file = dirname(__DIR__) . '/data/responses-local.json';
    @mkdir(dirname($storage_file), 0755, true);
    $existing = [];
    if (file_exists($storage_file)) {
        $existing = json_decode(file_get_contents($storage_file), true) ?: [];
    }
    $record = [
        'id'         => count($existing) + 1,
        'created_at' => gmdate('Y-m-d H:i:s'),
        'ts'         => $ts,
        'version'    => $version,
        'zone'       => $zone,
        'zone2'      => $zone2,
        'level'      => $level,
        'tier'       => $tier,
        'x'          => $x,
        'y'          => $y,
        'readiness'  => $readiness,
        'pct'        => json_decode($pct, true),
        'friction'   => json_decode($friction, true),
        'answers'    => json_decode($answers, true),
        'notes'      => json_decode($notes, true),
        'name'       => $name,
        'email'      => $email,
        'country'    => $country,
        'phone'      => $phone,
        'interest'   => $interest,
        'consent'    => true
    ];
    $existing[] = $record;
    file_put_contents($storage_file, json_encode($existing, JSON_PRETTY_PRINT));

    json_response(['ok' => true]);
}

/* =========================================================================
   GET: LIST RESPONSES (OWNER ACCESS)
   ========================================================================= */
if ($method === 'GET') {
    $auth_header = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
    if (empty($auth_header) && function_exists('apache_request_headers')) {
        $headers = apache_request_headers();
        $auth_header = $headers['Authorization'] ?? $headers['authorization'] ?? '';
    }

    $token_given = preg_replace('/^Bearer\s+/i', '', trim($auth_header));
    $is_authorized = false;

    // Check 1: Bearer token match
    if (!empty($token_given) && hash_equals($expected_token, $token_given)) {
        $is_authorized = true;
    }

    // Check 2: If logged in as WordPress Administrator
    if (!$is_authorized && $wp_loaded && function_exists('current_user_can') && current_user_can('manage_options')) {
        $is_authorized = true;
    }

    if (!$is_authorized) {
        json_response(['error' => 'Unauthorized'], 401);
    }

    // Fetch records
    if ($wp_loaded) {
        global $wpdb;
        $table_name = $wpdb->prefix . 'aiwave_responses';
        if (function_exists('aiwave_ensure_table')) {
            aiwave_ensure_table();
        }
        $rows = $wpdb->get_results("SELECT * FROM {$table_name} ORDER BY created_at DESC LIMIT 2000", ARRAY_A);
        
        $records = [];
        foreach ($rows as $r) {
            $records[] = [
                'id'         => (int)$r['id'],
                'created_at' => $r['created_at'],
                'ts'         => (int)$r['ts'],
                'version'    => $r['version'],
                'zone'       => $r['zone'],
                'zone2'      => $r['zone2'],
                'level'      => (int)$r['level'],
                'tier'       => $r['tier'],
                'x'          => (int)$r['x'],
                'y'          => (int)$r['y'],
                'readiness'  => $r['readiness'] !== null ? (int)$r['readiness'] : null,
                'pct'        => json_decode($r['pct'] ?: '{}', true),
                'friction'   => json_decode($r['friction'] ?: '[]', true),
                'answers'    => json_decode($r['answers'] ?: '{}', true),
                'notes'      => json_decode($r['notes'] ?: '{}', true),
                'name'       => $r['name'],
                'email'      => $r['email'],
                'country'    => $r['country'],
                'phone'      => $r['phone'],
                'interest'   => $r['interest'],
                'consent'    => (bool)$r['consent'],
            ];
        }
        json_response(['records' => $records]);
    }

    // Fallback file storage
    $storage_file = dirname(__DIR__) . '/data/responses-local.json';
    if (file_exists($storage_file)) {
        $records = json_decode(file_get_contents($storage_file), true) ?: [];
        json_response(['records' => array_reverse($records)]);
    }

    json_response(['records' => []]);
}

json_response(['error' => 'Method not allowed'], 405);
