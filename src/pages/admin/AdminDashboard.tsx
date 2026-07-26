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

      const { data } = await supabase
        .from('surveys')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
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

  const handleDownloadExcel = async () => {
    if (!activeSurvey) return;
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Results");

    const columns = [
      { header: "Date Submitted", key: "date", width: 22 },
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

    // Format for extreme scalability (1000+ rows)
    const headerRow = sheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 12 };
    headerRow.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF4F46E5" } };
    headerRow.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    headerRow.height = 30;

    // Freeze the top row and add filters for easy sorting
    sheet.views = [{ state: 'frozen', xSplit: 0, ySplit: 1 }];
    sheet.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: columns.length } };

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `${activeSurvey.title.replace(/\s+/g, '_')}_Results.xlsx`;
    link.click();
  };

  // --- STATS VIEW UI ---
  if (activeSurvey) {
    return (
      <div className="min-h-screen bg-gray-50 p-6 font-sans">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 gap-4 bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
            <div>
              <button onClick={() => setActiveSurvey(null)} className="text-indigo-600 hover:text-indigo-800 font-bold text-sm mb-3 flex items-center gap-1 transition-colors">
                &larr; Back to Dashboard
              </button>
              <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight">{activeSurvey.title}</h1>
              <p className="text-gray-500 font-medium mt-2 flex items-center gap-4">
                <span className="bg-indigo-50 text-indigo-700 px-3 py-1 rounded-full text-sm">{submissions.length} Responses</span>
                <span>Code: <strong className="text-gray-800">{activeSurvey.short_code}</strong></span>
              </p>
            </div>
            <div className="flex gap-3 w-full md:w-auto">
              <button onClick={() => copyLink(activeSurvey.short_code)} className="flex-1 md:flex-none bg-gray-100 hover:bg-gray-200 text-gray-800 px-5 py-3 rounded-xl font-bold transition-all">
                🔗 Copy Link
              </button>
              <button onClick={handleDownloadExcel} className="flex-1 md:flex-none bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-xl font-bold shadow-md shadow-green-600/20 transition-all active:scale-95 flex items-center justify-center gap-2">
                📊 Download Data
              </button>
            </div>
          </div>

          {/* Toggle Analytics vs Raw Data */}
          <div className="flex gap-2 mb-6">
            <button onClick={() => setViewMode("overview")} className={`px-6 py-3 font-bold rounded-xl transition-all ${viewMode === "overview" ? "bg-indigo-600 text-white shadow-md" : "bg-white text-gray-600 hover:bg-gray-100 border border-gray-200"}`}>
              Visual Analytics
            </button>
            <button onClick={() => setViewMode("table")} className={`px-6 py-3 font-bold rounded-xl transition-all ${viewMode === "table" ? "bg-indigo-600 text-white shadow-md" : "bg-white text-gray-600 hover:bg-gray-100 border border-gray-200"}`}>
              Raw Data Table
            </button>
          </div>

          {viewMode === "overview" ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {activeSurvey.form_schema.map((q: any) => {
                if (q.type === "mcq") {
                  // Calculate MCQ percentages
                  const counts: Record<string, number> = {};
                  q.options.forEach((opt: string) => counts[opt] = 0);
                  submissions.forEach(sub => {
                    const answer = sub.answers[q.id];
                    if (counts[answer] !== undefined) counts[answer]++;
                  });

                  return (
                    <div key={q.id} className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
                      <h3 className="font-bold text-lg text-gray-900 mb-6">{q.question}</h3>
                      <div className="flex flex-col gap-4">
                        {q.options.map((opt: string) => {
                          const count = counts[opt];
                          const percentage = submissions.length === 0 ? 0 : Math.round((count / submissions.length) * 100);
                          return (
                            <div key={opt}>
                              <div className="flex justify-between text-sm font-bold text-gray-700 mb-1">
                                <span>{opt}</span>
                                <span>{count} votes ({percentage}%)</span>
                              </div>
                              <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
                                <div className="h-full bg-indigo-500 rounded-full transition-all duration-1000" style={{ width: `${percentage}%` }}></div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                } else {
                  return (
                    <div key={q.id} className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
                      <h3 className="font-bold text-lg text-gray-900 mb-4">{q.question}</h3>
                      <div className="h-[200px] overflow-y-auto flex flex-col gap-3 pr-2">
                        {submissions.filter(s => s.answers[q.id]).slice(0, 10).map((sub, i) => (
                          <div key={i} className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                            <span className="text-xs font-bold text-indigo-500 uppercase tracking-wider block mb-1">{sub.nickname}</span>
                            <p className="text-gray-700 italic">"{sub.answers[q.id]}"</p>
                          </div>
                        ))}
                        {submissions.length === 0 && <p className="text-gray-400 text-sm">No text responses yet.</p>}
                      </div>
                    </div>
                  );
                }
              })}
            </div>
          ) : (
            /* Scalable Table with Sticky Header */
            <div className="bg-white rounded-3xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="max-h-[600px] overflow-auto">
                <table className="w-full text-left text-sm text-gray-700 relative">
                  <thead className="bg-indigo-50 text-indigo-900 sticky top-0 z-10 shadow-sm">
                    <tr>
                      <th className="px-6 py-5 font-extrabold whitespace-nowrap bg-indigo-50 border-b border-indigo-100">Date</th>
                      <th className="px-6 py-5 font-extrabold whitespace-nowrap bg-indigo-50 border-b border-indigo-100">Nickname</th>
                      {activeSurvey.form_schema.map((q: any) => (
                        <th key={q.id} className="px-6 py-5 font-extrabold min-w-[250px] bg-indigo-50 border-b border-indigo-100">{q.question}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {submissions.map(sub => (
                      <tr key={sub.id} className="hover:bg-indigo-50/50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap text-gray-500">{new Date(sub.created_at).toLocaleDateString()}</td>
                        <td className="px-6 py-4 font-bold text-gray-900">{sub.nickname}</td>
                        {activeSurvey.form_schema.map((q: any) => (
                          <td key={q.id} className="px-6 py-4 text-gray-800">
                            {(sub.answers as Record<string, string>)[q.id] || <span className="text-gray-300">-</span>}
                          </td>
                        ))}
                      </tr>
                    ))}
                    {submissions.length === 0 && (
                      <tr>
                        <td colSpan={activeSurvey.form_schema.length + 2} className="px-6 py-12 text-center text-gray-500 font-medium">
                          No submissions yet. Share your survey link!
                        </td>
                      </tr>
                    )}
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
  if (loading) return <div className="min-h-screen flex items-center justify-center font-bold text-indigo-600">Loading Dashboard...</div>;

  return (
    <div className="min-h-screen bg-gray-50 p-6 font-sans">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-4">
          <div>
            <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight">Creator Dashboard</h1>
            <p className="text-gray-500 font-medium mt-2">Manage your surveys and analyze real-time results.</p>
          </div>
          <div className="flex gap-4 w-full md:w-auto">
            <button onClick={async () => { await supabase.auth.signOut(); navigate("/"); }} className="px-5 py-3 text-red-600 font-bold hover:bg-red-50 rounded-xl transition-all">
              Log Out
            </button>
            <button onClick={() => navigate("/admin/builder")} className="flex-1 md:flex-none bg-black hover:bg-gray-800 text-white px-8 py-3 rounded-xl font-bold shadow-lg shadow-gray-400/50 transition-all active:scale-95">
              + New Survey
            </button>
          </div>
        </div>

        {surveys.length === 0 ? (
          <div className="text-center bg-white border-2 border-dashed border-gray-200 rounded-[2rem] p-16 shadow-sm">
            <div className="text-6xl mb-4">📋</div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">No surveys created yet</h2>
            <p className="text-gray-500 mb-8 max-w-sm mx-auto">Build your first interactive survey and share the link to start collecting responses.</p>
            <button onClick={() => navigate("/admin/builder")} className="bg-indigo-600 text-white px-8 py-4 rounded-xl font-bold shadow-lg hover:bg-indigo-700 transition-all">
              Create First Survey
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {surveys.map(survey => (
              <div key={survey.id} className="bg-white p-8 rounded-[2rem] shadow-sm border border-gray-100 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col group">
                <h2 className="text-2xl font-extrabold text-gray-900 mb-3 leading-tight group-hover:text-indigo-600 transition-colors">{survey.title}</h2>
                <div className="text-sm font-mono mb-8 bg-gray-50 border border-gray-100 inline-flex items-center gap-2 px-4 py-2 rounded-xl self-start">
                  <span className="text-gray-400">Code:</span>
                  <span className="font-bold text-indigo-600">{survey.short_code}</span>
                </div>
                
                <div className="mt-auto flex gap-3">
                  <button onClick={() => handleViewStats(survey)} className="flex-1 bg-indigo-50 text-indigo-700 font-extrabold py-4 rounded-xl hover:bg-indigo-600 hover:text-white transition-all">
                    View Analytics
                  </button>
                  <button onClick={() => copyLink(survey.short_code)} className="px-5 bg-white border-2 border-gray-100 text-gray-600 font-bold rounded-xl hover:border-gray-300 hover:bg-gray-50 hover:text-gray-900 transition-all" title="Copy Link">
                    🔗
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}