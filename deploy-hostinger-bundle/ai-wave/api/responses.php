<?php
/**
 * AI Wave / MetaLearning AI Scorecard Backend API (Native Hostinger / WordPress Engine)
 *
 * Handles:
 *   GET  api/responses.php?config=1 -> Public editable copy, brand, cohort & offer settings from WP Admin.
 *   POST api/responses.php          -> Honeypot check, validation, DB insertion, WP Leads CPT sync, offer intent tracking, and email alerts.
 *   GET  api/responses.php          -> Authentication (Bearer token or logged-in WP Admin) and record delivery.
 */

error_reporting(0);
ini_set('display_errors', '0');

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('X-Content-Type-Options: nosniff');

function json_response($data, $code = 200) {
    http_response_code($code);
    echo json_encode($data, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    exit;
}

// 1. Load WordPress environment
$wp_loaded = false;
$possible_wp_paths = [
    dirname(__DIR__, 6) . '/wp-load.php',
    dirname(__DIR__, 5) . '/wp-load.php',
    dirname(__DIR__, 2) . '/wp-load.php',
    dirname(__DIR__, 1) . '/wp-load.php',
    (isset($_SERVER['DOCUMENT_ROOT']) ? rtrim($_SERVER['DOCUMENT_ROOT'], '/\\') . '/wp-load.php' : '')
];

foreach ($possible_wp_paths as $p) {
    if ($p && file_exists($p)) {
        require_once $p;
        $wp_loaded = true;
        break;
    }
}

$expected_token = defined('AIWAVE_ADMIN_TOKEN') ? AIWAVE_ADMIN_TOKEN : getenv('ADMIN_TOKEN');
if (!$expected_token) {
    $expected_token = 'aiwave-owner-key-2026';
}

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

/* =========================================================================
   GET ?config=1: RETURN LIVE EDITABLE COPY & OFFER SETTINGS
   ========================================================================= */
if ($method === 'GET' && !empty($_GET['config'])) {
    if ($wp_loaded && function_exists('aiwave_get_settings')) {
        json_response(['ok' => true, 'config' => aiwave_get_settings()]);
    }
    json_response(['ok' => true, 'config' => []]);
}

/* =========================================================================
   POST: SAVE RESPONDENT SCORECARD, BRIEFING OPT-IN, OR OFFER CLICK
   ========================================================================= */
if ($method === 'POST') {
    $raw = file_get_contents('php://input');
    if (strlen($raw) > 65536) {
        json_response(['error' => 'Payload too large'], 413);
    }

    $body = json_decode($raw, true);
    if (!is_array($body)) {
        json_response(['error' => 'Invalid JSON input'], 400);
    }

    // Honeypot check
    if (!empty($body['website'])) {
        json_response(['ok' => true]);
    }

    $action = trim((string)($body['action'] ?? 'save_scorecard'));

    // Action A: Track Offer Tier Click from Results or Home Page
    if ($action === 'offer_click') {
        $offer_key = preg_replace('/[^a-z0-9_-]/i', '', (string)($body['offer'] ?? ''));
        $email = strtolower(trim((string)($body['email'] ?? '')));
        if ($wp_loaded && !empty($offer_key)) {
            global $wpdb;
            $table_name = $wpdb->prefix . 'aiwave_responses';
            if (function_exists('aiwave_ensure_table')) {
                aiwave_ensure_table();
            }
            if (!empty($email) && filter_var($email, FILTER_VALIDATE_EMAIL)) {
                $latest_id = $wpdb->get_var($wpdb->prepare(
                    "SELECT id FROM {$table_name} WHERE email = %s ORDER BY id DESC LIMIT 1",
                    $email
                ));
                if ($latest_id) {
                    $wpdb->update(
                        $table_name,
                        ['offer_intent' => $offer_key],
                        ['id' => (int)$latest_id],
                        ['%s'],
                        ['%d']
                    );
                }
            }
        }
        json_response(['ok' => true, 'offer' => $offer_key]);
    }

    // Action B: Save Scorecard or Quick Briefing Signup
    $name = trim((string)($body['name'] ?? ''));
    $email = strtolower(trim((string)($body['email'] ?? '')));
    $country = trim((string)($body['country'] ?? 'Not specified'));
    $phone = trim((string)($body['phone'] ?? ''));
    $interest = trim((string)($body['interest'] ?? ''));
    $offer_intent = preg_replace('/[^a-z0-9_-]/i', '', (string)($body['offer_intent'] ?? ''));
    $consent = !empty($body['consent']);

    if (empty($name)) {
        json_response(['error' => 'Name is required'], 400);
    }
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        json_response(['error' => 'A valid email is required'], 400);
    }
    if (empty($country)) {
        $country = 'Not specified';
    }
    if (!$consent) {
        json_response(['error' => 'Consent is required'], 400);
    }

    $version = in_array($body['version'] ?? '', ['quick', 'deep', 'full', 'briefing'], true) ? $body['version'] : 'quick';
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

    if ($wp_loaded) {
        global $wpdb;
        $table_name = $wpdb->prefix . 'aiwave_responses';

        if (function_exists('aiwave_ensure_table')) {
            aiwave_ensure_table();
        }

        $data_row = [
            'ts'           => $ts,
            'version'      => $version,
            'zone'         => $zone,
            'zone2'        => $zone2,
            'level'        => $level,
            'tier'         => $tier,
            'x'            => $x,
            'y'            => $y,
            'readiness'    => $readiness,
            'pct'          => $pct,
            'friction'     => $friction,
            'answers'      => $answers,
            'notes'        => $notes,
            'name'         => $name,
            'email'        => $email,
            'country'      => $country,
            'phone'        => $phone,
            'interest'     => $interest,
            'offer_intent' => $offer_intent,
            'lead_status'  => 'new',
            'consent'      => 1,
            'user_agent'   => $ua
        ];

        $formats = [
            '%d', '%s', '%s', '%s', '%d', '%s', '%d', '%d',
            $readiness !== null ? '%d' : null,
            '%s', '%s', '%s', '%s', '%s', '%s', '%s', '%s', '%s', '%s', '%s', '%d', '%s'
        ];

        $inserted = $wpdb->insert($table_name, $data_row, $formats);

        // Fallback if offer_intent / lead_status columns haven't migrated yet
        if ($inserted === false) {
            unset($data_row['offer_intent'], $data_row['lead_status']);
            $formats_fallback = [
                '%d', '%s', '%s', '%s', '%d', '%s', '%d', '%d',
                $readiness !== null ? '%d' : null,
                '%s', '%s', '%s', '%s', '%s', '%s', '%s', '%s', '%s', '%d', '%s'
            ];
            $inserted = $wpdb->insert($table_name, $data_row, $formats_fallback);
        }

        // Also sync into global WordPress Leads CPT (avi_lead)
        if (function_exists('avi_lead_exists') && !avi_lead_exists($email)) {
            $lead_post_id = wp_insert_post([
                'post_title'  => $email,
                'post_type'   => 'avi_lead',
                'post_status' => 'publish',
            ]);
            if ($lead_post_id && !is_wp_error($lead_post_id)) {
                update_post_meta($lead_post_id, 'lead_name', $name);
                update_post_meta($lead_post_id, 'lead_source', 'ai-wave-scorecard');
                update_post_meta($lead_post_id, 'lead_zone', $zone);
                update_post_meta($lead_post_id, 'lead_offer_intent', $offer_intent);
            }
        }
        if (defined('DAY_IN_SECONDS')) {
            @setcookie('avi_lead_unlocked', '1', time() + (30 * DAY_IN_SECONDS), COOKIEPATH, COOKIE_DOMAIN, is_ssl(), true);
        }

        if ($inserted !== false) {
            $new_id = $wpdb->insert_id;

            do_action('aiwave_new_response', $new_id, [
                'name'         => $name,
                'email'        => $email,
                'country'      => $country,
                'phone'        => $phone,
                'zone'         => $zone,
                'level'        => $level,
                'tier'         => $tier,
                'x'            => $x,
                'y'            => $y,
                'readiness'    => $readiness,
                'version'      => $version,
                'interest'     => $interest,
                'offer_intent' => $offer_intent
            ]);

            json_response(['ok' => true, 'id' => $new_id]);
        }
    }

    // Fallback file storage
    $storage_file = dirname(__DIR__) . '/data/responses-local.json';
    @mkdir(dirname($storage_file), 0755, true);
    $existing = [];
    if (file_exists($storage_file)) {
        $existing = json_decode(file_get_contents($storage_file), true) ?: [];
    }
    $record = [
        'id'           => count($existing) + 1,
        'created_at'   => gmdate('Y-m-d H:i:s'),
        'ts'           => $ts,
        'version'      => $version,
        'zone'         => $zone,
        'zone2'        => $zone2,
        'level'        => $level,
        'tier'         => $tier,
        'x'            => $x,
        'y'            => $y,
        'readiness'    => $readiness,
        'pct'          => json_decode($pct, true),
        'friction'     => json_decode($friction, true),
        'answers'      => json_decode($answers, true),
        'notes'        => json_decode($notes, true),
        'name'         => $name,
        'email'        => $email,
        'country'      => $country,
        'phone'        => $phone,
        'interest'     => $interest,
        'offer_intent' => $offer_intent,
        'consent'      => true
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

    if (!empty($token_given) && hash_equals($expected_token, $token_given)) {
        $is_authorized = true;
    }

    if (!$is_authorized && $wp_loaded && function_exists('current_user_can') && current_user_can('manage_options')) {
        $is_authorized = true;
    }

    if (!$is_authorized) {
        json_response(['error' => 'Unauthorized'], 401);
    }

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
                'id'           => (int)$r['id'],
                'created_at'   => $r['created_at'],
                'ts'           => (int)$r['ts'],
                'version'      => $r['version'],
                'zone'         => $r['zone'],
                'zone2'        => $r['zone2'],
                'level'        => (int)$r['level'],
                'tier'         => $r['tier'],
                'x'            => (int)$r['x'],
                'y'            => (int)$r['y'],
                'readiness'    => $r['readiness'] !== null ? (int)$r['readiness'] : null,
                'pct'          => json_decode($r['pct'] ?: '{}', true),
                'friction'     => json_decode($r['friction'] ?: '[]', true),
                'answers'      => json_decode($r['answers'] ?: '{}', true),
                'notes'        => json_decode($r['notes'] ?: '{}', true),
                'name'         => $r['name'],
                'email'        => $r['email'],
                'country'      => $r['country'],
                'phone'        => $r['phone'],
                'interest'     => $r['interest'],
                'offer_intent' => $r['offer_intent'] ?? '',
                'lead_status'  => $r['lead_status'] ?? 'new',
                'consent'      => (bool)$r['consent'],
            ];
        }
        json_response(['records' => $records]);
    }

    $storage_file = dirname(__DIR__) . '/data/responses-local.json';
    if (file_exists($storage_file)) {
        $records = json_decode(file_get_contents($storage_file), true) ?: [];
        json_response(['records' => array_reverse($records)]);
    }

    json_response(['records' => []]);
}

json_response(['error' => 'Method not allowed'], 405);
