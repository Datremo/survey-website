// File: src/pages/admin/FormBuilder.tsx
import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "../../lib/supabase";

type QuestionType = "mcq" | "text";

interface Question {
  id: string;
  type: QuestionType;
  question: string;
  options?: string[];
}

export default function FormBuilder() {
  const navigate = useNavigate();
  const location = useLocation();
  
  // Check if we are editing an existing survey
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
    if (!user) {
      alert("Session expired. Please log in.");
      return navigate("/");
    }

    if (editSurvey) {
      // UPDATE EXISTING
      const { error } = await supabase.from('surveys')
        .update({ title, form_schema: questions })
        .eq('id', editSurvey.id);

      if (error) alert(`Error updating: ${error.message}`);
      else navigate("/admin");
    } else {
      // INSERT NEW
      const shortCode = generateId();
      const { error } = await supabase.from('surveys')
        .insert([{ title, short_code: shortCode, form_schema: questions, user_id: user.id }]);

      if (error) alert(`Error saving: ${error.message}`);
      else {
        navigator.clipboard.writeText(`${window.location.origin}/s/${shortCode}`);
        alert("Survey Saved & Link copied to clipboard!");
        navigate("/admin");
      }
    }
    setIsSaving(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50 pb-24 font-sans">
      
      {/* Sticky Mobile-Friendly Header */}
      <div className="sticky top-0 z-20 bg-white/80 backdrop-blur-xl border-b border-gray-200/50 shadow-sm px-4 py-4 flex justify-between items-center">
        <button onClick={() => navigate("/admin")} className="text-gray-500 hover:text-gray-800 font-bold px-4 py-2 rounded-xl hover:bg-gray-100 transition-colors">
          Cancel
        </button>
        <button 
          onClick={handleSave} 
          disabled={isSaving}
          className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white px-6 md:px-8 py-2.5 rounded-xl font-bold shadow-lg shadow-indigo-500/30 transition-all active:scale-95 disabled:opacity-70">
          {isSaving ? "Saving..." : (editSurvey ? "Update Survey" : "Publish Survey")}
        </button>
      </div>

      <div className="max-w-3xl mx-auto p-4 md:p-6 mt-6">
        <div className="mb-10 bg-white/60 p-6 rounded-[2rem] border border-white shadow-sm">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Enter Survey Title..."
            className="w-full text-3xl md:text-5xl font-extrabold bg-transparent border-none focus:ring-0 placeholder-gray-300 text-gray-900 outline-none"
          />
        </div>

        <div className="flex flex-col gap-6">
          {questions.map((q, index) => (
            <div key={q.id} className="bg-white/80 backdrop-blur-xl p-5 md:p-8 rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white group relative">
              
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                <div className="flex gap-2 bg-gray-100/80 p-1.5 rounded-xl w-full sm:w-auto">
                  <button onClick={() => changeQuestionType(q.id, "text")} className={`flex-1 sm:flex-none px-4 py-2 text-sm font-bold rounded-lg transition-all ${q.type === "text" ? "bg-white text-indigo-600 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>
                    Text Answer
                  </button>
                  <button onClick={() => changeQuestionType(q.id, "mcq")} className={`flex-1 sm:flex-none px-4 py-2 text-sm font-bold rounded-lg transition-all ${q.type === "mcq" ? "bg-white text-indigo-600 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>
                    Multiple Choice
                  </button>
                </div>
                <button onClick={() => removeQuestion(q.id)} className="text-red-500 hover:text-red-700 font-bold text-sm bg-red-50 hover:bg-red-100 px-4 py-2 rounded-xl transition-colors w-full sm:w-auto">
                  Delete
                </button>
              </div>

              <input
                type="text"
                placeholder={`Question ${index + 1}`}
                value={q.question}
                onChange={(e) => updateQuestionText(q.id, e.target.value)}
                className="w-full text-xl md:text-2xl font-bold bg-gray-50/50 border border-gray-200 focus:bg-white focus:border-indigo-400 rounded-2xl p-5 mb-6 outline-none transition-all shadow-inner"
              />

              {q.type === "mcq" && (
                <div className="pl-2 md:pl-4 border-l-4 border-indigo-100 flex flex-col gap-3">
                  {q.options?.map((opt, optIndex) => (
                    <div key={optIndex} className="flex items-center gap-3">
                      <div className="w-5 h-5 rounded-full border-4 border-gray-200 bg-white flex-shrink-0" />
                      <input
                        type="text"
                        placeholder={`Option ${optIndex + 1}`}
                        value={opt}
                        onChange={(e) => updateOption(q.id, optIndex, e.target.value)}
                        className="flex-1 bg-gray-50/50 border border-gray-200 focus:bg-white focus:border-indigo-400 rounded-xl p-4 outline-none transition-all font-bold text-gray-700"
                      />
                      {q.options!.length > 2 && (
                        <button onClick={() => removeOption(q.id, optIndex)} className="text-gray-400 hover:text-red-500 p-3 bg-gray-50 hover:bg-red-50 rounded-xl font-bold transition-colors">
                          ✕
                        </button>
                      )}
                    </div>
                  ))}
                  <button onClick={() => addOption(q.id)} className="self-start mt-3 text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-4 py-2 rounded-xl font-bold text-sm transition-colors">
                    + Add Option
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>

        <button onClick={addQuestion} className="w-full mt-8 border-2 border-dashed border-indigo-200 hover:border-indigo-500 text-indigo-500 font-extrabold text-lg py-8 rounded-[2rem] transition-all bg-indigo-50/30 hover:bg-indigo-50 flex justify-center items-center gap-2">
          <span className="text-2xl">+</span> Add Another Question
        </button>
      </div>
    </div>
  );
}