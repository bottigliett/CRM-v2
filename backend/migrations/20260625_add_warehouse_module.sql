-- Add warehouse module to module_settings if not already present
INSERT INTO module_settings (module_name, is_enabled, label, description, display_order, updated_at)
SELECT 'warehouse', true, 'Magazzino', 'Gestione magazzino e inventario', 17, NOW()
WHERE NOT EXISTS (SELECT 1 FROM module_settings WHERE module_name = 'warehouse');
