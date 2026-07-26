import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";

export default function Gateway() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<"voter" | "admin">("voter");
  const [isSignUp, setIsSignUp] = useState(false);
  
  // States
  const [nickname, setNickname] = useState("");
  const [surveyCode, setSurveyCode] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleVoterJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nickname.trim() || !surveyCode.trim()) {
      setError("Please enter both a nickname and a code.");
      return;
    }
    navigate(`/s/${surveyCode}`, { state: { nickname } });
  };

  const handleAdminAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    if (isSignUp) {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) setError(error.message);
      else {
        alert("Account created! Logging you in...");
        navigate("/admin");
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setError("Invalid email or password.");
      else navigate("/admin");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center items-center p-4 font-sans">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl overflow-hidden">
        
        <div className="flex bg-gray-100 p-2 m-4 rounded-2xl">
          <button
            onClick={() => { setActiveTab("voter"); setError(""); }}
            className={`flex-1 py-3 text-sm font-bold rounded-xl transition-all ${
              activeTab === "voter" ? "bg-white text-indigo-600 shadow-sm" : "text-gray-500"
            }`}
          >
            I'm a Voter
          </button>
          <button
            onClick={() => { setActiveTab("admin"); setError(""); }}
            className={`flex-1 py-3 text-sm font-bold rounded-xl transition-all ${
              activeTab === "admin" ? "bg-white text-indigo-600 shadow-sm" : "text-gray-500"
            }`}
          >
            I'm an Admin
          </button>
        </div>

        <div className="p-8 pt-4">
          <div className="mb-8 text-center">
            <h1 className="text-2xl font-extrabold text-gray-900">
              {activeTab === "voter" ? "Join a Survey" : "Creator Login"}
            </h1>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 text-red-600 text-sm font-semibold rounded-xl text-center">
              {error}
            </div>
          )}

          {activeTab === "voter" ? (
            <form onSubmit={handleVoterJoin} className="flex flex-col gap-4">
              <input type="text" placeholder="Enter a Nickname" value={nickname} onChange={(e) => setNickname(e.target.value)} className="w-full p-4 rounded-xl border-2 border-gray-100 bg-gray-50 outline-none text-gray-900 font-medium" />
              <input type="text" placeholder="Survey Code (e.g. xyz123)" value={surveyCode} onChange={(e) => setSurveyCode(e.target.value)} className="w-full p-4 rounded-xl border-2 border-gray-100 bg-gray-50 outline-none text-gray-900 font-medium" />
              <button type="submit" className="w-full py-4 bg-indigo-600 text-white font-bold rounded-xl">Start Survey</button>
            </form>
          ) : (
            <form onSubmit={handleAdminAuth} className="flex flex-col gap-4">
              <input type="email" placeholder="Email Address" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full p-4 rounded-xl border-2 border-gray-100 bg-gray-50 outline-none text-gray-900 font-medium" required />
              <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full p-4 rounded-xl border-2 border-gray-100 bg-gray-50 outline-none text-gray-900 font-medium" required />
              <button type="submit" disabled={loading} className="w-full py-4 bg-black text-white font-bold rounded-xl disabled:bg-gray-400">
                {loading ? "Authenticating..." : isSignUp ? "Create Account" : "Log In"}
              </button>
              <button type="button" onClick={() => setIsSignUp(!isSignUp)} className="text-sm font-bold text-gray-500 mt-2">
                {isSignUp ? "Already have an account? Log In" : "Need an account? Sign Up"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}