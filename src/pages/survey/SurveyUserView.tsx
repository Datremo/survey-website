// File: src/pages/survey/SurveyUserView.tsx
import { useState, useEffect } from "react";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";

export default function SurveyUserView() {
  const { surveyId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  
  const [survey, setSurvey] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  const [nickname, setNickname] = useState(location.state?.nickname || "");
  const [hasJoined, setHasJoined] = useState(!!location.state?.nickname);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [currentTextAnswer, setCurrentTextAnswer] = useState("");
  const [isDone, setIsDone] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Trigger mobile vibration
  const triggerHaptic = (pattern: number | number[]) => {
    if (navigator.vibrate) navigator.vibrate(pattern);
  };

  useEffect(() => {
    const fetchSurvey = async () => {
      const { data } = await supabase.from('surveys').select('*').eq('short_code', surveyId).single();
      if (data) setSurvey(data);
      setLoading(false);
    };
    fetchSurvey();
  }, [surveyId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="w-16 h-16 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!survey) {
    return (
      <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center p-4 text-white">
        <h1 className="text-3xl font-bold mb-4">Link Expired or Invalid</h1>
        <button onClick={() => navigate("/")} className="bg-indigo-600 px-6 py-3 rounded-xl font-bold">Go Home</button>
      </div>
    );
  }

  const totalQuestions = survey.form_schema.length;
  const progress = Math.round((currentIndex / totalQuestions) * 100);

  if (!hasJoined) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-black flex flex-col justify-center items-center p-6 font-sans">
        <div className="w-full max-w-md bg-white/10 backdrop-blur-xl border border-white/20 p-8 rounded-[2rem] shadow-2xl text-center transform transition-all animate-fade-in-up">
          <div className="bg-indigo-500 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-indigo-500/50">
            <span className="text-3xl">✨</span>
          </div>
          <h1 className="text-3xl font-extrabold text-white mb-2 tracking-tight">{survey.title}</h1>
          <p className="text-indigo-200 mb-8 font-medium">Enter a nickname to start voting anonymously.</p>
          
          <input
            type="text"
            placeholder="Your Nickname"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            className="w-full p-5 mb-4 rounded-2xl bg-white/5 border border-white/10 focus:bg-white/20 focus:border-indigo-400 outline-none text-center text-xl font-bold text-white placeholder-white/40 transition-all shadow-inner"
          />
          <button
            onClick={() => {
              if (nickname.trim()) {
                triggerHaptic(50);
                setHasJoined(true);
              }
            }}
            disabled={!nickname.trim()}
            className="w-full py-5 bg-indigo-500 disabled:bg-white/10 disabled:text-white/30 hover:bg-indigo-400 text-white font-bold text-lg rounded-2xl shadow-[0_0_20px_rgba(99,102,241,0.4)] disabled:shadow-none transition-all active:scale-95"
          >
            Start Survey
          </button>
        </div>
      </div>
    );
  }

  const handleNext = async (answerValue: string) => {
    triggerHaptic(40);
    const questionId = survey.form_schema[currentIndex].id;
    const newAnswers = { ...answers, [questionId]: answerValue };
    setAnswers(newAnswers);
    setCurrentTextAnswer(""); 

    if (currentIndex < totalQuestions - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      setIsSubmitting(true);
      await supabase.from('submissions').insert([{ survey_id: survey.id, nickname, answers: newAnswers }]);
      triggerHaptic([100, 50, 100]); // Success vibration pattern
      setIsSubmitting(false);
      setIsDone(true);
    }
  };

  if (isDone) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-900 to-black flex items-center justify-center p-6 font-sans text-white text-center">
        <div className="w-full max-w-md bg-white/10 backdrop-blur-lg border border-white/20 p-10 rounded-[2rem] animate-fade-in-up">
          <div className="text-7xl mb-6 animate-bounce">🎉</div>
          <h2 className="text-4xl font-extrabold mb-3 bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-purple-400">
            Thanks, {nickname}!
          </h2>
          <p className="text-indigo-200 text-lg mb-10">Your answers have been locked in securely.</p>
          
          <button 
            onClick={() => window.location.assign("/")} 
            className="w-full py-5 bg-white/10 hover:bg-white/20 border border-white/20 text-white font-bold rounded-2xl transition-all active:scale-95 flex items-center justify-center gap-2"
          >
            <span>&larr;</span> Exit Survey
          </button>
        </div>
      </div>
    );
  }

  const currentQuestion = survey.form_schema[currentIndex];

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col font-sans overflow-hidden">
      {/* Sleek Progress Bar */}
      <div className="w-full h-1.5 bg-gray-800">
        <div className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-500 ease-out shadow-[0_0_10px_rgba(99,102,241,0.5)]" style={{ width: `${progress}%` }} />
      </div>

      <div className="flex-1 flex flex-col p-4 max-w-md mx-auto w-full relative justify-center">
        {isSubmitting && (
           <div className="absolute inset-0 z-10 bg-gray-900/80 backdrop-blur-md rounded-[2rem] flex flex-col items-center justify-center border border-white/10">
             <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4"></div>
             <p className="font-bold text-white text-lg">Encrypting & Submitting...</p>
           </div>
        )}

        <div className="text-indigo-400 font-bold mb-4 text-xs tracking-widest uppercase text-center">
          Question {currentIndex + 1} <span className="text-gray-600">/</span> {totalQuestions}
        </div>

        {/* Dynamic Expanding Card */}
        <div className="bg-white/10 backdrop-blur-xl border border-white/10 rounded-[2rem] shadow-2xl p-6 sm:p-8 flex flex-col transition-all">
          <h2 className="text-2xl sm:text-3xl font-extrabold mb-8 text-white leading-tight">
            {currentQuestion.question}
          </h2>
          
          <div className="flex-1 flex flex-col gap-3">
            {currentQuestion.type === "mcq" ? (
              currentQuestion.options?.map((opt: string) => (
                <button 
                  key={opt}
                  onClick={() => handleNext(opt)}
                  className="w-full text-left px-6 py-5 rounded-2xl bg-white/5 hover:bg-indigo-500 text-white font-bold text-lg border border-white/10 hover:border-indigo-400 transition-all duration-200 active:scale-95 group overflow-hidden relative">
                  <span className="relative z-10 group-hover:translate-x-2 transition-transform inline-block">
                    {opt}
                  </span>
                </button>
              ))
            ) : (
              <div className="flex flex-col h-full gap-4">
                <textarea 
                  value={currentTextAnswer}
                  onChange={(e) => setCurrentTextAnswer(e.target.value)}
                  placeholder="Type your answer here..."
                  className="w-full flex-1 min-h-[150px] p-5 rounded-2xl bg-white/5 border border-white/10 focus:bg-white/10 focus:border-indigo-500 outline-none text-white text-lg resize-none placeholder-white/30 transition-all shadow-inner"
                />
                <button 
                  onClick={() => handleNext(currentTextAnswer)}
                  disabled={!currentTextAnswer.trim()}
                  className="w-full py-5 bg-indigo-500 disabled:bg-white/10 hover:bg-indigo-400 disabled:text-white/30 text-white font-bold text-lg rounded-2xl active:scale-95 transition-all shadow-[0_0_15px_rgba(99,102,241,0.3)] disabled:shadow-none">
                  Next &rarr;
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}