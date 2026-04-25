import { startTransition, useState } from "react";
import { useNavigate } from "react-router-dom";

import { COUNTRIES } from "../config/countries";
import {
  getCopy,
  getCountryLocaleOptions,
  getCountryVoiceOptions,
  getLocaleLabel,
  getSpeechRecognitionTag,
  getVoiceLabel,
} from "../config/locales";
import { useProfile } from "../hooks/useProfile";
import CountrySelector from "./CountrySelector";
import VoiceInputButton from "./VoiceInputButton";


function validateStep(step, draft, interview) {
  if (step === 0) {
    return Boolean(draft.country_code && draft.ui_locale && draft.voice_locale);
  }
  if (step === 1) {
    return Boolean(draft.education_level) && draft.age >= 15 && draft.years_experience >= 0 && draft.languages.length > 0;
  }
  if (step === 2) {
    return draft.informal_description.trim().length >= 20;
  }
  if (step === 3) {
    const questions = interview?.follow_up_questions || [];
    if (!questions.length) {
      return true;
    }
    return questions.every((question) => String(interview?.answers?.[question.question_id] || "").trim());
  }
  return true;
}

function appendTranscript(currentValue, transcript) {
  const trimmedTranscript = transcript.trim();
  if (!trimmedTranscript) {
    return currentValue;
  }
  const trimmedCurrent = currentValue.trim();
  if (!trimmedCurrent) {
    return trimmedTranscript;
  }
  return `${trimmedCurrent} ${trimmedTranscript}`;
}

