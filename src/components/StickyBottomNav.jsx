import React, { useState, useEffect, useRef } from 'react';
import {
  Mic,
  Check,
  ShoppingBag,
  Home,
  Store,
  Clock,
  Sparkles,
  Volume2,
  AlertCircle,
  QrCode
} from 'lucide-react';
import { parseVoiceOrder } from '../utils/voiceNLP';
import { triggerHaptic } from '../utils/haptics';

export default function StickyBottomNav({
  activeTab,
  onSelectTab,
  onOpenCart,
  cartCount = 0,
  cartItems = [],
  onVoiceOrderSuccess,
  showNotification,
}) {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [successState, setSuccessState] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(true);
  const [audioLevel, setAudioLevel] = useState([40, 70, 95, 60, 85, 50]);

  const recognitionRef = useRef(null);
  const isHeldDownRef = useRef(false);
  const silenceTimerRef = useRef(null);
  const audioAnimationRef = useRef(null);

  // Initialize Web Speech API
  useEffect(() => {
    const SpeechRecognition =
      window.SpeechRecognition ||
      window.webkitSpeechRecognition ||
      null;

    if (!SpeechRecognition) {
      console.warn('[Web Speech API] SpeechRecognition not supported natively in this browser.');
      setSpeechSupported(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-IN';
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        console.log('[Web Speech API] Microphone active. Listening...');
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
          console.log('[Web Speech API] Final Transcript:', final);
          setTranscript(final);
          setInterimTranscript('');
          
          // Reset silence timer on speech
          if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
          silenceTimerRef.current = setTimeout(() => {
            if (!isHeldDownRef.current) {
              stopListeningAndProcess(final);
            }
          }, 1200);
        }
      };

      recognition.onerror = (event) => {
        console.warn('[Web Speech API] Recognition error:', event.error);
        if (event.error !== 'no-speech') {
          setIsListening(false);
        }
      };

      recognition.onend = () => {
        console.log('[Web Speech API] Recognition session ended');
        // Only mark listening false if not intentionally restarting
        if (!isHeldDownRef.current) {
          setIsListening(false);
        }
      };

      recognitionRef.current = recognition;
    } catch (err) {
      console.error('[Web Speech API] Failed to initialize recognition:', err);
      setSpeechSupported(false);
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

  // Expose global simulator for automated end-to-end testing and fallback
  useEffect(() => {
    window.__simulateVoiceOrder = (speechText) => {
      console.log('[Voice Simulator] Received simulated speech:', speechText);
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
  }, [onVoiceOrderSuccess]);

  // Audio wave visualizer animation while listening
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

  // Start speech capture
  const startListening = () => {
    triggerHaptic(40);
    setTranscript('');
    setInterimTranscript('');
    setSuccessState(false);
    setIsListening(true);

    if (recognitionRef.current) {
      try {
        recognitionRef.current.start();
      } catch (e) {
        console.warn('Start recognition caught:', e.message);
      }
    }
  };

  // Stop listening and run NLP
  const stopListeningAndProcess = (overrideText = null) => {
    setIsListening(false);
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (_) {}
    }

    const textToProcess = overrideText || transcript || interimTranscript;
    console.log('[Voice-to-Cart NLP] Processing speech transcript:', textToProcess);

    if (!textToProcess || !textToProcess.trim()) {
      return;
    }

    // Run Natural Language Processing
    const nlpResult = parseVoiceOrder(textToProcess);
    console.log('[Voice-to-Cart NLP] Parsed Result:', nlpResult);

    if (nlpResult.success && nlpResult.matchedItems.length > 0) {
      // 1. Success haptic pop
      triggerHaptic([40, 60, 40]);

      // 2. Turn mic button into green checkmark briefly
      setSuccessState(true);
      setTimeout(() => {
        setSuccessState(false);
        setTranscript('');
        setInterimTranscript('');
      }, 2500);

      // 3. Drop parsed items automatically into the cart
      if (onVoiceOrderSuccess) {
        onVoiceOrderSuccess(nlpResult.matchedItems, nlpResult.toastMessage);
      }

      // 4. Trigger required toast notification
      if (showNotification) {
        showNotification(nlpResult.toastMessage);
      }
    } else {
      triggerHaptic(80);
      if (showNotification) {
        showNotification(nlpResult.toastMessage || 'Could not understand order. Try again!');
      }
    }
  };

  // Press-and-hold handlers for Mouse and Touch
  const handlePressStart = (e) => {
    e.preventDefault();
    isHeldDownRef.current = true;
    startListening();
  };

  const handlePressEnd = (e) => {
    e.preventDefault();
    if (isHeldDownRef.current) {
      isHeldDownRef.current = false;
      setTimeout(() => {
        stopListeningAndProcess();
      }, 250);
    }
  };

  return (
    <>
      {/* Live Transcript / Speech Wave Floating Bubble (Appears directly above Mic while listening) */}
      {isListening && (
        <div
          id="voice-speech-bubble"
          aria-live="polite"
          className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 w-[90%] max-w-md bg-gray-950/95 backdrop-blur-xl border-2 border-purple-500/80 rounded-2xl p-4 shadow-2xl animate-in zoom-in-95 duration-200 text-white flex flex-col gap-2"
        >
          <div className="flex items-center justify-between gap-2 border-b border-gray-800 pb-2">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping" />
              <span className="text-xs font-black text-purple-300 tracking-wide uppercase flex items-center gap-1.5">
                <Volume2 className="w-3.5 h-3.5 text-purple-400" />
                Listening to Campus Voice Order...
              </span>
            </div>
            {/* Live animated waveform bars */}
            <div className="flex items-center gap-1 h-4">
              {audioLevel.map((lvl, i) => (
                <div
                  key={i}
                  className="w-1 bg-gradient-to-t from-purple-500 to-amber-400 rounded-full transition-all duration-100"
                  style={{ height: `${lvl}%` }}
                />
              ))}
            </div>
          </div>

          <div className="py-1">
            <p className="text-sm font-semibold text-gray-100 italic">
              "{interimTranscript || transcript || 'Speak now (e.g. "Get me two samosas and a cold coffee")...'}"
            </p>
          </div>

          <div className="flex items-center justify-between text-[11px] text-gray-400 pt-1">
            <span>Release mic button when finished</span>
            <button
              onClick={() => stopListeningAndProcess()}
              className="text-amber-400 hover:text-amber-300 font-bold underline cursor-pointer"
            >
              Done Speaking
            </button>
          </div>
        </div>
      )}

      {/* Sticky Bottom Navigation Bar Container */}
      <nav
        id="sticky-bottom-navigation"
        aria-label="Campus Mobile & Voice Navigation"
        className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-gray-200 shadow-[0_-4px_25px_rgba(0,0,0,0.06)] px-2 sm:px-6 py-1.5 flex items-center justify-around select-none"
      >
        {/* Tab 1: Home */}
        <button
          id="bottom-nav-home"
          onClick={() => onSelectTab?.('home')}
          className={`flex flex-col items-center justify-center flex-1 py-1.5 transition-colors cursor-pointer ${
            activeTab === 'home'
              ? 'text-[#6b21a8] font-black'
              : 'text-gray-500 hover:text-gray-900 font-medium'
          }`}
        >
          <Home className={`w-5 h-5 ${activeTab === 'home' ? 'stroke-[2.5px]' : 'stroke-2'}`} />
          <span className="text-[11px] mt-1">Home</span>
        </button>

        {/* Tab 2: Shops / Menu */}
        <button
          id="bottom-nav-shops"
          onClick={() => onSelectTab?.('shops')}
          className={`flex flex-col items-center justify-center flex-1 py-1.5 transition-colors cursor-pointer ${
            activeTab === 'shops'
              ? 'text-[#6b21a8] font-black'
              : 'text-gray-500 hover:text-gray-900 font-medium'
          }`}
        >
          <Store className={`w-5 h-5 ${activeTab === 'shops' ? 'stroke-[2.5px]' : 'stroke-2'}`} />
          <span className="text-[11px] mt-1">Menu</span>
        </button>

        {/* PROMINENT CENTER MICROPHONE BUTTON (Voice-to-Cart) */}
        <div className="relative flex flex-col items-center justify-center px-2">
          {/* Ambient Glow Aura */}
          <div
            className={`absolute -top-6 w-20 h-20 rounded-full transition-all duration-300 pointer-events-none ${
              isListening
                ? 'bg-gradient-to-tr from-purple-600 via-pink-600 to-amber-500 opacity-60 blur-xl scale-125 animate-pulse'
                : successState
                ? 'bg-emerald-500 opacity-50 blur-xl scale-110'
                : 'bg-purple-600 opacity-20 blur-lg group-hover:opacity-40'
            }`}
          />

          {/* Elevated Circular Mic Button */}
          <button
            id="voice-mic-button"
            aria-label="Voice Order: Hold down to speak"
            title="Hold down to order with Voice (e.g. 'Get me two samosas and a cold coffee')"
            onMouseDown={handlePressStart}
            onMouseUp={handlePressEnd}
            onTouchStart={handlePressStart}
            onTouchEnd={handlePressEnd}
            onClick={() => {
              // Click toggle support for quick interaction
              if (!isListening) {
                startListening();
                if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
                silenceTimerRef.current = setTimeout(() => {
                  stopListeningAndProcess();
                }, 4500);
              } else {
                stopListeningAndProcess();
              }
            }}
            className={`relative -top-5 w-16 h-16 sm:w-17 sm:h-17 rounded-full flex items-center justify-center text-white shadow-2xl transition-all duration-300 cursor-pointer focus:outline-none select-none active:scale-95 ${
              successState
                ? 'bg-emerald-600 scale-105 shadow-[0_0_25px_rgba(16,185,129,0.8)] ring-4 ring-emerald-300'
                : isListening
                ? 'bg-gradient-to-tr from-purple-700 via-pink-600 to-orange-500 scale-115 ring-4 ring-purple-300/80 animate-pulse'
                : 'bg-gradient-to-tr from-[#6b21a8] to-indigo-600 hover:scale-105 shadow-[0_10px_25px_rgba(107,33,168,0.4)] ring-4 ring-white'
            }`}
          >
            {/* Visual Ripple Rings while listening */}
            {isListening && (
              <span className="absolute inset-0 rounded-full border-2 border-white/80 animate-ping pointer-events-none" />
            )}

            {/* Icon Transformation: Mic -> Green Checkmark on success */}
            {successState ? (
              <div id="voice-success-checkmark" className="flex items-center justify-center animate-in zoom-in-75 duration-200">
                <Check className="w-8 h-8 text-white stroke-[3.5px]" />
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center">
                <Mic className={`w-7 h-7 text-white transition-transform ${isListening ? 'scale-110 text-amber-200 animate-bounce' : ''}`} />
              </div>
            )}
          </button>

          {/* Under-button label pill */}
          <div className="absolute -bottom-1 flex items-center justify-center">
            <span
              id="voice-mic-status-label"
              className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full transition-colors ${
                successState
                  ? 'bg-emerald-100 text-emerald-800'
                  : isListening
                  ? 'bg-purple-100 text-purple-900 animate-pulse'
                  : 'text-gray-500 hover:text-purple-700'
              }`}
            >
              {successState ? 'Added!' : isListening ? 'Listening...' : 'Voice Order'}
            </span>
          </div>
        </div>

        {/* Tab 3: My Orders */}
        <button
          id="bottom-nav-orders"
          onClick={() => onSelectTab?.('orders')}
          className={`flex flex-col items-center justify-center flex-1 py-1.5 transition-colors cursor-pointer ${
            activeTab === 'orders'
              ? 'text-[#6b21a8] font-black'
              : 'text-gray-500 hover:text-gray-900 font-medium'
          }`}
        >
          <Clock className={`w-5 h-5 ${activeTab === 'orders' ? 'stroke-[2.5px]' : 'stroke-2'}`} />
          <span className="text-[11px] mt-1">Orders</span>
        </button>

        {/* Tab 4: Cart */}
        <button
          id="bottom-nav-cart"
          onClick={onOpenCart}
          className="relative flex flex-col items-center justify-center flex-1 py-1.5 text-gray-700 hover:text-[#6b21a8] transition-colors cursor-pointer"
        >
          <div className="relative">
            <ShoppingBag className="w-5 h-5" />
            {cartCount > 0 && (
              <span
                id="bottom-nav-cart-badge"
                className="absolute -top-1.5 -right-2.5 bg-[#6b21a8] text-white text-[10px] font-black w-4.5 h-4.5 rounded-full flex items-center justify-center shadow-xs animate-in zoom-in"
              >
                {cartCount}
              </span>
            )}
          </div>
          <span className="text-[11px] mt-1 font-semibold">Cart</span>
        </button>
      </nav>
    </>
  );
}
