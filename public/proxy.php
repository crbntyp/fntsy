<?php
// Simple FPL API proxy to bypass CORS
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET');
header('Access-Control-Allow-Headers: Content-Type');

// Handle preflight
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Get the endpoint from query string
$endpoint = $_GET['endpoint'] ?? '';

// Whitelist allowed endpoints
$allowedEndpoints = [
    'bootstrap-static',
    'fixtures',
    'event'
];

// Validate endpoint
$isValid = false;
foreach ($allowedEndpoints as $allowed) {
    if (strpos($endpoint, $allowed) === 0) {
        $isValid = true;
        break;
    }
}

if (!$isValid) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid endpoint']);
    exit();
}

// Build FPL API URL
$url = 'https://fantasy.premierleague.com/api/' . $endpoint;

// Fetch from FPL API
$ch = curl_init();
curl_setopt_array($ch, [
    CURLOPT_URL => $url,
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_FOLLOWLOCATION => true,
    CURLOPT_TIMEOUT => 30,
    CURLOPT_HTTPHEADER => [
        'User-Agent: Mozilla/5.0 (compatible; FPLProxy/1.0)'
    ]
]);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

if ($response === false || $httpCode !== 200) {
    http_response_code(502);
    echo json_encode(['error' => 'Failed to fetch from FPL API']);
    exit();
}

echo $response;
