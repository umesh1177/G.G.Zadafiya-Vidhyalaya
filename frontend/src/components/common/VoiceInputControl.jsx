import React, { useState, useRef, useEffect } from 'react';
import GujaratiVirtualKeyboard from './GujaratiVirtualKeyboard';

/**
 * VoiceInputControl
 * Reusable Voice-to-Text & Gujarati Virtual Keyboard toolbar.
 * Supports:
 * - Speech-to-Text in Gujarati (gu-IN) and English (en-IN / en-US)
 * - Live interim transcript preview
 * - Seamless Gujarati virtual keyboard popover/inline
 * - Cursor-aware text insertion into any input or textarea
 *
 * Props:
 * - value: string (current input value)
 * - onChange: (newVal: string) => void
 * - inputRef: React.RefObject<HTMLInputElement | HTMLTextAreaElement> (optional, for caret insertion)
 * - defaultLang: 'gu-IN' | 'en-IN' (default: 'gu-IN')
 * - compact: boolean (if true, shows streamlined icon-only buttons)
 * - position: 'bottom' | 'top' (where keyboard renders)
 */
export default function VoiceInputControl({
  value = '',
  onChange,
  inputRef,
  defaultLang = 'gu-IN',
  compact = false,
  position = 'bottom',
}) {
  const [selectedLang, setSelectedLang] = useState(defaultLang);
  const [isRecording, setIsRecording] = useState(false);
  const [interimText, setInterimText] = useState('');
  const [statusMsg, setStatusMsg] = useState('');
  const [showKeyboard, setShowKeyboard] = useState(false);

  const recognitionRef = useRef(null);

  // Clean up speech recognition on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {
          // ignore
        }
      }
    };
  }, []);

  // Insert recognized speech at cursor position or append
  const appendSpeechText = (spokenText) => {
    if (!spokenText || !spokenText.trim()) return;

    const trimmed = spokenText.trim();
    const el = inputRef?.current;

    if (el && typeof el.selectionStart === 'number') {
      const start = el.selectionStart;
      const end = el.selectionEnd;
      const before = value.substring(0, start);
      const after = value.substring(end);

      // Add leading space if before text exists and doesn't end with space/newline
      const leadSpace = before.length > 0 && !/\s$/.test(before) ? ' ' : '';
      const trailSpace = after.length > 0 && !/^\s/.test(after) ? ' ' : ' ';

      const insertStr = leadSpace + trimmed + trailSpace;
      const updated = before + insertStr + after;
      onChange(updated);

      setTimeout(() => {
        try {
          el.focus();
          const newPos = start + insertStr.length;
          el.setSelectionRange(newPos, newPos);
        } catch {
          // ignore
        }
      }, 0);
    } else {
      const leadSpace = value && value.length > 0 && !/\s$/.test(value) ? ' ' : '';
      onChange(value + leadSpace + trimmed + ' ');
    }
  };

  const startListening = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setStatusMsg('તમારા બ્રાઉઝરમાં Voice Recognition સપોર્ટ નથી. કૃપા કરીને Chrome અથવા Edge વાપરો.');
      setTimeout(() => setStatusMsg(''), 5000);
      return;
    }

    if (isRecording && recognitionRef.current) {
      stopListening();
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = selectedLang;
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        setIsRecording(true);
        setStatusMsg(
          selectedLang === 'gu-IN'
            ? '🎙️ સાંભળે છે... (ગુજરાતીમાં બોલો)'
            : '🎙️ Listening... (Speak in English)'
        );
        setInterimText('');
      };

      recognition.onresult = (event) => {
        let interim = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const res = event.results[i];
          if (res.isFinal) {
            const finalSpeech = res[0].transcript;
            appendSpeechText(finalSpeech);
            setInterimText('');
          } else {
            interim += res[0].transcript;
          }
        }
        if (interim) {
          setInterimText(interim);
        }
      };

      recognition.onerror = (event) => {
        console.warn('SpeechRecognition error:', event.error);
        if (event.error === 'not-allowed') {
          setStatusMsg('⚠️ માઇક્રોફોન પરવાનગી આપો (Allow microphone permission in browser)');
        } else if (event.error === 'no-speech') {
          // benign timeout
        } else {
          setStatusMsg(`⚠️ Voice input error: ${event.error}`);
        }
        setTimeout(() => setStatusMsg(''), 4500);
      };

      recognition.onend = () => {
        setIsRecording(false);
        setInterimText('');
        setStatusMsg('');
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      console.error('Failed to start speech recognition:', err);
      setIsRecording(false);
      setStatusMsg('⚠️ અવાજ રેકોર્ડિંગ શરૂ થઈ શક્યું નથી');
      setTimeout(() => setStatusMsg(''), 4000);
    }
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // ignore
      }
    }
    setIsRecording(false);
    setInterimText('');
    setStatusMsg('');
  };

  return (
    <div className="voice-input-control-wrapper" style={{ marginTop: 6, marginBottom: 6 }}>
      {/* Action Toolbar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 6,
          background: isRecording ? '#FEF2F2' : '#F8FAFC',
          border: isRecording ? '1px solid #FCA5A5' : '1px solid #E2E8F0',
          borderRadius: 8,
          padding: '4px 8px',
          transition: 'all 0.2s ease',
        }}
      >
        {/* Language Toggle: Gujarati / English */}
        <div
          style={{
            display: 'inline-flex',
            borderRadius: 6,
            background: '#FFFFFF',
            border: '1px solid #CBD5E1',
            padding: 2,
            gap: 2,
          }}
        >
          <button
            type="button"
            onClick={() => {
              setSelectedLang('gu-IN');
              if (isRecording) {
                stopListening();
              }
            }}
            style={{
              padding: '3px 8px',
              fontSize: 11.5,
              fontWeight: selectedLang === 'gu-IN' ? 700 : 500,
              borderRadius: 4,
              border: 'none',
              background: selectedLang === 'gu-IN' ? '#0284C7' : 'transparent',
              color: selectedLang === 'gu-IN' ? '#FFFFFF' : '#475569',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
            }}
            title="બોલવાની ભાષા: ગુજરાતી"
          >
            <span>🇮🇳</span>
            <span>ગુજરાતી</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setSelectedLang('en-IN');
              if (isRecording) {
                stopListening();
              }
            }}
            style={{
              padding: '3px 8px',
              fontSize: 11.5,
              fontWeight: selectedLang === 'en-IN' ? 700 : 500,
              borderRadius: 4,
              border: 'none',
              background: selectedLang === 'en-IN' ? '#0284C7' : 'transparent',
              color: selectedLang === 'en-IN' ? '#FFFFFF' : '#475569',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
            }}
            title="Voice Language: English"
          >
            <span>🇬🇧</span>
            <span>English</span>
          </button>
        </div>

        {/* Microphone Button */}
        <button
          type="button"
          onClick={isRecording ? stopListening : startListening}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: compact ? '4px 8px' : '4px 10px',
            fontSize: 12,
            fontWeight: 700,
            borderRadius: 6,
            border: isRecording ? '1px solid #EF4444' : '1px solid #0284C7',
            background: isRecording ? '#EF4444' : '#0284C7',
            color: '#FFFFFF',
            cursor: 'pointer',
            boxShadow: isRecording ? '0 0 10px rgba(239, 68, 68, 0.4)' : 'none',
            transition: 'all 0.2s ease',
          }}
          title={isRecording ? 'Click to Stop Recording' : 'Click to Speak (Voice-to-Text)'}
        >
          <span style={{ fontSize: 13 }}>{isRecording ? '⏹' : '🎙️'}</span>
          <span>
            {isRecording
              ? 'બોલવાનું બંધ કરો (Stop)'
              : selectedLang === 'gu-IN'
              ? 'બોલીને લખો (Voice)'
              : 'Voice Dictate'}
          </span>
        </button>

        {/* Gujarati Keyboard Toggle Button */}
        <button
          type="button"
          onClick={() => setShowKeyboard((prev) => !prev)}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 5,
            padding: compact ? '4px 8px' : '4px 10px',
            fontSize: 12,
            fontWeight: 600,
            borderRadius: 6,
            border: showKeyboard ? '1px solid #0284C7' : '1px solid #CBD5E1',
            background: showKeyboard ? '#E0F2FE' : '#FFFFFF',
            color: showKeyboard ? '#0369A1' : '#334155',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
          title="ગુજરાતી કીબોર્ડ ખોલો/બંધ કરો (Toggle Gujarati Virtual Keyboard)"
        >
          <span style={{ fontSize: 13 }}>⌨️</span>
          <span>ગુજરાતી કીબોર્ડ</span>
          <span style={{ fontSize: 10, color: '#64748B' }}>{showKeyboard ? '▲' : '▼'}</span>
        </button>

        {/* Status / Listening Badge */}
        {isRecording && (
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              fontSize: 11.5,
              fontWeight: 700,
              color: '#DC2626',
              background: '#FEE2E2',
              padding: '2px 8px',
              borderRadius: 12,
            }}
          >
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: '#DC2626',
                display: 'inline-block',
                animation: 'pulse 1s infinite',
              }}
            />
            {statusMsg || 'Listening...'}
          </div>
        )}

        {statusMsg && !isRecording && (
          <span style={{ fontSize: 11.5, color: '#64748B', fontWeight: 500 }}>
            {statusMsg}
          </span>
        )}
      </div>

      {/* Real-time Interim Voice Preview */}
      {isRecording && interimText && (
        <div
          style={{
            marginTop: 6,
            padding: '6px 10px',
            borderRadius: 6,
            background: '#FEF3C7',
            border: '1px dashed #F59E0B',
            fontSize: 12.5,
            color: '#92400E',
            fontStyle: 'italic',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <span style={{ fontStyle: 'normal' }}>👂</span>
          <span>{interimText}</span>
        </div>
      )}

      {/* Render Gujarati Virtual Keyboard if expanded */}
      {showKeyboard && (
        <GujaratiVirtualKeyboard
          value={value}
          onChange={onChange}
          inputRef={inputRef}
          onClose={() => setShowKeyboard(false)}
          inline={true}
        />
      )}
    </div>
  );
}

