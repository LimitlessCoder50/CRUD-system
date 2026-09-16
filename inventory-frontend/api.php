<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }

$host = getenv('DB_HOST') ?: '127.0.0.1';
$dbName = getenv('DB_NAME') ?: 'inventory_db';
$user = getenv('DB_USER') ?: 'root';
$password = getenv('DB_PASSWORD') ?: '';

try {
    $pdo = new PDO("mysql:host=$host;dbname=$dbName;charset=utf8mb4", $user, $password, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false,
    ]);
} catch (PDOException $error) {
    respond(['error' => 'Database connection failed. Check the PHP database settings.'], 500);
}

$method = $_SERVER['REQUEST_METHOD'];
$id = filter_input(INPUT_GET, 'id', FILTER_VALIDATE_INT);

try {
    if ($method === 'GET') {
        $query = trim((string) ($_GET['search'] ?? ''));
        $category = trim((string) ($_GET['category'] ?? ''));
        $sql = 'SELECT id, name, category, quantity, price, created_at, updated_at FROM products WHERE 1=1';
        $parameters = [];
        if ($query !== '') { $sql .= ' AND (name LIKE :search OR category LIKE :search)'; $parameters['search'] = "%$query%"; }
        if ($category !== '') { $sql .= ' AND category = :category'; $parameters['category'] = $category; }
        $sql .= ' ORDER BY updated_at DESC, id DESC';
        $statement = $pdo->prepare($sql); $statement->execute($parameters);
        respond($statement->fetchAll());
    }

    if ($method === 'POST' || $method === 'PUT') {
        $input = json_decode(file_get_contents('php://input'), true) ?: [];
        $name = trim((string) ($input['name'] ?? ''));
        $category = trim((string) ($input['category'] ?? ''));
        $quantity = filter_var($input['quantity'] ?? null, FILTER_VALIDATE_INT, ['options' => ['min_range' => 0]]);
        $price = filter_var($input['price'] ?? null, FILTER_VALIDATE_FLOAT);
        if ($name === '' || $category === '' || $quantity === false || $price === false || $price < 0) { respond(['error' => 'Name, category, quantity, and a non-negative price are required.'], 422); }
        if ($method === 'POST') {
            $statement = $pdo->prepare('INSERT INTO products (name, category, quantity, price) VALUES (:name, :category, :quantity, :price)');
            $statement->execute(['name' => $name, 'category' => $category, 'quantity' => $quantity, 'price' => $price]);
            respond(['id' => (int) $pdo->lastInsertId()], 201);
        }
        if (!$id) { respond(['error' => 'A product id is required.'], 400); }
        $statement = $pdo->prepare('UPDATE products SET name = :name, category = :category, quantity = :quantity, price = :price WHERE id = :id');
        $statement->execute(['name' => $name, 'category' => $category, 'quantity' => $quantity, 'price' => $price, 'id' => $id]);
        respond(['updated' => $statement->rowCount()]);
    }

    if ($method === 'DELETE') {
        if (!$id) { respond(['error' => 'A product id is required.'], 400); }
        $statement = $pdo->prepare('DELETE FROM products WHERE id = :id');
        $statement->execute(['id' => $id]);
        respond(['deleted' => $statement->rowCount()]);
    }
    respond(['error' => 'Method not allowed.'], 405);
} catch (PDOException $error) { respond(['error' => 'The database operation failed.'], 500); }

function respond(array $payload, int $status = 200): never { http_response_code($status); echo json_encode($payload); exit; }