function getEducationLabel(copy, educationLevel) {
  const labels = {
    none: copy.noFormalCredential,
    primary: copy.primaryLabel,
    secondary: copy.secondaryLabel,
    technical: copy.technicalVocational,
    diploma: copy.diplomaLabel,
    tertiary: copy.bachelorsDegree,
    postgraduate: copy.postgraduateLabel,
  };
  return labels[educationLevel] || educationLevel;
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
    setUiLocale,
    setVoiceLocale,
    generateInterview,
    generateProfile,
    loadingProfile,
    error,
  } = useProfile();

  const [step, setStep] = useState(0);
  const [languageInput, setLanguageInput] = useState("");
  const copy = getCopy(draft.ui_locale);
  const stepLabels = [copy.stepCountry, copy.stepBackground, copy.stepWork, copy.stepFollowUps, copy.stepReview];
  const selectedCountry = COUNTRIES.find((country) => country.code === draft.country_code);
  const localeOptions = getCountryLocaleOptions(draft.country_code);
  const voiceOptions = getCountryVoiceOptions(draft.country_code);
  const speechTag = getSpeechRecognitionTag(draft.country_code, draft.voice_locale);
  const canContinue = validateStep(step, draft, interview);
  const interviewQuestions = interview?.follow_up_questions || [];
  const suggestedStart =
    selectedCountry?.code === "PAK" ? copy.suggestedStartPakistan : copy.suggestedStartDefault;

  function addLanguage() {
    const trimmed = languageInput.trim();
    if (!trimmed || draft.languages.includes(trimmed)) {
      setLanguageInput("");
      return;
    }
    updateDraft({ languages: [...draft.languages, trimmed] });
    setLanguageInput("");
  }

  function removeLanguage(language) {
    updateDraft({ languages: draft.languages.filter((entry) => entry !== language) });
  }

  async function handleNext() {
    if (step === 2) {
      const result = await generateInterview();
      if (result?.follow_up_questions?.length) {
        setStep(3);
        return;
      }
      setStep(4);
      return;
    }

    if (step === 3) {
      setStep(4);
      return;
    }

    setStep(step + 1);
  }

  async function handleSubmit() {
    try {
      await generateProfile();
      startTransition(() => navigate("/profile"));
    } catch {
      // Hook state already carries the error.
    }
  }

  return (
    <section className="section-card flow-card" id="onboarding-flow">
      <div className="section-header">
        <div>
          <p className="eyebrow">{copy.onboardingEyebrow}</p>
          <h2>{copy.onboardingTitle}</h2>
        </div>
        <p className="section-copy">{copy.onboardingCopy}</p>
      </div>

      <div className="progress-strip" aria-label="Progress">
        {stepLabels.map((label, index) => (
          <div key={label} className={index <= step ? "progress-step is-active" : "progress-step"}>
            <span className="progress-index">0{index + 1}</span>
            <span>{label}</span>
          </div>
        ))}
      </div>

      {step === 0 ? (
        <div className="step-stack">
          <CountrySelector
            selectedCountry={draft.country_code}
            onSelect={setCountryCode}
            eyebrow={`${copy.stepPrefix} 1`}
            title={copy.countryTitle}
            subtitle={copy.countrySubtitle}
          />

          <section className="section-card nested-card">
            <div className="section-header">
              <div>
                <p className="eyebrow">{copy.stepPrefix} 1</p>
                <h3>{copy.stepCountry}</h3>
              </div>
              <p className="section-copy">{copy.stepCountryHelp}</p>
            </div>

            <div className="form-grid">
              <label className="field">
                <span>{copy.platformLanguage}</span>
                <select className="input" value={draft.ui_locale} onChange={(event) => setUiLocale(event.target.value)}>
                  {localeOptions.map((option) => (
                    <option key={option.code} value={option.code}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="field">
                <span>{copy.voiceLanguage}</span>
                <select className="input" value={draft.voice_locale} onChange={(event) => setVoiceLocale(event.target.value)}>
                  {voiceOptions.map((option) => (
                    <option key={option.code} value={option.code}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="field switch-field">
                <span>{copy.assistedMode}</span>
                <button
                  className={draft.assisted_mode ? "toggle-button is-active" : "toggle-button"}
                  type="button"
                  onClick={() => updateDraft({ assisted_mode: !draft.assisted_mode })}
                >
                  {draft.assisted_mode ? copy.onLabel : copy.offLabel}
                </button>
                <p className="section-copy">{copy.assistedModeHelp}</p>
              </label>
            </div>
            <p className="section-copy">{copy.setupHelp}</p>
          </section>
        </div>
      ) : null}

      {step === 1 ? (
        <section className="section-card nested-card">
          <div className="section-header">
            <div>
              <p className="eyebrow">{copy.stepPrefix} 2</p>
              <h3>{copy.backgroundTitle}</h3>
            </div>
            <p className="section-copy">{copy.backgroundCopy}</p>
          </div>

          <div className="form-grid">
            <label className="field">
              <span>{copy.educationLabel}</span>
              <select className="input" value={draft.education_level} onChange={(event) => updateDraft({ education_level: event.target.value })}>
                <option value="none">{copy.noFormalCredential}</option>
                <option value="primary">{copy.primaryLabel}</option>
                <option value="secondary">{copy.secondaryLabel}</option>
                <option value="technical">{copy.technicalVocational}</option>
                <option value="diploma">{copy.diplomaLabel}</option>
                <option value="tertiary">{copy.bachelorsDegree}</option>
                <option value="postgraduate">{copy.postgraduateLabel}</option>
              </select>
            </label>

            <label className="field">
              <span>{copy.ageLabel}</span>
              <input className="input" min="15" max="99" type="number" value={draft.age} onChange={(event) => updateDraft({ age: Number(event.target.value) })} />
            </label>

            <label className="field">
              <span>{copy.yearsExperienceLabel}</span>
              <input
                className="input"
                min="0"
                max="60"
                type="number"
                value={draft.years_experience}
                onChange={(event) => updateDraft({ years_experience: Number(event.target.value) })}
              />
            </label>

            <div className="field">
              <span>{copy.languagesSpoken}</span>
              <div className="tag-input-row">
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
              <div className="tag-list">
                {draft.languages.map((language) => (
                  <button key={language} className="tag-pill" type="button" onClick={() => removeLanguage(language)}>
                    {language} x
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>
      ) : null}

      {step === 2 ? (
        <section className="section-card nested-card">
          <div className="section-header">
            <div>
              <p className="eyebrow">{copy.stepPrefix} 3</p>
              <h3>{copy.workTitle}</h3>
            </div>
            <p className="section-copy">{copy.workCopy}</p>
          </div>

          <div className="coaching-panel">
            <strong>{copy.startSimpleTitle}</strong>
            <p>{suggestedStart}</p>
          </div>

          <label className="field">
            <span>{copy.workLabel}</span>
            <textarea
              className="input textarea"
              rows="8"
              placeholder={copy.workPlaceholder}
              value={draft.informal_description}
              onChange={(event) => updateDraft({ informal_description: event.target.value })}
            />
          </label>

          <VoiceInputButton
            label={copy}
            speechTag={speechTag}
            locale={draft.ui_locale}
            voiceLocale={draft.voice_locale}
            onTranscript={(transcript) =>
              updateDraft({ informal_description: appendTranscript(draft.informal_description, transcript) })
            }
          />
          <p className="section-copy">{copy.speechLimited}</p>
        </section>
      ) : null}

      {step === 3 ? (
        <section className="section-card nested-card">
          <div className="section-header">
            <div>
              <p className="eyebrow">{copy.stepPrefix} 4</p>
              <h3>{copy.followUpTitle}</h3>
            </div>
            <p className="section-copy">{copy.followUpCopy}</p>
          </div>

          {loadingInterview ? (
            <div className="loading-grid">
              <div className="skeleton-card tall" />
            </div>
          ) : (
            <>
              {interview?.summary_for_user ? <div className="coaching-panel"><p>{interview.summary_for_user}</p></div> : null}
              <div className="question-stack">
                {interviewQuestions.map((question) => (
                  <article className="question-card" key={question.question_id}>
                    <div className="question-header">
                      <h4>{question.question}</h4>
                      {question.help_text ? <p className="section-copy">{question.help_text}</p> : null}
                    </div>
                    {question.suggested_answers?.length ? (
                      <div className="tag-list">
                        {question.suggested_answers.map((answer) => (
                          <button
                            key={answer}
                            className="tag-pill static"
                            type="button"
                            onClick={() => updateInterviewAnswer(question.question_id, answer)}
                          >
                            {answer}
                          </button>
                        ))}
                      </div>
                    ) : null}
                    <textarea
                      className="input textarea small"
                      rows="4"
                      value={interview?.answers?.[question.question_id] || ""}
                      onChange={(event) => updateInterviewAnswer(question.question_id, event.target.value)}
                    />
                    <VoiceInputButton
                      compact
                      label={copy}
                      speechTag={speechTag}
                      locale={draft.ui_locale}
                      voiceLocale={draft.voice_locale}
                      onTranscript={(transcript) =>
                        updateInterviewAnswer(
                          question.question_id,
                          appendTranscript(interview?.answers?.[question.question_id] || "", transcript),
                        )
                      }
                    />
                  </article>
                ))}
              </div>
            </>
          )}
        </section>
      ) : null}

      {step === 4 ? (
        <section className="section-card nested-card">
          <div className="section-header">
            <div>
              <p className="eyebrow">{copy.stepPrefix} 5</p>
              <h3>{copy.reviewTitle}</h3>
            </div>
            <p className="section-copy">{copy.reviewCopy}</p>
          </div>

          <div className="review-grid">
            <article className="review-card">
              <p className="review-label">{copy.reviewCountryLabel}</p>
              <h4>
                {selectedCountry?.flag} {selectedCountry?.name}
              </h4>
              <p>{selectedCountry?.context}</p>
            </article>

            <article className="review-card">
              <p className="review-label">{copy.reviewLanguageLabel}</p>
              <h4>{getLocaleLabel(draft.ui_locale)}</h4>
              <p>
                {copy.reviewVoicePrefix}: {getVoiceLabel(draft.voice_locale)}
              </p>
            </article>

            <article className="review-card">
              <p className="review-label">{copy.reviewBackgroundLabel}</p>
              <h4>{getEducationLabel(copy, draft.education_level)}</h4>
              <p>
                {copy.ageLabel} {draft.age} | {copy.yearsExperienceLabel} {draft.years_experience}
              </p>
            </article>

            <article className="review-card">
              <p className="review-label">{copy.languagesSpoken}</p>
              <div className="tag-list">
                {draft.languages.map((language) => (
                  <span className="tag-pill static" key={language}>
                    {language}
                  </span>
                ))}
              </div>
            </article>

            <article className="review-card review-card-wide">
              <p className="review-label">{copy.workLabel}</p>
              <p>{draft.informal_description}</p>
            </article>

            {interviewQuestions.length ? (
              <article className="review-card review-card-wide">
                <p className="review-label">{copy.stepFollowUps}</p>
                <div className="review-answer-list">
                  {interviewQuestions.map((question) => (
                    <div key={question.question_id}>
                      <strong>{question.question}</strong>
                      <p>{interview?.answers?.[question.question_id] || "-"}</p>
                    </div>
                  ))}
                </div>
              </article>
            ) : null}
          </div>
        </section>
      ) : null}

      {error ? <div className="alert-banner">{error}</div> : null}

      <div className="flow-actions">
        <button className="button button-ghost" disabled={step === 0 || loadingProfile || loadingInterview} type="button" onClick={() => setStep(step - 1)}>
          {copy.back}
        </button>
        {step < stepLabels.length - 1 ? (
          <button className="button" disabled={!canContinue || loadingInterview} type="button" onClick={handleNext}>
            {step === 2 ? copy.findQuestions : copy.continue}
          </button>
        ) : (
          <button className="button" disabled={loadingProfile} type="button" onClick={handleSubmit}>
            {loadingProfile ? copy.generatingProfile : copy.generateProfile}
          </button>
        )}
      </div>
    </section>
  );
}
