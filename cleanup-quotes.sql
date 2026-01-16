-- ============================================
-- CLEANUP PREVENTIVI ESISTENTI
-- ============================================
-- ATTENZIONE: Questo script eliminerà TUTTI i preventivi e i dati correlati
-- Eseguire SOLO per test o reset completo del database preventivi

USE u706045794_crm_mismo;

-- Step 1: Conta i record prima della pulizia
SELECT 'BEFORE CLEANUP:' as info;
SELECT COUNT(*) as quote_items_count FROM quote_items;
SELECT COUNT(*) as quote_packages_count FROM quote_packages;
SELECT COUNT(*) as quotes_count FROM quotes;

-- Step 2: Elimina quote items (voci di preventivo)
DELETE FROM quote_items;

-- Step 3: Elimina quote packages (pacchetti)
DELETE FROM quote_packages;

-- Step 4: Elimina quotes (preventivi)
DELETE FROM quotes;

-- Step 5: Reset AUTO_INCREMENT per ricominciare da 1
ALTER TABLE quote_items AUTO_INCREMENT = 1;
ALTER TABLE quote_packages AUTO_INCREMENT = 1;
ALTER TABLE quotes AUTO_INCREMENT = 1;

-- Step 6: Verifica pulizia
SELECT 'AFTER CLEANUP:' as info;
SELECT COUNT(*) as quote_items_count FROM quote_items;
SELECT COUNT(*) as quote_packages_count FROM quote_packages;
SELECT COUNT(*) as quotes_count FROM quotes;

SELECT '✅ CLEANUP COMPLETATO!' as status;
