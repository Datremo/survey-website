import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "../../lib/supabase";

type QuestionType = "mcq" | "text" | "rating";

interface Question {
  id: string;
  type: QuestionType;
  question: string;
  options?: string[];
}

export default function FormBuilder() {
  const navigate = useNavigate();
  const location = useLocation();
  const editSurvey = location.state?.editSurvey;

  const [title, setTitle] = useState(editSurvey?.title || "Untitled Survey");
  const [questions, setQuestions] = useState<Question[]>(
    editSurvey?.form_schema || [{ id: "q1", type: "text", question: "", options: ["", ""] }]
  );
  const [isSaving, setIsSaving] = useState(false);

  const generateId = () => Math.random().toString(36).substring(2, 9);
  const addQuestion = () => setQuestions([...questions, { id: generateId(), type: "text", question: "" }]);
  const removeQuestion = (id: string) => setQuestions(questions.filter(q => q.id !== id));
  const updateQuestionText = (id: string, text: string) => setQuestions(questions.map(q => q.id === id ? { ...q, question: text } : q));
  
  const changeQuestionType = (id: string, type: QuestionType) => {
    setQuestions(questions.map(q => q.id === id ? { ...q, type, options: type === "mcq" ? ["", ""] : undefined } : q));
  };

  const addOption = (questionId: string) => setQuestions(questions.map(q => q.id === questionId && q.options ? { ...q, options: [...q.options, ""] } : q));
  const updateOption = (qId: string, optIdx: number, text: string) => setQuestions(questions.map(q => q.id === qId && q.options ? { ...q, options: q.options.map((o, i) => i === optIdx ? text : o) } : q));
  const removeOption = (qId: string, optIdx: number) => setQuestions(questions.map(q => q.id === qId && q.options ? { ...q, options: q.options.filter((_, i) => i !== optIdx) } : q));

  const handleSave = async () => {
    setIsSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return navigate("/");

    if (editSurvey) {
      const { error } = await supabase.from('surveys').update({ title, form_schema: questions }).eq('id', editSurvey.id);
      if (error) alert(error.message); else navigate("/admin");
    } else {
      const shortCode = generateId();
      const { error } = await supabase.from('surveys').insert([{ title, short_code: shortCode, form_schema: questions, user_id: user.id }]);
      if (error) alert(error.message); else {
        navigator.clipboard.writeText(`${window.location.origin}/s/${shortCode}`);
        alert("Published! Link copied to clipboard.");
        navigate("/admin");
      }
    }
    setIsSaving(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50 pb-16 font-sans">
      <div className="sticky top-0 z-20 bg-white/80 backdrop-blur-md border-b border-gray-200/50 shadow-sm px-4 py-3 flex justify-between items-center">
        <button onClick={() => navigate("/admin")} className="text-gray-500 hover:text-gray-800 text-sm font-bold px-4 py-1.5 rounded-lg hover:bg-gray-100 transition-colors">Cancel</button>
        <button onClick={handleSave} disabled={isSaving} className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-5 py-2 rounded-xl text-sm font-bold shadow-md transition-all active:scale-95 disabled:opacity-70">
          {isSaving ? "Saving..." : (editSurvey ? "Update Survey" : "Publish Survey")}
        </button>
      </div>

      <div className="max-w-3xl mx-auto p-4 mt-4">
        <div className="mb-6 bg-white/60 p-4 rounded-3xl border border-white shadow-sm">
          <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Survey Title..." className="w-full text-2xl md:text-3xl font-extrabold bg-transparent border-none focus:ring-0 placeholder-gray-400 text-gray-900 outline-none" />
        </div>

        <div className="flex flex-col gap-4">
          {questions.map((q, index) => (
            <div key={q.id} className="bg-white/80 backdrop-blur-md p-5 rounded-3xl shadow-[0_4px_15px_rgb(0,0,0,0.03)] border border-white relative">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-3">
                <div className="flex gap-1.5 bg-gray-100/80 p-1 rounded-lg w-full sm:w-auto overflow-x-auto custom-scrollbar">
                  <button onClick={() => changeQuestionType(q.id, "text")} className={`px-3 py-1.5 text-xs font-bold rounded-md whitespace-nowrap transition-all ${q.type === "text" ? "bg-white text-indigo-600 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>📝 Text</button>
                  <button onClick={() => changeQuestionType(q.id, "mcq")} className={`px-3 py-1.5 text-xs font-bold rounded-md whitespace-nowrap transition-all ${q.type === "mcq" ? "bg-white text-indigo-600 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>🔘 Choice</button>
                  <button onClick={() => changeQuestionType(q.id, "rating")} className={`px-3 py-1.5 text-xs font-bold rounded-md whitespace-nowrap transition-all ${q.type === "rating" ? "bg-white text-indigo-600 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>⭐ Rating</button>
                </div>
                <button onClick={() => removeQuestion(q.id)} className="text-red-500 hover:text-red-700 font-bold text-xs bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-lg transition-colors">Delete</button>
              </div>

              <input type="text" placeholder={`Question ${index + 1}`} value={q.question} onChange={(e) => updateQuestionText(q.id, e.target.value)} className="w-full text-lg font-bold bg-gray-50/50 border border-gray-200 focus:bg-white focus:border-indigo-400 rounded-xl p-3 mb-4 outline-none transition-all shadow-inner" />

              {q.type === "mcq" && (
                <div className="pl-3 border-l-2 border-indigo-100 flex flex-col gap-2">
                  {q.options?.map((opt, optIndex) => (
                    <div key={optIndex} className="flex items-center gap-2">
                      <div className="w-3.5 h-3.5 rounded-full border-2 border-gray-300 bg-white flex-shrink-0" />
                      <input type="text" placeholder={`Option ${optIndex + 1}`} value={opt} onChange={(e) => updateOption(q.id, optIndex, e.target.value)} className="flex-1 bg-gray-50/50 border border-gray-200 focus:bg-white focus:border-indigo-400 rounded-lg p-2.5 text-sm outline-none transition-all font-medium text-gray-700" />
                      {q.options!.length > 2 && <button onClick={() => removeOption(q.id, optIndex)} className="text-gray-400 hover:text-red-500 p-2 bg-gray-50 hover:bg-red-50 rounded-lg font-bold transition-colors text-xs">✕</button>}
                    </div>
                  ))}
                  <button onClick={() => addOption(q.id)} className="self-start mt-2 text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg font-bold text-xs transition-colors">+ Add Option</button>
                </div>
              )}
              {q.type === "rating" && (
                <div className="bg-yellow-50 text-yellow-700 p-3 rounded-xl font-medium text-xs border border-yellow-100 flex items-center gap-2">
                  <span className="text-sm">⭐</span> Collects a 1-5 star rating.
                </div>
              )}
            </div>
          ))}
        </div>

        <button onClick={addQuestion} className="w-full mt-6 border-2 border-dashed border-indigo-200 hover:border-indigo-500 text-indigo-500 font-bold text-sm py-4 rounded-3xl transition-all bg-indigo-50/30 hover:bg-indigo-50 flex justify-center items-center gap-2">
          <span className="text-lg">+</span> Add Question
        </button>
      </div>
    </div>
  );
}