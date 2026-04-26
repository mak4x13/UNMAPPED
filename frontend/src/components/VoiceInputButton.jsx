import { getVoiceGuidance } from "../config/locales";
import { useSpeechInput } from "../hooks/useSpeechInput";


export default function VoiceInputButton({
  label,
  speechTag,
  locale,
  voiceLocale,
  onTranscript,
  compact = false,
  buttonText,
  listeningText,
}) {
  const { supported, listening, error, startListening, stopListening } = useSpeechInput({
    lang: speechTag,
    onTranscript,
  });

  if (!supported) {
    return (
      <div className="speech-note muted">
        {label.speechUnsupported}
      </div>
    );
  }

  return (
    <div className={compact ? "voice-inline" : "voice-block"}>
      <button className={listening ? "voice-button is-listening" : "voice-button"} type="button" onClick={listening ? stopListening : startListening}>
        <span>{listening ? (listeningText || label.listening) : (buttonText || label.speechButton)}</span>
      </button>
      <p className="speech-note">{error || getVoiceGuidance(locale, voiceLocale)}</p>
    </div>
  );
}
