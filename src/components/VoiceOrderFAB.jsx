import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, Check, Volume2, Sparkles } from 'lucide-react';
import { parseVoiceOrder } from '../utils/voiceNLP';
import { triggerHaptic } from '../utils/haptics';

/**
 * VoiceOrderFAB
 * Floating Action Button (FAB) hovering globally just above the BottomNavigationBar.
 * Contains Web Speech API voice-to-cart recognition, audio waveform visualization,
 * lightweight NLP parsing for campus menu items, and simulated order support for tests.
 */
export default function VoiceOrderFAB({
  onVoiceOrderSuccess,
  showNotification,
}) {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [successState, setSuccessState] = useState(false);
  const [audioLevel, setAudioLevel] = useState([35, 65, 90, 55, 80, 45]);

  const recognitionRef = useRef(null);
  const isHeldDownRef = useRef(false);
  const silenceTimerRef = useRef(null);
  const audioAnimationRef = useRef(null);

  // Initialize native Web Speech API if supported
  useEffect(() => {
    const SpeechRecognition =
      typeof window !== 'undefined' &&
      (window.SpeechRecognition || window.webkitSpeechRecognition || null);

    if (!SpeechRecognition) {
      console.warn('[Voice FAB] SpeechRecognition not natively supported; simulator active.');
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-IN';
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event) => {
        let interim = '';
        let final = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const trans = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            final += trans;
          } else {
            interim += trans;
          }
        }

        if (interim) {
          setInterimTranscript(interim);
        }

        if (final) {
          setTranscript(final);
          setInterimTranscript('');

          if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
          silenceTimerRef.current = setTimeout(() => {
            if (!isHeldDownRef.current) {
              stopListeningAndProcess(final);
            }
          }, 1200);
        }
      };

      recognition.onerror = (event) => {
        if (event.error !== 'no-speech') {
          setIsListening(false);
        }
      };

      recognition.onend = () => {
        if (!isHeldDownRef.current) {
          setIsListening(false);
        }
      };

      recognitionRef.current = recognition;
    } catch (err) {
      console.error('[Voice FAB] SpeechRecognition init failed:', err);
    }

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch (_) {}
      }
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      if (audioAnimationRef.current) clearInterval(audioAnimationRef.current);
    };
  }, []);

  // Expose global simulator for Puppeteer and browser fallback
  useEffect(() => {
    window.__simulateVoiceOrder = (speechText) => {
      console.log('[Voice Simulator] Received simulation:', speechText);
      setTranscript(speechText);
      setInterimTranscript(speechText);
      setIsListening(true);
      setTimeout(() => {
        stopListeningAndProcess(speechText);
      }, 350);
    };

    return () => {
      delete window.__simulateVoiceOrder;
    };
  }, [onVoiceOrderSuccess, showNotification]);

  // Audio wave visualizer animation
  useEffect(() => {
    if (isListening) {
      audioAnimationRef.current = setInterval(() => {
        setAudioLevel([
          Math.floor(25 + Math.random() * 70),
          Math.floor(40 + Math.random() * 60),
          Math.floor(55 + Math.random() * 45),
          Math.floor(30 + Math.random() * 70),
          Math.floor(50 + Math.random() * 50),
          Math.floor(35 + Math.random() * 65),
        ]);
      }, 100);
    } else {
      if (audioAnimationRef.current) clearInterval(audioAnimationRef.current);
    }

    return () => {
      if (audioAnimationRef.current) clearInterval(audioAnimationRef.current);
    };
  }, [isListening]);

  const startListening = () => {
    triggerHaptic(40);
    setTranscript('');
    setInterimTranscript('');
    setSuccessState(false);
    setIsListening(true);

    if (recognitionRef.current) {
      try {
        recognitionRef.current.start();
      } catch (_) {}
    }
  };

  const stopListeningAndProcess = (overrideText = null) => {
    setIsListening(false);
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (_) {}
    }

    const textToProcess = overrideText || transcript || interimTranscript;
    if (!textToProcess || !textToProcess.trim()) {
      return;
    }

    // Run Natural Language Processing
    const nlpResult = parseVoiceOrder(textToProcess);

    if (nlpResult.success && nlpResult.matchedItems.length > 0) {
      triggerHaptic([40, 60, 40]);
      setSuccessState(true);
      setTimeout(() => {
        setSuccessState(false);
        setTranscript('');
        setInterimTranscript('');
      }, 2500);

      if (onVoiceOrderSuccess) {
        onVoiceOrderSuccess(nlpResult.matchedItems, nlpResult.toastMessage);
      }

      if (showNotification) {
        showNotification(nlpResult.toastMessage);
      }

      // Dispatch custom event to trigger Cart icon bounce in BottomNavigationBar
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('bounce-cart-nav'));
      }
    } else {
      triggerHaptic(80);
      if (showNotification) {
        showNotification(nlpResult.toastMessage || 'Could not understand order. Try saying "Get me 2 samosas"!');
      }
    }
  };

  const handlePressStart = (e) => {
    isHeldDownRef.current = true;
    startListening();
  };

  const handlePressEnd = (e) => {
    if (isHeldDownRef.current) {
      isHeldDownRef.current = false;
      setTimeout(() => {
        stopListeningAndProcess();
      }, 250);
    }
  };

  const handleClick = (e) => {
    if (isListening) {
      stopListeningAndProcess();
    } else if (!isHeldDownRef.current) {
      startListening();
    }
  };

  return (
    <>
      {/* Floating Listening Bubble / Waveform Visualizer */}
      <AnimatePresence>
        {isListening && (
          <motion.div
            id="voice-speech-bubble"
            aria-live="polite"
            initial={{ opacity: 0, y: 15, scale: 0.92 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.95 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="fixed bottom-36 right-4 sm:right-6 md:right-8 z-50 w-[90vw] max-w-sm bg-gray-950/95 backdrop-blur-xl border-2 border-[#164e3d]/80 rounded-2xl p-4 shadow-2xl text-white flex flex-col gap-2.5"
          >
            <div className="flex items-center justify-between gap-2 border-b border-gray-800 pb-2">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping" />
                <span className="text-xs font-black text-emerald-300 tracking-wide uppercase flex items-center gap-1.5">
                  <Volume2 className="w-3.5 h-3.5 text-emerald-400" />
                  Listening to Voice Order...
                </span>
              </div>
              {/* Live animated waveform bars */}
              <div className="flex items-center gap-1 h-4">
                {audioLevel.map((lvl, i) => (
                  <div
                    key={i}
                    className="w-1 bg-gradient-to-t from-[#164e3d] to-[#be185d] rounded-full transition-all duration-100"
                    style={{ height: `${lvl}%` }}
                  />
                ))}
              </div>
            </div>

            <p className="text-xs sm:text-sm font-semibold text-gray-100 italic leading-snug">
              "{interimTranscript || transcript || 'Speak now (e.g. "Get me two samosas and a cold coffee")...'}"
            </p>

            <div className="flex items-center justify-between text-[11px] text-gray-400 pt-1 border-t border-gray-800/80">
              <span>Hold to speak or tap Done</span>
              <button
                type="button"
                onClick={() => stopListeningAndProcess()}
                className="text-[#fb7185] hover:text-[#fda4af] font-bold underline cursor-pointer"
              >
                Done Speaking
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Global Floating Action Button (FAB) Hovering Above Bottom Navigation */}
      <motion.div
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 350, damping: 22, delay: 0.1 }}
        className="fixed bottom-20 right-4 sm:right-6 md:right-8 z-40 flex flex-col items-end pointer-events-auto"
      >
        <motion.button
          id="voice-mic-button"
          aria-label="Order food by voice"
          type="button"
          onMouseDown={handlePressStart}
          onMouseUp={handlePressEnd}
          onTouchStart={handlePressStart}
          onTouchEnd={handlePressEnd}
          onClick={handleClick}
          whileHover={{ scale: 1.06 }}
          whileTap={{ scale: 0.94 }}
          className={`group relative flex items-center gap-2 px-3.5 sm:px-4 py-2.5 sm:py-3 rounded-full shadow-2xl transition-all duration-300 cursor-pointer border select-none ${
            successState
              ? 'bg-emerald-600 text-white border-emerald-400 ring-4 ring-emerald-300/40 shadow-emerald-600/40'
              : isListening
              ? 'bg-gradient-to-r from-red-600 to-rose-600 text-white border-red-400 ring-4 ring-red-400/50 animate-pulse shadow-red-600/40'
              : 'bg-gradient-to-r from-[#164e3d] via-[#1f5c49] to-[#2d6a4f] hover:from-[#133f32] hover:to-[#164e3d] text-white border-emerald-400/30 ring-2 ring-white/90 shadow-[#164e3d]/35 hover:shadow-[#164e3d]/50'
          }`}
        >
          {successState ? (
            <Check id="voice-success-checkmark" className="w-5 h-5 text-white stroke-[3] animate-in zoom-in-75" />
          ) : (
            <div className="relative">
              <Mic className={`w-5 h-5 ${isListening ? 'animate-bounce text-white' : 'text-emerald-200'}`} />
            </div>
          )}

          <span
            id="voice-mic-status-label"
            className="text-xs sm:text-sm font-extrabold tracking-tight whitespace-nowrap"
          >
            {successState ? 'Added to Cart!' : isListening ? 'Listening...' : 'Voice Order'}
          </span>

          {/* Idle pulsing beacon when not listening */}
          {!isListening && !successState && (
            <span className="absolute -top-1 -right-1 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#be185d] opacity-75" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-[#d81b60]" />
            </span>
          )}
        </motion.button>
      </motion.div>
    </>
  );
}
