import {
  THEME_MODES,
  ThemeMode,
} from "@/entrypoints/shared/constants";
import { SettingsUtils } from "@/entrypoints/shared/settingsUtils";
import {
  applyTheme,
  normalizeThemeMode,
} from "@/entrypoints/shared/theme";
import "./style.less";
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.tsx";

async function bootstrap() {
  let initialThemeMode: ThemeMode = THEME_MODES.SYSTEM;

  try {
    const settings = await SettingsUtils.getSettings();
    initialThemeMode = normalizeThemeMode(settings.theme);
  } finally {
    applyTheme(document.documentElement, initialThemeMode);
  }

  ReactDOM.createRoot(document.getElementById("root")!).render(
    <React.StrictMode>
      <App initialThemeMode={initialThemeMode} />
    </React.StrictMode>
  );
}

void bootstrap();
