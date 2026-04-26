import { startTransition, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { COUNTRIES } from "../config/countries";
import { getCopy, getSpeechRecognitionTag } from "../config/locales";
import { useProfile } from "../hooks/useProfile";
import CountrySelector from "./CountrySelector";
import LanguageSwitcher from "./LanguageSwitcher";
import VoiceInputButton from "./VoiceInputButton";

const LANGUAGE_SUGGESTIONS = {
  GHA: ["English", "Twi", "Ga", "Ewe"],
  PAK: ["Urdu", "English", "Punjabi", "Sindhi", "Pashto"],
  KEN: ["English", "Swahili", "Kikuyu", "Luo"],
  BGD: ["Bangla", "English", "Chittagonian"],
};

const MULTI_SELECT_HINTS = [
  /which/i,
  /what tools/i,
  /what types/i,
  /what kind/i,
  /which of these/i,
  /select all/i,
  /where do/i,
  /who do/i,
  /how did you learn/i,
  /what do you use/i,
];

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
  const totalScreens = 8 + totalQuestions;
  const currentScreen =
    step <= 6
      ? step
      : step === 7
        ? 7 + followUpIndex
        : 7 + totalQuestions;
  return ((currentScreen + 1) / totalScreens) * 100;
}

function hasValue(value) {
  return String(value ?? "").trim().length > 0;
}

function hasValidAge(value) {
  if (!hasValue(value)) {
    return false;
  }
  const age = Number(value);
  return Number.isFinite(age) && age >= 15 && age <= 99;
}

function hasValidExperience(value) {
  if (!hasValue(value)) {
    return false;
  }
  const years = Number(value);
  return Number.isFinite(years) && years >= 0 && years <= 60;
}

