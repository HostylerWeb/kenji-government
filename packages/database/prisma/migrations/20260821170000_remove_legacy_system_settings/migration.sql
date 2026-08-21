DELETE FROM "system_settings"
WHERE "key" IN ('tax_rate', 'gateway_fee_rate', 'smtp', 'report_stakeholder_emails');
