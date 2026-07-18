-- Deterministic demo catalog and inventory used by scripts/demo-reset.ps1.
INSERT INTO users (id) VALUES
  ('40000000-0000-4000-8000-000000000001')
ON CONFLICT (id) DO NOTHING;

INSERT INTO parts_catalog (id, slug, name, category, electrical_specs, datasheet_url, source_url, license) VALUES
  ('7e893f29-068e-43e2-9c3c-b9ba2d9ed6db', 'esp32-devkit', 'ESP32 DevKit', 'compute', '{"voltage":"3.3V"}', 'https://www.espressif.com/sites/default/files/documentation/esp32_datasheet_en.pdf', 'https://www.espressif.com/', 'CC BY 4.0'),
  ('5cfc4a97-32ef-45c3-9162-ec2a9094fd85', 'bme280', 'BME280 Sensor', 'sensor', '{"bus":"I2C","voltage":"3.3V"}', 'https://cdn-shop.adafruit.com/datasheets/BST-BME280_DS001-10.pdf', 'https://www.bosch-sensortec.com/', 'CC BY 4.0')
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug,
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  electrical_specs = EXCLUDED.electrical_specs,
  datasheet_url = EXCLUDED.datasheet_url,
  source_url = EXCLUDED.source_url,
  license = EXCLUDED.license;

INSERT INTO user_inventory (id, user_id, part_id, quantity, raw_label) VALUES
  ('50000000-0000-4000-8000-000000000001', '40000000-0000-4000-8000-000000000001', '7e893f29-068e-43e2-9c3c-b9ba2d9ed6db', 1, 'ESP32 DevKit'),
  ('50000000-0000-4000-8000-000000000002', '40000000-0000-4000-8000-000000000001', '5cfc4a97-32ef-45c3-9162-ec2a9094fd85', 1, 'BME280 sensor'),
  ('50000000-0000-4000-8000-000000000003', '40000000-0000-4000-8000-000000000001', NULL, 1, 'Unverified jumper wire kit')
ON CONFLICT (id) DO UPDATE SET
  user_id = EXCLUDED.user_id,
  part_id = EXCLUDED.part_id,
  quantity = EXCLUDED.quantity,
  raw_label = EXCLUDED.raw_label;
