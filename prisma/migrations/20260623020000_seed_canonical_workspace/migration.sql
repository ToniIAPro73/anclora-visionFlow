INSERT INTO "Workspace" (
  "id",
  "name",
  "slug",
  "createdAt",
  "updatedAt"
)
VALUES (
  'workspace_anclora_internal',
  'Anclora Internal',
  'anclora-internal',
  NOW(),
  NOW()
)
ON CONFLICT ("id") DO NOTHING;