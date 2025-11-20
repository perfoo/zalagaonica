<?php
// Simple contact form handler for zalagaonicazagreb.hr
// - Only handles requests served from zalagaonicazagreb.hr / www.zalagaonicazagreb.hr
// - Implements basic rate limiting per IP
// - Returns JSON responses suitable for AJAX submissions

header('Content-Type: application/json; charset=UTF-8');

$allowedHosts = ['zalagaonicazagreb.hr', 'www.zalagaonicazagreb.hr'];
$host = $_SERVER['HTTP_HOST'] ?? '';
if (!in_array($host, $allowedHosts, true)) {
    http_response_code(403);
    echo json_encode(['success' => false, 'error' => 'Unauthorized host']);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Method not allowed']);
    exit;
}

// Honeypot
if (!empty($_POST['_honey'])) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Invalid request']);
    exit;
}

// Basic rate limiting: max 5 submissions per hour per IP
$ip = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
$rateFile = sys_get_temp_dir() . '/zalagaonica_rate_' . md5($ip);
$now = time();
$window = 3600; // seconds
$maxAttempts = 5;
$attempts = [];

if (is_file($rateFile)) {
    $decoded = json_decode((string)file_get_contents($rateFile), true);
    if (is_array($decoded)) {
        $attempts = array_filter($decoded, static function ($ts) use ($now, $window) {
            return ($now - (int)$ts) < $window;
        });
    }
}

if (count($attempts) >= $maxAttempts) {
    http_response_code(429);
    echo json_encode(['success' => false, 'error' => 'Previše zahtjeva. Pokušajte kasnije.']);
    exit;
}

$attempts[] = $now;
file_put_contents($rateFile, json_encode($attempts), LOCK_EX);

// Required fields (client-side validation is primary, server does minimal checks)
$name    = trim((string)($_POST['name'] ?? ''));
$email   = trim((string)($_POST['email'] ?? ''));
$phone   = trim((string)($_POST['phone'] ?? ''));
$type    = trim((string)($_POST['inquiry-type'] ?? ''));
$details = trim((string)($_POST['device-details'] ?? ''));
$message = trim((string)($_POST['message'] ?? ''));
$privacy = isset($_POST['privacy-policy']);

if ($name === '' || $email === '' || $type === '' || $message === '' || !$privacy) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Nedostaju obavezna polja.']);
    exit;
}

if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Neispravna email adresa.']);
    exit;
}

$typeLabel = 'opcenito';
switch (strtolower($type)) {
    case 'loan':
        $typeLabel = 'zalog';
        break;
    case 'estimate':
        $typeLabel = 'otkup';
        break;
    default:
        $typeLabel = 'opcenito';
        break;
}

$subject = 'Web upit - ' . $typeLabel;

$bodyLines = [
    'Ime i prezime: ' . $name,
    'Email: ' . $email,
    'Telefon: ' . ($phone !== '' ? $phone : 'Nije naveden'),
    'Vrsta upita: ' . $typeLabel,
];

if ($details !== '') {
    $bodyLines[] = 'Detalji o uređaju: ' . $details;
}

$bodyLines[] = '';
$bodyLines[] = 'Poruka:';
$bodyLines[] = $message;

$body = implode("\n", $bodyLines);

$to = 'info@zalagaonicazagreb.hr';
$headers = [
    'From: info@zalagaonicazagreb.hr',
    'Reply-To: ' . $email,
    'X-Mailer: PHP/' . PHP_VERSION,
];

$sent = mail($to, $subject, $body, implode("\r\n", $headers));

if ($sent) {
    echo json_encode(['success' => true, 'message' => 'Poruka je poslana.']);
} else {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Poruku trenutno nije moguće poslati.']);
}
