import { startTransition, useState } from "react";
import { useNavigate } from "react-router-dom";

import { COUNTRIES } from "../config/countries";
import { getCopy, getSpeechRecognitionTag } from "../config/locales";
import { useProfile } from "../hooks/useProfile";
import VoiceInputButton from "./VoiceInputButton";

const LANGUAGE_SUGGESTIONS = {
  GHA: ["English", "Twi", "Ga", "Ewe"],
  PAK: ["Urdu", "English", "Punjabi", "Sindhi", "Pashto"],
  KEN: ["English", "Swahili", "Kikuyu", "Luo"],
  BGD: ["Bangla", "English", "Chittagonian"],
};

function appendTranscript(currentValue, transcript) {
  const nextValue = transcript.trim();
  if (!nextValue) {
    return currentValue;
  }
  if (!currentValue.trim()) {
    return nextValue;
  }
  return `${currentValue.trim()} ${nextValue}`;
}

function getProgressWidth(step, followUpIndex, totalQuestions) {
  const totalScreens = 7 + totalQuestions;
  const currentScreen =
    step <= 5
      ? step
      : step === 6
        ? 6 + followUpIndex
        : 6 + totalQuestions;
  return ((currentScreen + 1) / totalScreens) * 100;
}

function hasValidAge(value) {
  const age = Number(value);
  return Number.isFinite(age) && age >= 15 && age <= 99;
}

function hasValidExperience(value) {
  const years = Number(value);
  return Number.isFinite(years) && years >= 0 && years <= 60;
}

function canContinue(step, draft, currentQuestion, currentAnswer) {
  if (step === 0) {
    return Boolean(draft.country_code);
  }
  if (step === 1) {
    return Boolean(draft.education_level);
  }
  if (step === 2) {
    return hasValidAge(draft.age);
  }
  if (step === 3) {
    return hasValidExperience(draft.years_experience);
  }
  if (step === 4) {
    return draft.languages.length > 0;
  }
  if (step === 5) {
    return draft.informal_description.trim().length >= 20;
  }
  if (step === 6 && currentQuestion) {
    return currentAnswer.trim().length > 0;
  }
  return true;
}

function canGenerateProfile(draft, questions, answers) {
  if (
    !draft.country_code ||
    !draft.education_level ||
    !hasValidAge(draft.age) ||
    !hasValidExperience(draft.years_experience) ||
    !draft.languages.length ||
    draft.informal_description.trim().length < 20
  ) {
    return false;
  }

  return questions.every((question) => String(answers?.[question.question_id] || "").trim().length > 0);
}

function SummaryAnswerRow({ label, value, children }) {
  return (
    <div className="summary-row">
      <span className="summary-label">{label}</span>
      {children ? <div className="summary-edit">{children}</div> : <div className="summary-value">{value}</div>}
    </div>
  );
}

function EducationOptions(copy) {
  return [
    ["none", copy.noFormalCredential],
    ["primary", copy.primaryLabel],
    ["secondary", copy.secondaryLabel],
    ["technical", copy.technicalVocational],
    ["tertiary", copy.bachelorsDegree],
    ["postgraduate", copy.postgraduateLabel],
  ];
}