function canContinue(step, draft, currentQuestion, currentAnswer) {
  if (step === 0) {
    return Boolean(draft.country_code);
  }
  if (step === 1) {
    return Boolean(draft.ui_locale) && Boolean(draft.voice_locale);
  }
  if (step === 2) {
    return Boolean(draft.education_level);
  }
  if (step === 3) {
    return hasValidAge(draft.age);
  }
  if (step === 4) {
    return hasValidExperience(draft.years_experience);
  }
  if (step === 5) {
    return draft.languages.length > 0;
  }
  if (step === 6) {
    return draft.informal_description.trim().length >= 20;
  }
  if (step === 7 && currentQuestion) {
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

function getEducationOptions(copy) {
  return [
    ["none", copy.noFormalCredential],
    ["primary", copy.primaryLabel],
    ["secondary", copy.secondaryLabel],
    ["technical", copy.technicalVocational],
    ["tertiary", copy.bachelorsDegree],
    ["postgraduate", copy.postgraduateLabel],
  ];
}

function parseAnswerParts(answer) {
  return String(answer || "")
    .split("; ")
    .map((item) => item.trim())
    .filter(Boolean);
}

function serializeAnswerParts(parts) {
  return parts.filter(Boolean).join("; ");
}

function questionAllowsMultipleAnswers(question) {
  if (!question?.suggested_answers?.length) {
    return false;
  }
  const prompt = String(question.question || "");
  return MULTI_SELECT_HINTS.some((pattern) => pattern.test(prompt));
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
  const [showJourneySettings, setShowJourneySettings] = useState(false);
  const [showLanguageOtherInput, setShowLanguageOtherInput] = useState(false);
  const [followUpOtherMode, setFollowUpOtherMode] = useState({});

  const selectedCountry = COUNTRIES.find((country) => country.code === draft.country_code);
  const questions = interview?.follow_up_questions || [];
  const currentQuestion = questions[followUpIndex] || null;
  const currentAnswer = String(interview?.answers?.[currentQuestion?.question_id] || "");
  const progressWidth = getProgressWidth(step, followUpIndex, questions.length);
  const speechTag = getSpeechRecognitionTag(draft.country_code, draft.voice_locale);
  const remainingChars = Math.max(0, 280 - draft.informal_description.length);
  const educationOptions = getEducationOptions(copy);
  const suggestedLanguages = LANGUAGE_SUGGESTIONS[draft.country_code] || [];
  const canAdvance = canContinue(step, draft, currentQuestion, currentAnswer);
  const reviewReady = canGenerateProfile(draft, questions, interview?.answers || {});
  const exampleText =
    draft.country_code === "PAK" && copy.suggestedStartPakistan
      ? copy.suggestedStartPakistan
      : copy.suggestedStartDefault || copy.workPlaceholder;
  const customLanguages = draft.languages.filter((language) => !suggestedLanguages.includes(language));
  const currentAnswerParts = parseAnswerParts(currentAnswer);
  const currentSuggestedAnswers = currentQuestion?.suggested_answers || [];
  const currentCustomAnswers = currentAnswerParts.filter((value) => !currentSuggestedAnswers.includes(value));
  const showFollowUpOtherInput =
    Boolean(followUpOtherMode[currentQuestion?.question_id]) || currentCustomAnswers.length > 0;

  useEffect(() => {
    const draftIsEmpty =
      !draft.country_code &&
      !draft.education_level &&
      !draft.informal_description &&
      !draft.languages.length &&
      !draft.age &&
      !draft.years_experience &&
      !interview;

    if (draftIsEmpty) {
      setStep(0);
      setFollowUpIndex(0);
      setLanguageInput("");
      setShowJourneySettings(false);
      setShowLanguageOtherInput(false);
      setFollowUpOtherMode({});
    }
  }, [
    draft.age,
    draft.country_code,
    draft.education_level,
    draft.informal_description,
    draft.languages,
    draft.years_experience,
    interview,
  ]);

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

  function toggleFollowUpChoice(question, answer) {
    if (!question) {
      return;
    }

    if (!questionAllowsMultipleAnswers(question)) {
      updateInterviewAnswer(question.question_id, answer);
      setFollowUpOtherMode((current) => ({ ...current, [question.question_id]: false }));
      return;
    }

    const currentValues = parseAnswerParts(interview?.answers?.[question.question_id]);
    const nextValues = currentValues.includes(answer)
      ? currentValues.filter((value) => value !== answer)
      : [...currentValues, answer];
    updateInterviewAnswer(question.question_id, serializeAnswerParts(nextValues));
  }

  function toggleFollowUpOther(question) {
    if (!question) {
      return;
    }

    const questionId = question.question_id;
    const nextMode = !showFollowUpOtherInput;
    setFollowUpOtherMode((current) => ({ ...current, [questionId]: nextMode }));

    if (!nextMode) {
      const keptValues = parseAnswerParts(interview?.answers?.[questionId]).filter((value) =>
        question.suggested_answers.includes(value),
      );
      updateInterviewAnswer(questionId, serializeAnswerParts(keptValues));
    } else if (!questionAllowsMultipleAnswers(question)) {
      updateInterviewAnswer(questionId, "");
    }
  }

  function updateFollowUpOtherAnswer(question, value) {
    if (!question) {
      return;
    }

    const trimmed = value.trim();
    if (!questionAllowsMultipleAnswers(question)) {
      updateInterviewAnswer(question.question_id, value);
      return;
    }

    const keptValues = parseAnswerParts(interview?.answers?.[question.question_id]).filter((entry) =>
      question.suggested_answers.includes(entry),
    );
    const nextValues = trimmed ? [...keptValues, trimmed] : keptValues;
    updateInterviewAnswer(question.question_id, serializeAnswerParts(nextValues));
  }

  async function nextStep() {
    if (step === 6) {
      const result = await generateInterview();
      if (result?.follow_up_questions?.length) {
        setFollowUpIndex(0);
        setStep(7);
        return;
      }
      setStep(8);
      return;
    }

    if (step === 7) {
      if (followUpIndex < questions.length - 1) {
        setFollowUpIndex((current) => current + 1);
        return;
      }
      setStep(8);
      return;
    }

    setStep((current) => current + 1);
  }

  function previousStep() {
    if (step === 8) {
      if (questions.length > 0) {
        setStep(7);
        setFollowUpIndex(questions.length - 1);
        return;
      }
      setStep(6);
      return;
    }
    if (step === 7) {
      if (followUpIndex > 0) {
        setFollowUpIndex((current) => current - 1);
        return;
      }
      setStep(6);
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

      {step > 0 ? (
        <details className="conversation-tools" open={showJourneySettings}>
          <summary onClick={() => setShowJourneySettings((current) => !current)}>
            Change country, platform language, or voice input
          </summary>
          <div className="conversation-tools-body">
            <CountrySelector compact selectedCountry={draft.country_code} onSelect={setCountryCode} />
            <LanguageSwitcher compact />
          </div>
        </details>
      ) : null}

      {step === 0 ? (
        <div className="conversation-screen conversation-screen-fill">
          <div className="question-block">
            <h2>Where are you from?</h2>
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
        <div className="conversation-screen conversation-screen-fill">
          <div className="question-block">
            <h2>Choose the platform and voice language</h2>
            <p>{copy.quickLanguageCopy}</p>
          </div>
          <div className="section-card conversation-form-stack journey-language-panel">
            <LanguageSwitcher compact />
          </div>
        </div>
      ) : null}

      {step === 2 ? (
        <div className="conversation-screen conversation-screen-fill">
          <div className="question-block">
            <h2>What's your highest level of education?</h2>
          </div>
          <div className="choice-list conversation-form-stack">
            {educationOptions.map(([value, label]) => (
              <button
                key={value}
                className={draft.education_level === value ? "education-choice is-active" : "education-choice"}
                type="button"
                onClick={() => updateDraft({ education_level: value })}
              >
                <span>{label}</span>
                <span className="education-check">{draft.education_level === value ? "\u2713" : ""}</span>
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {step === 3 ? (
        <div className="conversation-screen conversation-screen-fill">
          <div className="question-block">
            <h2>How old are you?</h2>
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

      {step === 4 ? (
        <div className="conversation-screen conversation-screen-fill">
          <div className="question-block">
            <h2>How many years have you been doing this work?</h2>
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

      {step === 5 ? (
        <div className="conversation-screen conversation-screen-fill">
          <div className="question-block">
            <h2>{copy.languagesSpoken}</h2>
          </div>
          <div className="input-stack conversation-form-stack">
            {suggestedLanguages.length ? (
              <div className="choice-list">
                {suggestedLanguages.map((language) => (
                  <button
                    key={language}
                    className={draft.languages.includes(language) ? "selection-row is-active" : "selection-row"}
                    type="button"
                    onClick={() => toggleLanguage(language)}
                  >
                    <span>{language}</span>
                    <span className="selection-indicator">{draft.languages.includes(language) ? "\u2713" : ""}</span>
                  </button>
                ))}
                <button
                  className={showLanguageOtherInput || customLanguages.length ? "selection-row is-active" : "selection-row"}
                  type="button"
                  onClick={() => setShowLanguageOtherInput((current) => !current)}
                >
                  <span>Other or enter your own</span>
                  <span className="selection-indicator">{showLanguageOtherInput || customLanguages.length ? "\u2713" : ""}</span>
                </button>
              </div>
            ) : null}

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

            {showLanguageOtherInput || customLanguages.length ? (
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
            ) : null}
          </div>
        </div>
      ) : null}

      {step === 6 ? (
        <div className="conversation-screen conversation-screen-fill">
          <div className="question-block">
            <h2>Tell us what you do - in your own words.</h2>
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
                buttonText="Or speak instead"
                onTranscript={(transcript) =>
                  updateDraft({ informal_description: appendTranscript(draft.informal_description, transcript) })
                }
              />
            </div>
            <p className="character-counter">{remainingChars} characters left</p>
          </div>
        </div>
      ) : null}

      {step === 7 ? (
        <div className="conversation-screen conversation-screen-fill">
          <div className="question-block">
            <h2>{copy.followUpTitle}</h2>
            {interview?.summary_for_user ? <p>{interview.summary_for_user}</p> : null}
          </div>
          {loadingInterview ? (
            <div className="section-card loading-card">Loading follow-up question...</div>
          ) : currentQuestion ? (
            <div className="followup-card conversation-form-stack">
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
                      className={
                        currentAnswerParts.includes(answer) ? "selection-row is-active" : "selection-row"
                      }
                      type="button"
                      onClick={() => toggleFollowUpChoice(currentQuestion, answer)}
                    >
                      <span>{answer}</span>
                      <span className="selection-indicator">
                        {currentAnswerParts.includes(answer) ? "\u2713" : ""}
                      </span>
                    </button>
                  ))}
                  <button
                    className={showFollowUpOtherInput ? "selection-row is-active" : "selection-row"}
                    type="button"
                    onClick={() => toggleFollowUpOther(currentQuestion)}
                  >
                    <span>Other or enter your own</span>
                    <span className="selection-indicator">{showFollowUpOtherInput ? "\u2713" : ""}</span>
                  </button>
                </div>
              ) : (
                <input
                  className="input"
                  type="text"
                  value={currentAnswer}
                  onChange={(event) => updateInterviewAnswer(currentQuestion.question_id, event.target.value)}
                />
              )}
              {currentQuestion.suggested_answers?.length && showFollowUpOtherInput ? (
                <input
                  className="input"
                  placeholder="Type your own answer"
                  type="text"
                  value={currentCustomAnswers.join("; ")}
                  onChange={(event) => updateFollowUpOtherAnswer(currentQuestion, event.target.value)}
                />
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}

      {step === 8 ? (
        <div className="conversation-screen conversation-screen-fill">
          <div className="question-block">
            <h2>Ready to map your profile?</h2>
            <p>{copy.reviewCopy}</p>
          </div>
          <div className="summary-card conversation-form-stack">
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

          {step < 8 ? (
            <button
              className="button conversation-next"
              disabled={!canAdvance || loadingInterview}
              type="button"
              onClick={nextStep}
            >
              {step === 6 ? copy.findQuestions : copy.continue}
            </button>
          ) : (
            <button
              className="button conversation-next"
              disabled={!reviewReady || loadingProfile}
              type="button"
              onClick={submitProfile}
            >
              {loadingProfile ? copy.generatingProfile : "Generate My Profile ->"}
            </button>
          )}
        </div>
      ) : null}
    </section>
  );
}
