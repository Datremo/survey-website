// File: src/pages/admin/FormBuilder.tsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
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
  const [title, setTitle] = useState("Untitled Survey");
  const [questions, setQuestions] = useState<Question[]>([
    { id: "q1", type: "mcq", question: "", options: ["", ""] }
  ]);

  const generateId = () => Math.random().toString(36).substring(2, 9);

  const addQuestion = () => {
    setQuestions([...questions, { id: generateId(), type: "text", question: "" }]);
  };

  const removeQuestion = (id: string) => {
    setQuestions(questions.filter(q => q.id !== id));
  };

  const updateQuestionText = (id: string, text: string) => {
    setQuestions(questions.map(q => q.id === id ? { ...q, question: text } : q));
  };

  const changeQuestionType = (id: string, type: QuestionType) => {
    setQuestions(questions.map(q => {
      if (q.id === id) {
        return { 
          ...q, 
          type, 
          options: type === "mcq" ? ["", ""] : undefined 
        };
      }
      return q;
    }));
  };

  const addOption = (questionId: string) => {
    setQuestions(questions.map(q => {
      if (q.id === questionId && q.options) {
        return { ...q, options: [...q.options, ""] };
      }
      return q;
    }));
  };

  const updateOption = (questionId: string, optionIndex: number, text: string) => {
    setQuestions(questions.map(q => {
      if (q.id === questionId && q.options) {
        const newOptions = [...q.options];
        newOptions[optionIndex] = text;
        return { ...q, options: newOptions };
      }
      return q;
    }));
  };

  const removeOption = (questionId: string, optionIndex: number) => {
    setQuestions(questions.map(q => {
      if (q.id === questionId && q.options) {
        const newOptions = q.options.filter((_, idx) => idx !== optionIndex);
        return { ...q, options: newOptions };
      }
      return q;
    }));
  };

  const handleSave = async () => {
  const shortCode = generateId();
  
  // 1. Get the current logged-in user
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    alert("You must be logged in to create a survey.");
    return navigate("/");
  }

  // 2. Save to database
  const { error } = await supabase.from('surveys').insert([
    { 
      title, 
      short_code: shortCode,
      form_schema: questions,
      user_id: user.id 
    }
  ]);

  if (error) {
    console.error("Supabase Error Details:", error);
    alert(`Supabase Error: ${error.message}`); // This will tell us the exact problem
  } else {
    // 3. Generate Link and Auto-Copy to Clipboard
    const shareLink = `${window.location.origin}/s/${shortCode}`;
    navigator.clipboard.writeText(shareLink);
    
    alert(`Survey Saved!\n\nLink copied to clipboard:\n${shareLink}`);
    navigate("/admin");
  }
};

  return (
    <div className="min-h-screen bg-gray-50 pb-20 font-sans">
      
      {/* Sticky Header */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-200 shadow-sm px-4 py-4 flex justify-between items-center">
        <button 
          onClick={() => navigate("/admin")}
          className="text-gray-500 hover:text-gray-800 font-bold px-4 py-2 rounded-lg hover:bg-gray-100 transition-colors">
          Cancel
        </button>
        <button 
          onClick={handleSave}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-xl font-bold shadow-md transition-all active:scale-95">
          Save Survey
        </button>
      </div>

      <div className="max-w-3xl mx-auto p-4 mt-6">
        
        {/* Survey Title Input */}
        <div className="mb-8">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Survey Title"
            className="w-full text-4xl font-extrabold bg-transparent border-none focus:ring-0 placeholder-gray-300 text-gray-900 outline-none"
          />
        </div>

        {/* Questions List */}
        <div className="flex flex-col gap-6">
          {questions.map((q, index) => (
            <div key={q.id} className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 group relative">
              
              <div className="flex justify-between items-center mb-4">
                <div className="flex gap-2 bg-gray-100 p-1 rounded-lg">
                  <button
                    onClick={() => changeQuestionType(q.id, "text")}
                    className={`px-4 py-1.5 text-sm font-bold rounded-md transition-colors ${q.type === "text" ? "bg-white text-indigo-600 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>
                    Short Text
                  </button>
                  <button
                    onClick={() => changeQuestionType(q.id, "mcq")}
                    className={`px-4 py-1.5 text-sm font-bold rounded-md transition-colors ${q.type === "mcq" ? "bg-white text-indigo-600 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>
                    Multiple Choice
                  </button>
                </div>
                
                <button 
                  onClick={() => removeQuestion(q.id)}
                  className="text-red-400 hover:text-red-600 font-bold text-sm bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-lg transition-colors">
                  Delete
                </button>
              </div>

              {/* Question Text Input */}
              <input
                type="text"
                placeholder={`Question ${index + 1}`}
                value={q.question}
                onChange={(e) => updateQuestionText(q.id, e.target.value)}
                className="w-full text-xl font-bold bg-gray-50 border border-gray-100 focus:bg-white focus:border-indigo-500 rounded-xl p-4 mb-4 outline-none transition-colors"
              />

              {/* MCQ Options Builder */}
              {q.type === "mcq" && (
                <div className="pl-4 border-l-2 border-indigo-100 flex flex-col gap-3">
                  {q.options?.map((opt, optIndex) => (
                    <div key={optIndex} className="flex items-center gap-3">
                      <div className="w-4 h-4 rounded-full border-2 border-gray-300 bg-gray-50 flex-shrink-0" />
                      <input
                        type="text"
                        placeholder={`Option ${optIndex + 1}`}
                        value={opt}
                        onChange={(e) => updateOption(q.id, optIndex, e.target.value)}
                        className="flex-1 bg-gray-50 border border-gray-100 focus:bg-white focus:border-indigo-500 rounded-lg p-3 outline-none transition-colors font-medium"
                      />
                      {q.options!.length > 2 && (
                        <button 
                          onClick={() => removeOption(q.id, optIndex)}
                          className="text-gray-400 hover:text-red-500 p-2 font-bold transition-colors">
                          ✕
                        </button>
                      )}
                    </div>
                  ))}
                  <button 
                    onClick={() => addOption(q.id)}
                    className="self-start mt-2 text-indigo-600 hover:text-indigo-800 font-bold text-sm flex items-center gap-1 transition-colors">
                    + Add Option
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Add Question Button */}
        <button 
          onClick={addQuestion}
          className="w-full mt-8 border-2 border-dashed border-gray-300 hover:border-indigo-500 text-gray-500 hover:text-indigo-600 font-bold text-lg py-6 rounded-3xl transition-colors flex justify-center items-center gap-2 bg-gray-50 hover:bg-indigo-50">
          <span>+</span> Add New Question
        </button>

      </div>
    </div>
  );
}