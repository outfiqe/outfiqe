UPDATE "permissions" SET "label" = 'View the sales board', "group" = 'Sales board & opportunities' WHERE "key" = 'pipeline:read';
UPDATE "permissions" SET "label" = 'Edit sales stages', "group" = 'Sales board & opportunities' WHERE "key" = 'pipeline:configure';
UPDATE "permissions" SET "label" = 'View opportunities', "group" = 'Sales board & opportunities' WHERE "key" = 'deals:read';
UPDATE "permissions" SET "label" = 'Edit opportunities', "group" = 'Sales board & opportunities' WHERE "key" = 'deals:write';
UPDATE "permissions" SET "label" = 'Delete opportunities', "group" = 'Sales board & opportunities' WHERE "key" = 'deals:delete';
