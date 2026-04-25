import { useEffect, useRef, useState } from "react";


export function useSpeechInput({ lang, onTranscript }) {
  const recognitionRef = useRef(null);
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (typeof window === "undefined") {
      return undefined;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setSupported(false);
      return undefined;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setError("");
      setListening(true);
    };

    recognition.onresult = (event) => {
      const transcript = Array.from(event.results)
        .map((result) => result[0]?.transcript || "")
        .join(" ")
        .trim();
      if (transcript) {
        onTranscript(transcript, event.results[event.results.length - 1]?.isFinal || false);
      }
    };

    recognition.onerror = (event) => {
      setListening(false);
      setError(event.error || "Speech recognition error");
    };

    recognition.onend = () => {
      setListening(false);
    };

    recognitionRef.current = recognition;
    setSupported(true);

    return () => {
      recognition.abort();
    };
  }, [onTranscript]);

  useEffect(() => {
    if (recognitionRef.current) {
      recognitionRef.current.lang = lang;
    }
  }, [lang]);

  function startListening() {
    if (!recognitionRef.current) {
      return;
    }
    setError("");
    recognitionRef.current.lang = lang;
    try {
      recognitionRef.current.start();
    } catch (err) {
      setError(err?.message || "Unable to start voice input");
    }
  }

  function stopListening() {
    recognitionRef.current?.stop();
  }

  return {
    supported,
    listening,
    error,
    startListening,
    stopListening,
  };
}
