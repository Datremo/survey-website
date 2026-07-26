// File: src/pages/admin/AdminDashboard.tsx
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import ExcelJS from "exceljs";
import { supabase } from "../../lib/supabase";

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [surveys, setSurveys] = useState<any[]>([]);
  const [activeSurvey, setActiveSurvey] = useState<any | null>(null);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"overview" | "table">("overview");

  useEffect(() => {
    const fetchSurveys = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return navigate("/");

      const { data } = await supabase.from('surveys').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
      if (data) setSurveys(data);
      setLoading(false);
    };
    fetchSurveys();
  }, [navigate]);

  const handleViewStats = async (survey: any) => {
    setActiveSurvey(survey);
    setViewMode("overview");
    const { data } = await supabase.from('submissions').select('*').eq('survey_id', survey.id).order('created_at', { ascending: false });
    if (data) setSubmissions(data);
  };

  const copyLink = (shortCode: string) => {
    navigator.clipboard.writeText(`${window.location.origin}/s/${shortCode}`);
    alert("Link copied to clipboard!");
  };

  // ... (Keep the exact same handleDownloadExcel function from before here)
  const handleDownloadExcel = async () => {
    if (!activeSurvey) return;
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Results");

    const columns = [
      { header: "Date", key: "date", width: 22 },
      { header: "Nickname", key: "nickname", width: 20 },
    ];
    activeSurvey.form_schema.forEach((q: any) => {
      columns.push({ header: q.question, key: q.id, width: 35 });
    });
    sheet.columns = columns;

    submissions.forEach(sub => {
      sheet.addRow({
        date: new Date(sub.created_at).toLocaleString(),
        nickname: sub.nickname,
        ...sub.answers
      });
    });

    const headerRow = sheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 12 };
    headerRow.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF4F46E5" } };
    headerRow.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    headerRow.height = 30;

    sheet.views = [{ state: 'frozen', xSplit: 0, ySplit: 1 }];
    sheet.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: columns.length } };

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `${activeSurvey.title.replace(/\s+/g, '_')}_Results.xlsx`;
    link.click();
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center font-bold text-indigo-600 bg-gradient-to-br from-slate-50 to-indigo-50">Loading Dashboard...</div>;

  // --- STATS VIEW UI ---
  if (activeSurvey) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-indigo-50 p-4 md:p-8 font-sans">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 gap-4 bg-white/80 backdrop-blur-xl p-6 rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white">
            <div className="w-full md:w-auto">
              <button onClick={() => setActiveSurvey(null)} className="text-indigo-600 hover:text-indigo-800 font-bold text-sm mb-3 flex items-center gap-1 transition-colors">
                &larr; Back to Dashboard
              </button>
              <h1 className="text-3xl md:text-4xl font-extrabold text-gray-900 tracking-tight">{activeSurvey.title}</h1>
              <p className="text-gray-500 font-medium mt-3 flex flex-wrap items-center gap-3">
                <span className="bg-indigo-100 text-indigo-700 px-4 py-1.5 rounded-full text-sm font-bold shadow-sm">{submissions.length} Responses</span>
                <span className="bg-gray-100 px-4 py-1.5 rounded-full text-sm font-bold text-gray-600 shadow-sm">Code: {activeSurvey.short_code}</span>
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto mt-4 md:mt-0">
              <button onClick={() => copyLink(activeSurvey.short_code)} className="w-full sm:w-auto bg-white border border-gray-200 hover:bg-gray-50 text-gray-800 px-6 py-3.5 rounded-xl font-bold transition-all shadow-sm">
                🔗 Copy Link
              </button>
              <button onClick={handleDownloadExcel} className="w-full sm:w-auto bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white px-6 py-3.5 rounded-xl font-bold shadow-lg shadow-green-500/30 transition-all active:scale-95 flex items-center justify-center gap-2">
                📊 Download Data
              </button>
            </div>
          </div>

          {/* View Toggle */}
          <div className="flex bg-gray-200/50 p-1.5 rounded-2xl mb-6 w-full md:w-max">
            <button onClick={() => setViewMode("overview")} className={`flex-1 md:px-8 py-3 font-bold rounded-xl transition-all ${viewMode === "overview" ? "bg-white text-indigo-600 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>
              Analytics
            </button>
            <button onClick={() => setViewMode("table")} className={`flex-1 md:px-8 py-3 font-bold rounded-xl transition-all ${viewMode === "table" ? "bg-white text-indigo-600 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>
              Raw Data
            </button>
          </div>

          {viewMode === "overview" ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {activeSurvey.form_schema.map((q: any) => {
                if (q.type === "mcq") {
                  const counts: Record<string, number> = {};
                  q.options.forEach((opt: string) => counts[opt] = 0);
                  submissions.forEach(sub => { if (counts[sub.answers[q.id]] !== undefined) counts[sub.answers[q.id]]++; });

                  return (
                    <div key={q.id} className="bg-white/80 backdrop-blur-xl p-6 md:p-8 rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white">
                      <h3 className="font-extrabold text-xl text-gray-900 mb-6">{q.question}</h3>
                      <div className="flex flex-col gap-5">
                        {q.options.map((opt: string) => {
                          const count = counts[opt];
                          const percentage = submissions.length === 0 ? 0 : Math.round((count / submissions.length) * 100);
                          return (
                            <div key={opt}>
                              <div className="flex justify-between text-sm font-bold text-gray-700 mb-2">
                                <span>{opt}</span>
                                <span className="text-indigo-600">{count} votes ({percentage}%)</span>
                              </div>
                              <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden shadow-inner">
                                <div className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-1000" style={{ width: `${percentage}%` }}></div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                } else {
                  return (
                    <div key={q.id} className="bg-white/80 backdrop-blur-xl p-6 md:p-8 rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white flex flex-col max-h-[400px]">
                      <h3 className="font-extrabold text-xl text-gray-900 mb-4">{q.question}</h3>
                      <div className="flex-1 overflow-y-auto flex flex-col gap-3 pr-2 custom-scrollbar">
                        {submissions.filter(s => s.answers[q.id]).slice(0, 15).map((sub, i) => (
                          <div key={i} className="bg-gradient-to-br from-gray-50 to-white p-4 rounded-2xl border border-gray-100 shadow-sm">
                            <span className="text-xs font-extrabold text-indigo-500 uppercase tracking-wider block mb-1">{sub.nickname}</span>
                            <p className="text-gray-800 font-medium">"{sub.answers[q.id]}"</p>
                          </div>
                        ))}
                        {submissions.length === 0 && <p className="text-gray-400 font-medium">No responses yet.</p>}
                      </div>
                    </div>
                  );
                }
              })}
            </div>
          ) : (
            <div className="bg-white/90 backdrop-blur-xl rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white overflow-hidden">
              <div className="max-h-[600px] overflow-auto custom-scrollbar">
                <table className="w-full text-left text-sm text-gray-700">
                  <thead className="bg-indigo-50/90 backdrop-blur-sm text-indigo-900 sticky top-0 z-10 shadow-sm">
                    <tr>
                      <th className="px-6 py-5 font-extrabold whitespace-nowrap border-b border-indigo-100">Date</th>
                      <th className="px-6 py-5 font-extrabold whitespace-nowrap border-b border-indigo-100">Nickname</th>
                      {activeSurvey.form_schema.map((q: any) => (
                        <th key={q.id} className="px-6 py-5 font-extrabold min-w-[250px] border-b border-indigo-100">{q.question}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {submissions.map(sub => (
                      <tr key={sub.id} className="hover:bg-indigo-50/50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap text-gray-500 font-medium">{new Date(sub.created_at).toLocaleDateString()}</td>
                        <td className="px-6 py-4 font-bold text-gray-900">{sub.nickname}</td>
                        {activeSurvey.form_schema.map((q: any) => (
                          <td key={q.id} className="px-6 py-4 text-gray-800">{(sub.answers as Record<string, string>)[q.id] || "-"}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // --- MAIN DASHBOARD VIEW UI ---
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-indigo-50 p-4 md:p-8 font-sans">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-6">
          <div>
            <h1 className="text-4xl md:text-5xl font-extrabold text-gray-900 tracking-tight">Dashboard</h1>
            <p className="text-gray-500 font-medium mt-2 text-lg">Manage your surveys and analyze results.</p>
          </div>
          <div className="flex w-full md:w-auto gap-3">
            <button onClick={async () => { await supabase.auth.signOut(); navigate("/"); }} className="px-6 py-4 bg-white border border-gray-200 text-gray-600 font-bold hover:bg-red-50 hover:text-red-600 hover:border-red-100 rounded-2xl transition-all shadow-sm">
              Log Out
            </button>
            <button onClick={() => navigate("/admin/builder")} className="flex-1 md:flex-none bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white px-8 py-4 rounded-2xl font-bold shadow-lg shadow-indigo-500/30 transition-all active:scale-95 text-lg">
              + New Survey
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {surveys.map(survey => (
            <div key={survey.id} className="bg-white/80 backdrop-blur-xl p-6 md:p-8 rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col group">
              <h2 className="text-2xl font-extrabold text-gray-900 mb-3 leading-tight group-hover:text-indigo-600 transition-colors line-clamp-2">{survey.title}</h2>
              <div className="text-sm font-mono mb-8 bg-indigo-50/50 text-indigo-700 inline-flex items-center gap-2 px-4 py-2 rounded-xl self-start font-bold">
                Code: {survey.short_code}
              </div>
              
              <div className="mt-auto grid grid-cols-2 gap-3">
                <button onClick={() => handleViewStats(survey)} className="col-span-2 bg-gradient-to-r from-indigo-50 to-purple-50 text-indigo-700 font-extrabold py-3.5 rounded-xl hover:bg-indigo-600 hover:text-white transition-all shadow-sm">
                  View Analytics
                </button>
                {/* The new Edit Button connects via React Router State */}
                <button onClick={() => navigate("/admin/builder", { state: { editSurvey: survey } })} className="bg-white border-2 border-gray-100 text-gray-700 font-bold py-3 rounded-xl hover:border-indigo-200 hover:text-indigo-600 transition-all shadow-sm">
                  ✏️ Edit
                </button>
                <button onClick={() => copyLink(survey.short_code)} className="bg-white border-2 border-gray-100 text-gray-700 font-bold py-3 rounded-xl hover:border-indigo-200 hover:text-indigo-600 transition-all shadow-sm">
                  🔗 Link
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}