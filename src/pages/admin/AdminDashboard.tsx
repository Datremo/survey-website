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
    alert("Link copied!");
  };

  const handleDownloadExcel = async () => {
    if (!activeSurvey) return;
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Results");
    const columns = [{ header: "Date", key: "date", width: 22 }, { header: "Nickname", key: "nickname", width: 20 }];
    activeSurvey.form_schema.forEach((q: any) => columns.push({ header: q.question, key: q.id, width: 35 }));
    sheet.columns = columns;

    submissions.forEach(sub => sheet.addRow({ date: new Date(sub.created_at).toLocaleString(), nickname: sub.nickname, ...sub.answers }));
    const headerRow = sheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 12 };
    headerRow.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF4F46E5" } };
    sheet.views = [{ state: 'frozen', xSplit: 0, ySplit: 1 }];
    sheet.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: columns.length } };

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `${activeSurvey.title.replace(/\s+/g, '_')}_Results.xlsx`;
    link.click();
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center text-sm font-bold text-indigo-600 bg-gradient-to-br from-slate-50 to-indigo-50">Loading...</div>;

  if (activeSurvey) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-indigo-50 p-4 font-sans">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4 bg-white/80 backdrop-blur-md p-5 rounded-3xl shadow-[0_4px_15px_rgb(0,0,0,0.03)] border border-white">
            <div className="w-full md:w-auto">
              <button onClick={() => setActiveSurvey(null)} className="text-indigo-600 hover:text-indigo-800 font-bold text-xs mb-2 flex items-center gap-1 transition-colors">&larr; Back</button>
              <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900 tracking-tight">{activeSurvey.title}</h1>
              <div className="flex flex-wrap items-center gap-2 mt-2">
                <span className="bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full text-xs font-bold">{submissions.length} Responses</span>
                <span className="bg-gray-100 px-3 py-1 rounded-full text-xs font-bold text-gray-600">Code: {activeSurvey.short_code}</span>
              </div>
            </div>
            <div className="flex gap-2 w-full md:w-auto">
              <button onClick={() => copyLink(activeSurvey.short_code)} className="flex-1 md:flex-none bg-white border border-gray-200 hover:bg-gray-50 text-gray-800 px-4 py-2 rounded-xl text-sm font-bold transition-all shadow-sm">🔗 Copy</button>
              <button onClick={handleDownloadExcel} className="flex-1 md:flex-none bg-gradient-to-r from-green-500 to-emerald-600 text-white px-4 py-2 rounded-xl text-sm font-bold shadow-md transition-all active:scale-95">📊 Download</button>
            </div>
          </div>

          <div className="flex bg-gray-200/50 p-1 rounded-xl mb-5 w-full md:w-max">
            <button onClick={() => setViewMode("overview")} className={`flex-1 md:px-6 py-2 text-sm font-bold rounded-lg transition-all ${viewMode === "overview" ? "bg-white text-indigo-600 shadow-sm" : "text-gray-500"}`}>Analytics</button>
            <button onClick={() => setViewMode("table")} className={`flex-1 md:px-6 py-2 text-sm font-bold rounded-lg transition-all ${viewMode === "table" ? "bg-white text-indigo-600 shadow-sm" : "text-gray-500"}`}>Data Table</button>
          </div>

          {viewMode === "overview" ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {activeSurvey.form_schema.map((q: any) => {
                if (q.type === "mcq") {
                  const counts: Record<string, number> = {};
                  q.options.forEach((opt: string) => counts[opt] = 0);
                  submissions.forEach(sub => { if (counts[sub.answers[q.id]] !== undefined) counts[sub.answers[q.id]]++; });

                  return (
                    <div key={q.id} className="bg-white/80 backdrop-blur-md p-5 rounded-3xl shadow-sm border border-white">
                      <h3 className="font-bold text-base text-gray-900 mb-4">{q.question}</h3>
                      <div className="flex flex-col gap-3">
                        {q.options.map((opt: string) => {
                          const percentage = submissions.length === 0 ? 0 : Math.round((counts[opt] / submissions.length) * 100);
                          return (
                            <div key={opt}>
                              <div className="flex justify-between text-xs font-bold text-gray-700 mb-1">
                                <span>{opt}</span><span className="text-indigo-600">{counts[opt]} ({percentage}%)</span>
                              </div>
                              <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden shadow-inner">
                                <div className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-1000" style={{ width: `${percentage}%` }}></div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                } else if (q.type === "rating") {
                   const avg = submissions.length ? (submissions.reduce((sum, sub) => sum + Number(sub.answers[q.id] || 0), 0) / submissions.length).toFixed(1) : "0.0";
                   return (
                    <div key={q.id} className="bg-white/80 backdrop-blur-md p-5 rounded-3xl shadow-sm border border-white flex flex-col justify-center items-center text-center">
                      <h3 className="font-bold text-base text-gray-900 mb-2">{q.question}</h3>
                      <div className="text-4xl font-extrabold text-yellow-500 mb-1">{avg}</div>
                      <div className="text-xs text-gray-500 font-bold mb-2">Average Rating</div>
                      <div className="flex gap-1">
                        {[1,2,3,4,5].map(star => <span key={star} className={`text-xl ${Number(avg) >= star ? 'text-yellow-400' : 'text-gray-200'}`}>★</span>)}
                      </div>
                    </div>
                   );
                } else {
                  return (
                    <div key={q.id} className="bg-white/80 backdrop-blur-md p-5 rounded-3xl shadow-sm border border-white flex flex-col max-h-[300px]">
                      <h3 className="font-bold text-base text-gray-900 mb-3">{q.question}</h3>
                      <div className="flex-1 overflow-y-auto flex flex-col gap-2 pr-1">
                        {submissions.filter(s => s.answers[q.id]).slice(0, 15).map((sub, i) => (
                          <div key={i} className="bg-gradient-to-br from-gray-50 to-white p-3 rounded-xl border border-gray-100 shadow-sm">
                            <span className="text-[10px] font-extrabold text-indigo-500 uppercase block mb-0.5">{sub.nickname}</span>
                            <p className="text-sm text-gray-800 font-medium">"{sub.answers[q.id]}"</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                }
              })}
            </div>
          ) : (
            <div className="bg-white/90 backdrop-blur-md rounded-3xl shadow-sm border border-white overflow-hidden">
              <div className="max-h-[500px] overflow-auto">
                <table className="w-full text-left text-xs text-gray-700">
                  <thead className="bg-indigo-50/90 text-indigo-900 sticky top-0 z-10">
                    <tr>
                      <th className="px-4 py-3 font-extrabold border-b border-indigo-100">Date</th>
                      <th className="px-4 py-3 font-extrabold border-b border-indigo-100">Nickname</th>
                      {activeSurvey.form_schema.map((q: any) => <th key={q.id} className="px-4 py-3 font-extrabold min-w-[200px] border-b border-indigo-100">{q.question}</th>)}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {submissions.map(sub => (
                      <tr key={sub.id} className="hover:bg-indigo-50/50">
                        <td className="px-4 py-3">{new Date(sub.created_at).toLocaleDateString()}</td>
                        <td className="px-4 py-3 font-bold text-gray-900">{sub.nickname}</td>
                        {activeSurvey.form_schema.map((q: any) => <td key={q.id} className="px-4 py-3">{(sub.answers as Record<string, string>)[q.id] || "-"}</td>)}
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-indigo-50 p-4 md:p-6 font-sans">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div><h1 className="text-3xl font-extrabold text-gray-900">Dashboard</h1></div>
          <div className="flex w-full md:w-auto gap-2">
            <button onClick={async () => { await supabase.auth.signOut(); navigate("/"); }} className="px-4 py-2 bg-white border border-gray-200 text-sm font-bold hover:bg-red-50 hover:text-red-600 rounded-xl transition-all shadow-sm">Log Out</button>
            <button onClick={() => navigate("/admin/builder")} className="flex-1 md:flex-none bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-5 py-2 rounded-xl text-sm font-bold shadow-md transition-all active:scale-95">+ New Survey</button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {surveys.map(survey => (
            <div key={survey.id} className="bg-white/80 backdrop-blur-md p-5 rounded-3xl shadow-[0_4px_15px_rgb(0,0,0,0.03)] border border-white hover:shadow-lg transition-all flex flex-col group">
              <h2 className="text-lg font-bold text-gray-900 mb-2 group-hover:text-indigo-600 transition-colors line-clamp-2">{survey.title}</h2>
              <div className="text-xs font-mono mb-5 bg-indigo-50 text-indigo-700 inline-flex px-2.5 py-1 rounded-lg self-start font-bold">Code: {survey.short_code}</div>
              <div className="mt-auto grid grid-cols-2 gap-2">
                <button onClick={() => handleViewStats(survey)} className="col-span-2 bg-indigo-50 text-indigo-700 text-sm font-bold py-2 rounded-xl hover:bg-indigo-600 hover:text-white transition-all">View Analytics</button>
                <button onClick={() => navigate("/admin/builder", { state: { editSurvey: survey } })} className="bg-white border border-gray-200 text-gray-700 text-xs font-bold py-2 rounded-xl hover:border-indigo-300 transition-all">✏️ Edit</button>
                <button onClick={() => copyLink(survey.short_code)} className="bg-white border border-gray-200 text-gray-700 text-xs font-bold py-2 rounded-xl hover:border-indigo-300 transition-all">🔗 Link</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}