#!/usr/bin/env php
<?php
/**
 * Script di test per notifiche toast
 * Crea notifiche di test di tutti i tipi per l'admin Davide
 */

echo "🧪 TEST NOTIFICHE TOAST - Sistema Promemoria\n";
echo "==========================================\n\n";

try {
    // Connessione database
    require_once __DIR__ . '/src/config/database.php';

    $pdo = new PDO(
        "mysql:host=" . DB_HOST . ";dbname=" . DB_NAME . ";charset=utf8mb4",
        DB_USER,
        DB_PASS,
        [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
        ]
    );

    echo "✅ Connesso al database\n\n";

    // Trova l'utente admin Davide
    $stmt = $pdo->prepare("
        SELECT id, email, firstName, lastName
        FROM users
        WHERE email LIKE '%davide%' OR firstName LIKE '%davide%'
        ORDER BY role DESC
        LIMIT 1
    ");
    $stmt->execute();
    $user = $stmt->fetch();

    if (!$user) {
        echo "❌ Utente Davide non trovato\n";
        exit(1);
    }

    echo "👤 Utente trovato:\n";
    echo "   ID: {$user['id']}\n";
    echo "   Nome: {$user['firstName']} {$user['lastName']}\n";
    echo "   Email: {$user['email']}\n\n";

    $userId = $user['id'];

    // Array di notifiche di test
    $testNotifications = [
        [
            'type' => 'TASK_ASSIGNED',
            'title' => '✅ Test: Nuovo Task Assegnato',
            'message' => 'Ti è stato assegnato il task "Completare il testing del sistema notifiche"',
            'link' => '/tasks',
        ],
        [
            'type' => 'EVENT_REMINDER',
            'title' => '🔔 Test: Promemoria Evento',
            'message' => 'Evento "Riunione di test" tra 15 minuti',
            'link' => '/calendar',
        ],
        [
            'type' => 'EVENT_ASSIGNED',
            'title' => '📅 Test: Nuovo Evento Assegnato',
            'message' => 'Sei stato aggiunto all\'evento "Workshop notifiche real-time"',
            'link' => '/calendar',
        ],
        [
            'type' => 'TASK_DUE_SOON',
            'title' => '⏰ Test: Task in Scadenza',
            'message' => 'Il task "Revisione codice" scade tra 2 ore',
            'link' => '/tasks',
        ],
        [
            'type' => 'TASK_OVERDUE',
            'title' => '⚠️ Test: Task Scaduto',
            'message' => 'Il task "Report settimanale" è scaduto da 1 giorno',
            'link' => '/tasks',
        ],
        [
            'type' => 'SYSTEM',
            'title' => 'ℹ️ Test: Notifica Sistema',
            'message' => 'Sistema di notifiche toast funzionante correttamente',
            'link' => null,
        ],
    ];

    echo "📝 Creazione notifiche di test...\n\n";

    $stmt = $pdo->prepare("
        INSERT INTO notifications
        (userId, type, title, message, link, isRead, createdAt)
        VALUES (?, ?, ?, ?, ?, 0, NOW())
    ");

    $count = 0;
    foreach ($testNotifications as $notif) {
        $stmt->execute([
            $userId,
            $notif['type'],
            $notif['title'],
            $notif['message'],
            $notif['link'],
        ]);

        $count++;
        echo "   ✓ [{$count}/6] {$notif['type']}: {$notif['title']}\n";

        // Pausa di 100ms tra le notifiche per avere timestamp leggermente diversi
        usleep(100000);
    }

    echo "\n";
    echo "✅ Completato! Creati {$count} notifiche di test\n\n";

    echo "🧪 COME TESTARE:\n";
    echo "1. Apri il portale con l'utente Davide\n";
    echo "2. Attendi massimo 30 secondi (polling automatico)\n";
    echo "3. Dovresti vedere 6 toast apparire con icone diverse\n";
    echo "4. Clicca su 'Visualizza' per testare la navigazione\n";
    echo "5. Controlla nel centro notifiche che siano marcate come lette\n\n";

    echo "🔍 VERIFICA CONSOLE BROWSER:\n";
    echo "   F12 → Network → Cerca chiamate a /api/notifications\n";
    echo "   F12 → Console → Verifica eventuali errori\n\n";

    // Mostra query per verifica manuale
    echo "📊 Query verifica (esegui in database):\n";
    echo "   SELECT type, title, isRead, createdAt \n";
    echo "   FROM notifications \n";
    echo "   WHERE userId = {$userId} \n";
    echo "   ORDER BY createdAt DESC \n";
    echo "   LIMIT 10;\n\n";

} catch (Exception $e) {
    echo "❌ ERRORE: " . $e->getMessage() . "\n";
    exit(1);
}
