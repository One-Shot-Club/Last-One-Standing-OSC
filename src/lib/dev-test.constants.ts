/** Fixed local-dev credentials — safe to commit; only used when import.meta.env.DEV. */
export const DEV_TEST = {
  email: "dev@oneshotclub.test",
  password: "DevTest123!",
  clubName: "Test Rovers FC",
  clubSlug: "test-rovers-fc",
  adminName: "Dev Admin",
  county: "Galway",
  clubType: "GAA",
} as const;

export const DEV_PREVIEW_USER_ID = "00000000-0000-4000-8000-000000000001";
export const DEV_PREVIEW_TENANT_ID = "00000000-0000-4000-8000-000000000002";
export const DEV_PREVIEW_COMP_ID = "00000000-0000-4000-8000-000000000003";
export const DEV_PREVIEW_COMP_SLUG = "last-man-standing";

export const DEV_PREVIEW_COOKIE = "osc_dev_preview";
