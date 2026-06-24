-- Script SQL per testare il sistema di notifiche toast
-- Crea una notifica EVENT_ASSIGNED per l'utente admin

-- TROVA L'ID DELL'UTENTE ADMIN
SELECT id, firstName, lastName, email, role FROM users WHERE role = 'ADMIN' ORDER BY id LIMIT 1;

-- INSERISCI UNA NOTIFICA DI TEST (sostituisci <USER_ID> con l'ID trovato sopra)
INSERT INTO notifications (userId, type, title, message, link, isRead, createdAt)
VALUES
  (<USER_ID>, 'EVENT_ASSIGNED', '📅 Test: Nuovo Evento', 'Sei stato aggiunto all\'evento "Riunione Test"', '/calendar', 0, NOW());

-- VERIFICA CHE LA NOTIFICA SIA STATA CREATA
SELECT id, userId, type, title, message, isRead, createdAt
FROM notifications
WHERE userId = <USER_ID>
ORDER BY createdAt DESC
LIMIT 5;

-- ISTRUZIONI:
-- 1. Esegui la prima SELECT per trovare l'ID dell'admin
-- 2. Sostituisci <USER_ID> nella INSERT con l'ID trovato
-- 3. Esegui la INSERT
-- 4. Apri il portale come admin
-- 5. Entro 30 secondi dovresti vedere un toast con l'icona 📅
-- 6. Clicca "Visualizza" per testare la navigazione
