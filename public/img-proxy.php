<?php
// Image proxy with caching for FPL player photos
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET');

$url = $_GET['url'] ?? '';

// Only allow premierleague.com resources
if (empty($url) || strpos($url, 'resources.premierleague.com') === false) {
    http_response_code(400);
    exit('Invalid URL');
}

// Create cache directory
$cacheDir = __DIR__ . '/img-cache';
if (!is_dir($cacheDir)) {
    mkdir($cacheDir, 0755, true);
}

// Generate cache filename from URL
$cacheFile = $cacheDir . '/' . md5($url) . '.png';

// Check if cached (cache for 24 hours)
if (file_exists($cacheFile) && (time() - filemtime($cacheFile)) < 86400) {
    header('Content-Type: image/png');
    header('Cache-Control: public, max-age=86400');
    header('X-Cache: HIT');
    readfile($cacheFile);
    exit;
}

// Fetch image with browser-like headers
$ch = curl_init();
curl_setopt_array($ch, [
    CURLOPT_URL => $url,
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_FOLLOWLOCATION => true,
    CURLOPT_TIMEOUT => 15,
    CURLOPT_SSL_VERIFYPEER => true,
    CURLOPT_HTTPHEADER => [
        'User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept: image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
        'Accept-Language: en-US,en;q=0.9',
        'Referer: https://fantasy.premierleague.com/',
        'Sec-Fetch-Dest: image',
        'Sec-Fetch-Mode: no-cors',
        'Sec-Fetch-Site: cross-site'
    ]
]);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$contentType = curl_getinfo($ch, CURLINFO_CONTENT_TYPE);
curl_close($ch);

if ($httpCode !== 200 || empty($response)) {
    http_response_code(502);
    exit('Failed to fetch image');
}

// Save to cache
file_put_contents($cacheFile, $response);

// Output image
header('Content-Type: ' . ($contentType ?: 'image/png'));
header('Cache-Control: public, max-age=86400');
header('X-Cache: MISS');
echo $response;
