import { startTransition, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import { COUNTRIES } from "../config/countries";
import { getCopy, getLocaleLabel, getSpeechRecognitionTag, getVoiceLabel } from "../config/locales";
import { useProfile } from "../hooks/useProfile";
import VoiceInputButton from "./VoiceInputButton";


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
  if (step === 0) {
    return 20;
  }
  if (step === 1) {
    return 40;
  }
  if (step === 2) {
    return 60;
  }
  if (step === 3) {
    if (!totalQuestions) {
      return 80;
    }
    return 60 + (((followUpIndex + 1) / totalQuestions) * 20);
  }
  return 100;
}

function canContinue(step, draft, currentQuestion, currentAnswer) {
  if (step === 0) {
    return Boolean(draft.country_code);
  }
  if (step === 1) {
    return Boolean(draft.education_level);
  }
  if (step === 2) {
    return draft.informal_description.trim().length >= 20;
  }
  if (step === 3 && currentQuestion) {
    return currentAnswer.trim().length > 0;
  }
  return true;
}

function SummaryAnswerRow({ label, value, children }) {
  return (
    <div className="summary-row">
      <span className="summary-label">{label}</span>
      <div className="summary-value">{value || children}</div>
      {children ? <div className="summary-edit">{children}</div> : null}
    </div>
  );
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

  const summaryFields = useMemo(
    () => ({
      country: selectedCountry ? `${selectedCountry.flag} ${selectedCountry.name}` : "",
      education: draft.education_level,
      languageMode: getLocaleLabel(draft.ui_locale),
      voiceMode: getVoiceLabel(draft.voice_locale),
    }),
    [draft.education_level, draft.ui_locale, draft.voice_locale, selectedCountry],
  );

  async function nextStep() {
    if (step === 2) {
      const result = await generateInterview();
      if (result?.follow_up_questions?.length) {
        setFollowUpIndex(0);
        setStep(3);
        return;
      }
      setStep(4);
      return;
    }

    if (step === 3) {
      if (followUpIndex < questions.length - 1) {
        setFollowUpIndex((current) => current + 1);
        return;
      }
      setStep(4);
      return;
    }

    setStep((current) => current + 1);
  }

  function previousStep() {
    if (step === 3 && followUpIndex > 0) {
      setFollowUpIndex((current) => current - 1);
      return;
    }
    if (step > 0) {
      setStep((current) => current - 1);
    }
  }

  function addLanguage() {
    const nextLanguage = languageInput.trim();
    if (!nextLanguage || draft.languages.includes(nextLanguage)) {
      setLanguageInput("");
      return;
    }
    updateDraft({ languages: [...draft.languages, nextLanguage] });
    setLanguageInput("");
  }

  async function submitProfile() {
    try {
      await generateProfile();
      startTransition(() => navigate("/profile"));
    } catch {
      // Error is surfaced through existing hook state.
    }
  }

  const continueEnabled = canContinue(step, draft, currentQuestion, currentAnswer);

  return (
    <section className="conversation-shell" id="onboarding-flow">
      <div className="conversation-progress" aria-hidden="true">
        <div className="conversation-progress-fill" style={{ width: `${progressWidth}%` }} />
      </div>

      {step === 0 ? (
        <div className="conversation-screen conversation-screen-center">
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
                  {country.region} · {country.context}
                </span>
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {step === 1 ? (
        <div className="conversation-screen">
          <div className="question-block">
            <h2>What's your highest level of education?</h2>
          </div>
          <div className="choice-list">
            {[
              ["none", "No schooling"],
              ["primary", "Primary"],
              ["secondary", "Secondary"],
              ["technical", "Vocational"],
              ["tertiary", "Undergraduate"],
              ["postgraduate", "Postgraduate"],
            ].map(([value, label]) => (
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
                <span className="education-check">{draft.education_level === value ? "✓" : ""}</span>
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {step === 2 ? (
        <div className="conversation-screen">
          <div className="question-block">
            <h2>Tell us what you do — in your own words.</h2>
          </div>
          <div className="input-stack">
            <textarea
              className="input textarea conversation-textarea"
              maxLength={280}
              placeholder="Example: I fix phones and sell mobile accessories. I learned from YouTube. I've been doing this for 5 years."
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

      {step === 3 ? (
        <div className="conversation-screen">
          <div className="question-block">
            <h2>A few follow-up questions</h2>
            {interview?.summary_for_user ? <p>{interview.summary_for_user}</p> : null}
          </div>
          {loadingInterview ? (
            <div className="section-card loading-card">Loading follow-up question...</div>
          ) : currentQuestion ? (
            <div className="followup-card">
              <p className="eyebrow">Question {followUpIndex + 1}</p>
              <h3>{currentQuestion.question}</h3>
              {currentQuestion.help_text ? <p className="section-copy">{currentQuestion.help_text}</p> : null}
              {currentQuestion.suggested_answers?.length ? (
                <div className="choice-list">
                  {currentQuestion.suggested_answers.map((answer) => (
                    <button
                      key={answer}
                      className={currentAnswer === answer ? "choice-chip is-active" : "choice-chip"}
                      type="button"
                      onClick={() => updateInterviewAnswer(currentQuestion.question_id, answer)}
                    >
                      {answer}
                    </button>
                  ))}
                </div>
              ) : null}
              <input
                className="input"
                type="text"
                value={currentAnswer}
                onChange={(event) => updateInterviewAnswer(currentQuestion.question_id, event.target.value)}
              />
            </div>
          ) : null}
        </div>
      ) : null}

      {step === 4 ? (
        <div className="conversation-screen">
          <div className="question-block">
            <h2>Ready to map your profile?</h2>
          </div>
          <div className="summary-card">
            <SummaryAnswerRow label="Country" value={summaryFields.country} />
            <SummaryAnswerRow label="Platform language" value={summaryFields.languageMode} />
            <SummaryAnswerRow label="Voice input" value={summaryFields.voiceMode} />

            <SummaryAnswerRow label="Education">
              <select
                className="input"
                value={draft.education_level}
                onChange={(event) => updateDraft({ education_level: event.target.value })}
              >
                <option value="none">No schooling</option>
                <option value="primary">Primary</option>
                <option value="secondary">Secondary</option>
                <option value="technical">Vocational</option>
                <option value="tertiary">Undergraduate</option>
                <option value="postgraduate">Postgraduate</option>
              </select>
            </SummaryAnswerRow>

            <SummaryAnswerRow label="Age">
              <input
                className="input"
                min="15"
                max="99"
                type="number"
                value={draft.age}
                onChange={(event) => updateDraft({ age: Number(event.target.value) })}
              />
            </SummaryAnswerRow>

            <SummaryAnswerRow label="Years of experience">
              <input
                className="input"
                min="0"
                max="60"
                type="number"
                value={draft.years_experience}
                onChange={(event) => updateDraft({ years_experience: Number(event.target.value) })}
              />
            </SummaryAnswerRow>

            <SummaryAnswerRow label="Languages spoken">
              <div className="summary-language-editor">
                <div className="tag-list">
                  {draft.languages.map((language) => (
                    <button
                      key={language}
                      className="tag-pill"
                      type="button"
                      onClick={() => updateDraft({ languages: draft.languages.filter((entry) => entry !== language) })}
                    >
                      {language} ×
                    </button>
                  ))}
                </div>
                <div className="summary-inline-input">
                  <input
                    className="input"
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
                    Add
                  </button>
                </div>
              </div>
            </SummaryAnswerRow>

            <SummaryAnswerRow label="Your work">
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
            ← Back
          </button>

          {step === 1 ? null : step < 4 ? (
            <button
              className="button conversation-next"
              disabled={!continueEnabled || loadingInterview}
              type="button"
              onClick={nextStep}
            >
              {step === 2 ? "Continue" : "Next"}
            </button>
          ) : (
            <button
              className="button conversation-next"
              disabled={loadingProfile}
              type="button"
              onClick={submitProfile}
            >
              {loadingProfile ? "Generating..." : "Generate My Profile →"}
            </button>
          )}
        </div>
      ) : null}
    </section>
  );
}
