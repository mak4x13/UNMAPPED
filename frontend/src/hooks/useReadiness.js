import axios from "axios";
import { createContext, createElement, useContext, useEffect, useState } from "react";

import { getLocaleLabel } from "../config/locales";
import { API_BASE_URL, useProfile } from "./useProfile";


const STORAGE_KEY = "unmapped-readiness-state";
const ReadinessContext = createContext(null);


function loadStoredState() {
  if (typeof window === "undefined") {
    return {};
  }
  try {
    return JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "{}");
  } catch {
    return {};
  }
}


export function ReadinessProvider({ children }) {
  const stored = loadStoredState();
  const { draft, profile } = useProfile();
  const [readiness, setReadiness] = useState(stored.readiness || null);
  const [loadingReadiness, setLoadingReadiness] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ readiness }));
  }, [readiness]);

  useEffect(() => {
    if (readiness && (readiness.country_code !== draft.country_code || readiness.ui_locale !== draft.ui_locale)) {
      setReadiness(null);
    }
  }, [draft.country_code, draft.ui_locale]);

  async function generateReadiness(countryCode = draft.country_code) {
    if (!profile) {
      return null;
    }
    setLoadingReadiness(true);
    setError(null);
    try {
      const response = await axios.post(`${API_BASE_URL}/api/readiness`, {
        isco_unit_code: profile.isco_unit_code,
        country_code: countryCode,
        esco_skills: profile.esco_skills,
        informal_skills_extracted: profile.informal_skills_extracted,
        ui_locale: draft.ui_locale,
        ui_language_label: getLocaleLabel(draft.ui_locale),
      });
      const data = { ...response.data, country_code: countryCode, ui_locale: draft.ui_locale };
      setReadiness(data);
      return data;
    } catch (err) {
      setError(err.response?.data?.detail || "Unable to calculate AI readiness.");
      return null;
    } finally {
      setLoadingReadiness(false);
    }
  }

  return createElement(
    ReadinessContext.Provider,
    {
      value: {
        readiness,
        loadingReadiness,
        error,
        generateReadiness,
        clearReadiness: () => setReadiness(null),
      },
    },
    children,
  );
}


export function useReadiness() {
  const context = useContext(ReadinessContext);
  if (!context) {
    throw new Error("useReadiness must be used inside ReadinessProvider");
  }
  return context;
}
