<?php
// Clave secreta para firmar el token
$key = "ZelenaJimenez";

// Función para codificar en base64
function base64UrlEncode($data) {
    return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
}

// Función para crear la firma HMAC SHA256
function createSignature($header, $payload, $key) {
    $data = $header . "." . $payload;
    return base64UrlEncode(hash_hmac('sha256', $data, $key, true));
}

// Obtiene la IP del cliente
function getClientIP() {
    if (!empty($_SERVER['HTTP_CLIENT_IP'])) {
        return $_SERVER['HTTP_CLIENT_IP'];
    } elseif (!empty($_SERVER['HTTP_X_FORWARDED_FOR'])) {
        return $_SERVER['HTTP_X_FORWARDED_FOR'];
    } else {
        return $_SERVER['REMOTE_ADDR'];
    }
}

// Obtiene la fecha actual en el formato deseado: año, mes, día, hora, minutos
$date = date('YmdHi');

// Información que deseas incluir en el token
$payload = array(
    "clave" => "115Blink.63",
    "fecha" => $date,
    "ip" => getClientIP()
);

// Codifica el encabezado y el payload en formato JSON y luego en base64
$header = base64UrlEncode(json_encode(array('typ' => 'JWT', 'alg' => 'HS256')));
$payload = base64UrlEncode(json_encode($payload));

// Crea la firma
$signature = createSignature($header, $payload, $key);

// Crea el token JWT
$token = $header . "." . $payload . "." . $signature;

// Devuelve el token generado como JSON
header('Content-Type: application/json');
echo json_encode(array('token' => $token));
?>
