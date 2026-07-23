import "@testing-library/jest-dom/vitest";
import { initI18n } from "@/i18n/config";

// Silence i18next's one-time "Locize" promo console.info (not a warning, but
// noise in otherwise-pristine test output). Officially supported via this
// env var — scoped to the test process only, no app code touched.
process.env.I18NEXT_NO_SUPPORT_NOTICE = "true";

initI18n();
