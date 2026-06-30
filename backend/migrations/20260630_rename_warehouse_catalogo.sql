-- Rename warehouse module label from Magazzino to Catalogo
UPDATE module_settings SET label = 'Catalogo' WHERE module_name = 'warehouse';