export default function OnboardingFlow() {
  const navigate = useNavigate();
  const {
    draft,
    interview,
    loadingInterview,
    updateDraft,
    updateInterviewAnswer,
    setCountryCode,
    generateInterview,
    generateProfile,
    loadingProfile,
    error,
  } = useProfile();

  const copy = getCopy(draft.ui_locale);
  const [step, setStep] = useState(0);
  const [followUpIndex, setFollowUpIndex] = useState(0);
  const [languageInput, setLanguageInput] = useState("");

  const selectedCountry = COUNTRIES.find((country) => country.code === draft.country_code);
  const questions = interview?.follow_up_questions || [];
  const currentQuestion = questions[followUpIndex] || null;
  const currentAnswer = String(interview?.answers?.[currentQuestion?.question_id] || "");
  const progressWidth = getProgressWidth(step, followUpIndex, questions.length);
  const speechTag = getSpeechRecognitionTag(draft.country_code, draft.voice_locale);
  const remainingChars = Math.max(0, 280 - draft.informal_description.length);
  const educationOptions = EducationOptions(copy);
  const suggestedLanguages = LANGUAGE_SUGGESTIONS[draft.country_code] || [];
  const canAdvance = canContinue(step, draft, currentQuestion, currentAnswer);
  const reviewReady = canGenerateProfile(draft, questions, interview?.answers || {});
  const exampleText =
    draft.country_code === "PAK" && copy.suggestedStartPakistan
      ? copy.suggestedStartPakistan
      : copy.suggestedStartDefault || copy.workPlaceholder;

  function normalizeLanguage(value) {
    return value.trim();
  }

  function toggleLanguage(language) {
    const nextLanguage = normalizeLanguage(language);
    if (!nextLanguage) {
      return;
    }
    if (draft.languages.includes(nextLanguage)) {
      updateDraft({ languages: draft.languages.filter((entry) => entry !== nextLanguage) });
      return;
    }
    updateDraft({ languages: [...draft.languages, nextLanguage] });
  }

  function addLanguage() {
    const nextLanguage = normalizeLanguage(languageInput);
    if (!nextLanguage) {
      setLanguageInput("");
      return;
    }
    if (!draft.languages.includes(nextLanguage)) {
      updateDraft({ languages: [...draft.languages, nextLanguage] });
    }
    setLanguageInput("");
  }

  async function nextStep() {
    if (step === 5) {
      const result = await generateInterview();
      if (result?.follow_up_questions?.length) {
        setFollowUpIndex(0);
        setStep(6);
        return;
      }
      setStep(7);
      return;
    }

    if (step === 6) {
      if (followUpIndex < questions.length - 1) {
        setFollowUpIndex((current) => current + 1);
        return;
      }
      setStep(7);
      return;
    }

    setStep((current) => current + 1);
  }

  function previousStep() {
    if (step === 7) {
      if (questions.length > 0) {
        setStep(6);
        setFollowUpIndex(questions.length - 1);
        return;
      }
      setStep(5);
      return;
    }
    if (step === 6) {
      if (followUpIndex > 0) {
        setFollowUpIndex((current) => current - 1);
        return;
      }
      setStep(5);
      return;
    }
    if (step > 0) {
      setStep((current) => current - 1);
    }
  }

  async function submitProfile() {
    try {
      await generateProfile();
      startTransition(() => navigate("/profile"));
    } catch {
      // Error is surfaced through existing hook state.
    }
  }

  return (
    <section className="conversation-shell" id="onboarding-flow">
      <div className="conversation-progress" aria-hidden="true">
        <div className="conversation-progress-fill" style={{ width: `${progressWidth}%` }} />
      </div>

      {step === 0 ? (
        <div className="conversation-screen conversation-screen-center">
          <div className="question-block">
            <h2>{draft.ui_locale === "en" ? "Where are you from?" : copy.countryTitle}</h2>
          </div>
          <div className="country-tiles-grid">
            {COUNTRIES.map((country) => (
              <button
                key={country.code}
                className={country.code === draft.country_code ? "country-choice is-active" : "country-choice"}
                type="button"
                onClick={() => {
                  setCountryCode(country.code);
                  setStep(1);
                }}
              >
                <span className="country-choice-flag">{country.flag}</span>
                <span className="country-choice-name">{country.name}</span>
                <span className="country-choice-meta">
                  {country.region} - {country.context}
                </span>
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {step === 1 ? (
        <div className="conversation-screen">
          <div className="question-block">
            <h2>{draft.ui_locale === "en" ? "What's your highest level of education?" : copy.educationLabel}</h2>
          </div>
          <div className="choice-list">
            {educationOptions.map(([value, label]) => (
              <button
                key={value}
                className={draft.education_level === value ? "education-choice is-active" : "education-choice"}
                type="button"
                onClick={() => {
                  updateDraft({ education_level: value });
                  setStep(2);
                }}
              >
                <span>{label}</span>
                <span className="education-check">{draft.education_level === value ? "\u2713" : ""}</span>
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {step === 2 ? (
        <div className="conversation-screen">
          <div className="question-block">
            <h2>{draft.ui_locale === "en" ? "How old are you?" : copy.ageLabel}</h2>
            <p>{copy.backgroundCopy}</p>
          </div>
          <div className="input-stack conversation-form-stack">
            <input
              className="input"
              inputMode="numeric"
              max="99"
              min="15"
              placeholder="18"
              type="number"
              value={draft.age}
              onChange={(event) => updateDraft({ age: event.target.value })}
            />
          </div>
        </div>
      ) : null}

      {step === 3 ? (
        <div className="conversation-screen">
          <div className="question-block">
            <h2>{draft.ui_locale === "en" ? "How many years have you been doing this work?" : copy.yearsExperienceLabel}</h2>
          </div>
          <div className="input-stack conversation-form-stack">
            <input
              className="input"
              inputMode="numeric"
              max="60"
              min="0"
              placeholder="5"
              type="number"
              value={draft.years_experience}
              onChange={(event) => updateDraft({ years_experience: event.target.value })}
            />
          </div>
        </div>
      ) : null}

      {step === 4 ? (
        <div className="conversation-screen">
          <div className="question-block">
            <h2>{copy.languagesSpoken}</h2>
          </div>
          <div className="input-stack conversation-form-stack">
            {draft.languages.length ? (
              <div className="tag-list">
                {draft.languages.map((language) => (
                  <button
                    key={language}
                    className="tag-pill"
                    type="button"
                    onClick={() => toggleLanguage(language)}
                  >
                    {language} x
                  </button>
                ))}
              </div>
            ) : null}

            {suggestedLanguages.length ? (
              <div className="tag-list">
                {suggestedLanguages.map((language) => (
                  <button
                    key={language}
                    className={draft.languages.includes(language) ? "choice-chip is-active" : "choice-chip"}
                    type="button"
                    onClick={() => toggleLanguage(language)}
                  >
                    {language}
                  </button>
                ))}
              </div>
            ) : null}

            <div className="summary-inline-input">
              <input
                className="input"
                placeholder={copy.addLanguagePlaceholder}
                type="text"
                value={languageInput}
                onChange={(event) => setLanguageInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    addLanguage();
                  }
                }}
              />
              <button className="button button-secondary" type="button" onClick={addLanguage}>
                {copy.addLanguage}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {step === 5 ? (
        <div className="conversation-screen">
          <div className="question-block">
            <h2>{draft.ui_locale === "en" ? "Tell us what you do - in your own words." : copy.workTitle}</h2>
            <p>{copy.workCopy}</p>
          </div>
          <div className="input-stack conversation-form-stack">
            <textarea
              className="input textarea conversation-textarea"
              maxLength={280}
              placeholder={exampleText}
              rows="8"
              value={draft.informal_description}
              onChange={(event) => updateDraft({ informal_description: event.target.value })}
            />
            <div className="mic-row">
              <VoiceInputButton
                label={copy}
                speechTag={speechTag}
                locale={draft.ui_locale}
                voiceLocale={draft.voice_locale}
                buttonText={draft.ui_locale === "en" ? "Or speak instead" : copy.speechButton}
                onTranscript={(transcript) =>
                  updateDraft({ informal_description: appendTranscript(draft.informal_description, transcript) })
                }
              />
            </div>
            <p className="character-counter">{remainingChars} characters left</p>
          </div>
        </div>
      ) : null}

      {step === 6 ? (
        <div className="conversation-screen">
          <div className="question-block">
            <h2>{copy.followUpTitle}</h2>
            {interview?.summary_for_user ? <p>{interview.summary_for_user}</p> : null}
          </div>
          {loadingInterview ? (
            <div className="section-card loading-card">Loading follow-up question...</div>
          ) : currentQuestion ? (
            <div className="followup-card">
              <p className="eyebrow">
                {copy.stepPrefix} {followUpIndex + 1}
              </p>
              <h3>{currentQuestion.question}</h3>
              {currentQuestion.help_text ? <p className="section-copy">{currentQuestion.help_text}</p> : null}
              {currentQuestion.suggested_answers?.length ? (
                <div className="choice-list">
                  {currentQuestion.suggested_answers.map((answer) => (
                    <button
                      key={answer}
                      className={currentAnswer === answer ? "education-choice is-active" : "education-choice"}
                      type="button"
                      onClick={() => updateInterviewAnswer(currentQuestion.question_id, answer)}
                    >
                      <span>{answer}</span>
                      <span className="education-check">{currentAnswer === answer ? "\u2713" : ""}</span>
                    </button>
                  ))}
                </div>
              ) : (
                <input
                  className="input"
                  type="text"
                  value={currentAnswer}
                  onChange={(event) => updateInterviewAnswer(currentQuestion.question_id, event.target.value)}
                />
              )}
            </div>
          ) : null}
        </div>
      ) : null}

      {step === 7 ? (
        <div className="conversation-screen">
          <div className="question-block">
            <h2>{copy.reviewTitle}</h2>
            <p>{copy.reviewCopy}</p>
          </div>
          <div className="summary-card">
            <SummaryAnswerRow label={copy.reviewCountryLabel} value={selectedCountry ? `${selectedCountry.flag} ${selectedCountry.name}` : ""} />

            <SummaryAnswerRow label={copy.educationLabel}>
              <select
                className="input"
                value={draft.education_level}
                onChange={(event) => updateDraft({ education_level: event.target.value })}
              >
                {educationOptions.map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </SummaryAnswerRow>

            <SummaryAnswerRow label={copy.ageLabel}>
              <input
                className="input"
                inputMode="numeric"
                max="99"
                min="15"
                type="number"
                value={draft.age}
                onChange={(event) => updateDraft({ age: event.target.value })}
              />
            </SummaryAnswerRow>

            <SummaryAnswerRow label={copy.yearsExperienceLabel}>
              <input
                className="input"
                inputMode="numeric"
                max="60"
                min="0"
                type="number"
                value={draft.years_experience}
                onChange={(event) => updateDraft({ years_experience: event.target.value })}
              />
            </SummaryAnswerRow>

            <SummaryAnswerRow label={copy.languagesSpoken}>
              <div className="summary-language-editor">
                <div className="tag-list">
                  {draft.languages.map((language) => (
                    <button
                      key={language}
                      className="tag-pill"
                      type="button"
                      onClick={() => toggleLanguage(language)}
                    >
                      {language} x
                    </button>
                  ))}
                </div>
                <div className="summary-inline-input">
                  <input
                    className="input"
                    placeholder={copy.addLanguagePlaceholder}
                    type="text"
                    value={languageInput}
                    onChange={(event) => setLanguageInput(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        addLanguage();
                      }
                    }}
                  />
                  <button className="button button-secondary" type="button" onClick={addLanguage}>
                    {copy.addLanguage}
                  </button>
                </div>
              </div>
            </SummaryAnswerRow>

            <SummaryAnswerRow label={copy.workLabel}>
              <textarea
                className="input textarea summary-textarea"
                rows="6"
                value={draft.informal_description}
                onChange={(event) => updateDraft({ informal_description: event.target.value })}
              />
            </SummaryAnswerRow>

            {questions.length ? (
              <div className="summary-followups">
                {questions.map((question) => (
                  <SummaryAnswerRow key={question.question_id} label={question.question}>
                    <input
                      className="input"
                      type="text"
                      value={interview?.answers?.[question.question_id] || ""}
                      onChange={(event) => updateInterviewAnswer(question.question_id, event.target.value)}
                    />
                  </SummaryAnswerRow>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      {error ? <div className="alert-banner">{error}</div> : null}

      {step > 0 ? (
        <div className="conversation-actions">
          <button
            className="back-link"
            disabled={loadingProfile || loadingInterview}
            type="button"
            onClick={previousStep}
          >
            {"\u2190"} {copy.back}
          </button>

          {step === 1 ? null : step < 7 ? (
            <button
              className="button conversation-next"
              disabled={!canAdvance || loadingInterview}
              type="button"
              onClick={nextStep}
            >
              {step === 5 ? copy.findQuestions : copy.continue}
            </button>
          ) : (
            <button
              className="button conversation-next"
              disabled={!reviewReady || loadingProfile}
              type="button"
              onClick={submitProfile}
            >
              {loadingProfile ? copy.generatingProfile : copy.generateProfile}
            </button>
          )}
        </div>
      ) : null}
    </section>
  );
}
