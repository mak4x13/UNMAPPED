import axios from "axios";
import { createContext, createElement, useContext, useEffect, useState } from "react";

import { getLocaleLabel, resolveSupportedLocale, resolveSupportedVoiceLocale } from "../config/locales";


export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:7860";

const STORAGE_KEY = "unmapped-profile-state";
const ProfileContext = createContext(null);

const defaultDraft = {
  country_code: "GHA",
  education_level: "secondary",
  years_experience: 5,
  informal_description: "",
  languages: ["English"],
  age: 22,
  ui_locale: "en",
  voice_locale: "en",
  assisted_mode: false,
};


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


export function ProfileProvider({ children }) {
  const stored = loadStoredState();
  const [draft, setDraft] = useState(stored.draft || defaultDraft);
  const [profile, setProfile] = useState(stored.profile || null);
  const [econData, setEconData] = useState(stored.econData || null);
  const [opportunities, setOpportunities] = useState(stored.opportunities || null);
  const [interview, setInterview] = useState(stored.interview || null);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [loadingInterview, setLoadingInterview] = useState(false);
  const [loadingEcon, setLoadingEcon] = useState(false);
  const [loadingOpportunities, setLoadingOpportunities] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        draft,
        profile,
        econData,
        opportunities,
        interview,
      }),
    );
  }, [draft, profile, econData, opportunities, interview]);

  async function loadEconData(countryCode = draft.country_code) {
    setLoadingEcon(true);
    try {
      const response = await axios.get(`${API_BASE_URL}/api/econdata/${countryCode}`);
      setEconData(response.data);
      return response.data;
    } catch (err) {
      setError(err.response?.data?.detail || "Unable to load labor market signals.");
      return null;
    } finally {
      setLoadingEcon(false);
    }
  }

  async function loadOpportunities(countryCode = draft.country_code, iscoUnitCode = profile?.isco_unit_code) {
    setLoadingOpportunities(true);
    try {
      const response = await axios.get(`${API_BASE_URL}/api/opportunities`, {
        params: { country_code: countryCode, isco_unit_code: iscoUnitCode },
      });
      setOpportunities(response.data);
      return response.data;
    } catch (err) {
      setError(err.response?.data?.detail || "Unable to load opportunity panel.");
      return null;
    } finally {
      setLoadingOpportunities(false);
    }
  }

  function buildFollowUpAnswers() {
    const questions = interview?.follow_up_questions || [];
    const answers = interview?.answers || {};
    return questions
      .filter((question) => String(answers[question.question_id] || "").trim())
      .map((question) => ({
        question: question.question,
        answer: String(answers[question.question_id] || "").trim(),
      }));
  }

  async function generateInterview(overrides = {}) {
    const payload = {
      ...draft,
      ...overrides,
      ui_language_label: getLocaleLabel((overrides.ui_locale || draft.ui_locale)),
    };
    setDraft((current) => ({ ...current, ...overrides }));
    setLoadingInterview(true);
    setError(null);
    try {
      const response = await axios.post(`${API_BASE_URL}/api/interview`, payload);
      setInterview((current) => ({
        ...response.data,
        answers: current?.answers || {},
      }));
      return response.data;
    } catch (err) {
      setError(err.response?.data?.detail || "Unable to generate follow-up questions.");
      return null;
    } finally {
      setLoadingInterview(false);
    }
  }

  async function generateProfile(overrides = {}) {
    const payload = {
      ...draft,
      ...overrides,
      ui_language_label: getLocaleLabel(overrides.ui_locale || draft.ui_locale),
      follow_up_answers: buildFollowUpAnswers(),
    };
    setDraft((current) => ({ ...current, ...overrides }));
    setLoadingProfile(true);
    setError(null);
    try {
      const response = await axios.post(`${API_BASE_URL}/api/profile`, payload);
      setProfile(response.data);
      await Promise.all([
        loadEconData(payload.country_code),
        loadOpportunities(payload.country_code, response.data.isco_unit_code),
      ]);
      return response.data;
    } catch (err) {
      setError(err.response?.data?.detail || "Unable to generate skills profile.");
      throw err;
    } finally {
      setLoadingProfile(false);
    }
  }

  function updateDraft(partial) {
    setDraft((current) => ({ ...current, ...partial }));
  }

  function updateInterviewAnswer(questionId, value) {
    setInterview((current) => ({
      ...current,
      answers: {
        ...(current?.answers || {}),
        [questionId]: value,
      },
    }));
  }

  function setCountryCode(countryCode) {
    setDraft((current) => ({
      ...current,
      country_code: countryCode,
      ui_locale: resolveSupportedLocale(countryCode, current.ui_locale),
      voice_locale: resolveSupportedVoiceLocale(countryCode, current.voice_locale),
    }));
    setEconData(null);
    setOpportunities(null);
    setInterview(null);
  }

  function setUiLocale(localeCode) {
    setDraft((current) => ({
      ...current,
      ui_locale: resolveSupportedLocale(current.country_code, localeCode),
    }));
  }

  function setVoiceLocale(localeCode) {
    setDraft((current) => ({
      ...current,
      voice_locale: resolveSupportedVoiceLocale(current.country_code, localeCode),
    }));
  }

  function resetJourney() {
    setDraft(defaultDraft);
    setProfile(null);
    setEconData(null);
    setOpportunities(null);
    setInterview(null);
    setError(null);
  }

  useEffect(() => {
    let active = true;
    async function hydrateCountryContext() {
      const data = await loadEconData(draft.country_code);
      if (!active || !data) {
        return;
      }
      if (profile?.isco_unit_code) {
        await loadOpportunities(draft.country_code, profile.isco_unit_code);
      }
    }
    hydrateCountryContext();
    return () => {
      active = false;
    };
  }, [draft.country_code]);

  return createElement(
    ProfileContext.Provider,
    {
      value: {
        draft,
        profile,
        econData,
        opportunities,
        interview,
        loadingProfile,
        loadingInterview,
        loadingEcon,
        loadingOpportunities,
        error,
        updateDraft,
        updateInterviewAnswer,
        setCountryCode,
        setUiLocale,
        setVoiceLocale,
        generateInterview,
        generateProfile,
        loadEconData,
        loadOpportunities,
        resetJourney,
      },
    },
    children,
  );
}


export function useProfile() {
  const context = useContext(ProfileContext);
  if (!context) {
    throw new Error("useProfile must be used inside ProfileProvider");
  }
  return context;
}
