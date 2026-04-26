-- Finalize normalization: drop slab columns from tariffs
ALTER TABLE `tariffs`
  DROP COLUMN `slab1_start`,
  DROP COLUMN `slab1_end`,
  DROP COLUMN `slab1_rate`,
  DROP COLUMN `slab2_start`,
  DROP COLUMN `slab2_end`,
  DROP COLUMN `slab2_rate`,
  DROP COLUMN `slab3_start`,
  DROP COLUMN `slab3_end`,
  DROP COLUMN `slab3_rate`,
  DROP COLUMN `slab4_start`,
  DROP COLUMN `slab4_end`,
  DROP COLUMN `slab4_rate`,
  DROP COLUMN `slab5_start`,
  DROP COLUMN `slab5_end`,
  DROP COLUMN `slab5_rate`;

