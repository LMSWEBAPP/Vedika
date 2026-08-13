'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Award, FileText, ChevronRight, HelpCircle, ArrowLeft, Send, 
  AlertCircle, ShieldAlert, CheckCircle, Volume2, RotateCcw, 
  BookOpen, Code, Brain, Settings, Compass, Sparkles, Loader2, FlaskConical, AlertTriangle, RefreshCw
} from 'lucide-react';
import { T } from '@/lib/lms-data';
import { useMediaQuery, isMobileMQ } from '@/lib/useMediaQuery';
import { getJwtToken } from '@/lib/jwtCache';

export default function VivaInterviewPage() {
  const isMobile = useMediaQuery(isMobileMQ);

  // Configuration States
  const [sessionMode, setSessionMode] = useState('viva'); // 'viva' | 'interview'
  const [subject, setSubject] = useState('Physics');
  const [level, setLevel] = useState('College'); // Viva: 'School' | 'College', Interview: 'Junior' | 'Mid-Level' | 'Senior'
  const [topic, setTopic] = useState("Ohm's Law & Circuit Resistance");
  
  // Custom Viva & Interview Setup States
  const [selectedExperiment, setSelectedExperiment] = useState("Ohm's Law & Circuit Resistance");
  const [programmingLanguage, setProgrammingLanguage] = useState('Python');
  const [jdText, setJdText] = useState('');

  // Runtime States
  const [gameState, setGameState] = useState('setup'); // 'setup' | 'active' | 'summary'
  const [loading, setLoading] = useState(false);
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [currentQuestion, setCurrentQuestion] = useState('');
  const [userAnswer, setUserAnswer] = useState('');
  const [isSpeaking, setIsSpeaking] = useState(false);
  
  // Active Round History & Misaligned State
  const [history, setHistory] = useState([]); 
  const [currentEvaluation, setCurrentEvaluation] = useState(null);

  // Setup Presets
  const subjects = ['Physics', 'Chemistry', 'Biology', 'Computer Science', 'Mathematics'];
  const experimentPresets = {
    'Physics': ["Ohm's Law & Circuit Resistance", "Young's Double Slit Experiment", "Compound Pendulum & Gravity g", "Hooke's Law & Elasticity"],
    'Chemistry': ["Acid-Base Titration & Molarity", "Qualitative Salt Analysis", "Volumetric Analysis", "Electrochemistry & EMF"],
    'Biology': ["Photosynthesis & Light Spectrum", "Cell Mitosis Observation", "Enzyme Kinetics & Temperature"],
    'Computer Science': ["Binary Search Trees & Traversal", "Sorting Algorithm Complexities", "TCP/IP 3-Way Handshake", "SQL Indexing & Joins"],
    'Mathematics': ["Differential Equations & Calculus", "Matrix Eigenvalues & Vectors", "Probability Distributions"]
  };

  const programmingLanguages = ['Python', 'JavaScript', 'Java', 'C++', 'SQL', 'Systems & Cloud Architecture'];

  const handleStartSession = async () => {
    const activeTopic = sessionMode === 'viva' ? selectedExperiment : (topic || programmingLanguage);
    if (!activeTopic.trim()) {
      alert("Please select or enter a topic.");
      return;
    }
    setLoading(true);
    setHistory([]);
    setCurrentQIndex(0);
    setCurrentEvaluation(null);
    setUserAnswer('');

    try {
      const token = await getJwtToken();
      const response = await fetch('/api/viva-interview', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          action: 'question',
          type: sessionMode,
          subject,
          topic: activeTopic,
          level,
          experimentName: selectedExperiment,
          programmingLanguage,
          jdText,
          history: []
        })
      });

      const data = await response.json();
      if (response.ok && data.text) {
        setCurrentQuestion(data.text);
        setGameState('active');
        speakText(data.text);
      } else {
        alert(data.error || "Failed to start session.");
      }
    } catch (e) {
      console.error(e);
      alert("API request error.");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitAnswer = async () => {
    if (!userAnswer.trim()) return;
    setLoading(true);

    try {
      const token = await getJwtToken();
      const activeTopic = sessionMode === 'viva' ? selectedExperiment : (topic || programmingLanguage);

      const evalResponse = await fetch('/api/viva-interview', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          action: 'evaluate',
          type: sessionMode,
          subject,
          topic: activeTopic,
          level,
          question: currentQuestion,
          userAnswer
        })
      });

      const evalData = await evalResponse.json();
      if (!evalResponse.ok) {
        throw new Error(evalData.error || "Evaluation failed.");
      }

      setCurrentEvaluation(evalData);
      
      const roundDetails = {
        question: currentQuestion,
        answer: userAnswer,
        grade: evalData.grade,
        score: evalData.score,
        isMisaligned: evalData.isMisaligned,
        misalignedReason: evalData.misalignedReason,
        rectificationPrompt: evalData.rectificationPrompt,
        correctAnswer: evalData.correctAnswer,
        explanation: evalData.explanation,
        improvementTip: evalData.improvementTip
      };
      
      setHistory(prev => [...prev, roundDetails]);

    } catch (e) {
      console.error(e);
      alert("Failed to grade answer.");
    } finally {
      setLoading(false);
    }
  };

  const handleNextQuestion = async () => {
    if (currentQIndex >= 4) {
      setGameState('summary');
      return;
    }

    setLoading(true);
    setCurrentEvaluation(null);
    setUserAnswer('');
    const nextIndex = currentQIndex + 1;
    setCurrentQIndex(nextIndex);

    try {
      const token = await getJwtToken();
      const activeTopic = sessionMode === 'viva' ? selectedExperiment : (topic || programmingLanguage);

      const historyPayload = history.map(h => ({
        question: h.question,
        answer: h.answer,
        score: h.score
      }));

      const response = await fetch('/api/viva-interview', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          action: 'question',
          type: sessionMode,
          subject,
          topic: activeTopic,
          level,
          experimentName: selectedExperiment,
          programmingLanguage,
          jdText,
          history: historyPayload
        })
      });

      const data = await response.json();
      if (response.ok && data.text) {
        setCurrentQuestion(data.text);
        speakText(data.text);
      } else {
        alert(data.error || "Failed to fetch next question.");
      }
    } catch (e) {
      console.error(e);
      alert("API request error.");
    } finally {
      setLoading(false);
    }
  };

  const speakText = (text) => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);
      window.speechSynthesis.speak(utterance);
    }
  };

  return (
    <div className="w-full min-h-screen bg-slate-950 text-white font-sans p-6 pb-20 selection:bg-purple-500 selection:text-white">
      <div className="max-w-5xl mx-auto space-y-6">
        
        {/* HEADER BAR */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center space-x-3">
            <a href="/" className="p-2 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700">
              <ArrowLeft size={18} />
            </a>
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-400 via-pink-400 to-indigo-400 bg-clip-text text-transparent flex items-center gap-2">
                <Brain className="text-purple-400" size={24} />
                Vyomanta Viva & Interview Hub
              </h1>
              <p className="text-xs text-slate-400">Academic Experiment Viva Examiner & Technical Job Interview Practice</p>
            </div>
          </div>

          <div className="flex bg-slate-900 border border-slate-800 rounded-xl p-1">
            <button
              onClick={() => setSessionMode('viva')}
              className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition ${
                sessionMode === 'viva' ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Academic Viva
            </button>
            <button
              onClick={() => setSessionMode('interview')}
              className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition ${
                sessionMode === 'interview' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Technical Interview
            </button>
          </div>
        </div>

        {/* SETUP VIEW */}
        {gameState === 'setup' && (
          <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-8 backdrop-blur-xl shadow-2xl space-y-6">
            <div className="border-b border-slate-800/80 pb-4">
              <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
                {sessionMode === 'viva' ? <FlaskConical className="text-purple-400" /> : <Code className="text-indigo-400" />}
                {sessionMode === 'viva' ? 'Academic Lab Viva Setup' : 'Technical Job Interview Setup'}
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                {sessionMode === 'viva' 
                  ? 'Select an experiment and academic level. Vedika will ask viva questions and catch misaligned or wrong concepts.' 
                  : 'Practice mock interview questions based on Job Descriptions or specific programming language stacks.'}
              </p>
            </div>

            {/* SUBJECT & LEVEL SELECTION */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase mb-2">Subject Area</label>
                <select
                  value={subject}
                  onChange={(e) => {
                    setSubject(e.target.value);
                    const defaultExp = experimentPresets[e.target.value]?.[0] || "General Lab";
                    setSelectedExperiment(defaultExp);
                  }}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:border-purple-500"
                >
                  {subjects.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase mb-2">Target Academic/Career Level</label>
                <select
                  value={level}
                  onChange={(e) => setLevel(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:border-purple-500"
                >
                  {sessionMode === 'viva' ? (
                    <>
                      <option value="School">School (High School / K-12)</option>
                      <option value="College">College (Undergraduate B.Tech/B.Sc)</option>
                      <option value="PG">Postgraduate / Research</option>
                    </>
                  ) : (
                    <>
                      <option value="Junior">Junior / Entry Level</option>
                      <option value="Mid-Level">Mid-Level Engineer</option>
                      <option value="Senior">Senior / Tech Lead</option>
                    </>
                  )}
                </select>
              </div>
            </div>

            {/* VIVA MODE: EXPERIMENT SELECTOR */}
            {sessionMode === 'viva' ? (
              <div className="space-y-3">
                <label className="block text-xs font-semibold text-slate-300 uppercase">Select Academic Experiment</label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {(experimentPresets[subject] || []).map(exp => (
                    <button
                      key={exp}
                      onClick={() => setSelectedExperiment(exp)}
                      className={`p-3.5 rounded-xl border text-left text-xs font-medium transition ${
                        selectedExperiment === exp
                          ? 'bg-purple-950/80 border-purple-500 text-purple-200'
                          : 'bg-slate-800/40 border-slate-800 text-slate-300 hover:bg-slate-800'
                      }`}
                    >
                      🧪 {exp}
                    </button>
                  ))}
                </div>
                <input
                  type="text"
                  placeholder="Or enter custom experiment name..."
                  value={selectedExperiment}
                  onChange={(e) => setSelectedExperiment(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 outline-none focus:border-purple-500"
                />
              </div>
            ) : (
              /* INTERVIEW MODE: LANGUAGE & JD UPLOAD */
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase mb-2">Target Programming Language / Stack</label>
                  <select
                    value={programmingLanguage}
                    onChange={(e) => setProgrammingLanguage(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:border-indigo-500"
                  >
                    {programmingLanguages.map(lang => <option key={lang} value={lang}>{lang}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase mb-2">
                    Paste Job Description (Optional for JD-based Interview)
                  </label>
                  <textarea
                    rows={4}
                    placeholder="Paste the Job Description (JD) text here to generate custom targeted interview questions..."
                    value={jdText}
                    onChange={(e) => setJdText(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-xs text-white placeholder-slate-500 outline-none focus:border-indigo-500"
                  />
                </div>
              </div>
            )}

            <button
              onClick={handleStartSession}
              disabled={loading}
              className="w-full py-3.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold rounded-2xl text-sm shadow-xl shadow-purple-600/25 flex items-center justify-center space-x-2 transition"
            >
              {loading ? (
                <Loader2 className="animate-spin" size={18} />
              ) : (
                <>
                  <Sparkles size={18} />
                  <span>Start {sessionMode === 'viva' ? 'Viva Exam' : 'Interview Session'}</span>
                </>
              )}
            </button>
          </div>
        )}

        {/* ACTIVE SESSION VIEW */}
        {gameState === 'active' && (
          <div className="space-y-6">
            
            {/* EXAMINER / QUESTION CARD */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 backdrop-blur-xl shadow-2xl relative overflow-hidden">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
                <span className="text-xs font-bold text-purple-400 uppercase tracking-widest">
                  QUESTION {currentQIndex + 1} OF 5 • {sessionMode === 'viva' ? selectedExperiment : (programmingLanguage || 'Technical Interview')}
                </span>
                <button
                  onClick={() => speakText(currentQuestion)}
                  className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs flex items-center space-x-1"
                >
                  <Volume2 size={14} />
                  <span>Speak</span>
                </button>
              </div>

              <h2 className="text-xl md:text-2xl font-bold text-slate-100 leading-snug">
                "{currentQuestion}"
              </h2>
            </div>

            {/* MISALIGNED ANSWER RECTIFICATION HUD ALERT */}
            {currentEvaluation?.isMisaligned && (
              <div className="p-5 rounded-2xl bg-amber-950/80 border border-amber-500/50 shadow-xl space-y-3">
                <div className="flex items-center space-x-2 text-amber-400 text-xs font-bold uppercase tracking-wider">
                  <ShieldAlert size={18} />
                  <span>MISALIGNED ANSWER DETECTED — RECTIFICATION REQUIRED</span>
                </div>
                <p className="text-sm font-semibold text-amber-200">
                  ⚠️ {currentEvaluation.misalignedReason}
                </p>
                {currentEvaluation.rectificationPrompt && (
                  <div className="p-3.5 rounded-xl bg-slate-900/90 border border-amber-500/30 text-xs text-amber-300">
                    <strong className="text-amber-400">Vedika Rectification Hint:</strong> {currentEvaluation.rectificationPrompt}
                  </div>
                )}
              </div>
            )}

            {/* ANSWER EVALUATION DISPLAY */}
            {currentEvaluation && (
              <div className="p-6 rounded-3xl bg-slate-900/90 border border-slate-800 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="px-3 py-1 bg-purple-600 text-white font-extrabold rounded-xl text-lg">
                      {currentEvaluation.grade}
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-200">Score: {currentEvaluation.score} / 10</h4>
                      <p className="text-xs text-slate-400">{currentEvaluation.explanation}</p>
                    </div>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 text-xs space-y-2">
                  <p className="text-slate-300"><strong className="text-purple-400">Model Answer:</strong> {currentEvaluation.correctAnswer}</p>
                  <p className="text-slate-400"><strong className="text-cyan-400">Improvement Advice:</strong> {currentEvaluation.improvementTip}</p>
                </div>
              </div>
            )}

            {/* ANSWER INPUT AREA */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 space-y-4">
              <label className="block text-xs font-semibold text-slate-300 uppercase">Your Answer</label>
              <textarea
                rows={4}
                placeholder="Type your answer clearly or dictate your response..."
                value={userAnswer}
                onChange={(e) => setUserAnswer(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-4 text-sm text-white placeholder-slate-500 outline-none focus:border-purple-500"
              />

              <div className="flex items-center justify-between">
                <button
                  onClick={handleSubmitAnswer}
                  disabled={loading || !userAnswer.trim()}
                  className="px-6 py-2.5 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl text-xs shadow-lg flex items-center space-x-2 transition disabled:opacity-50"
                >
                  {loading ? <Loader2 className="animate-spin" size={14} /> : <Send size={14} />}
                  <span>Submit Answer</span>
                </button>

                {currentEvaluation && (
                  <button
                    onClick={handleNextQuestion}
                    className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-xs shadow-lg flex items-center space-x-2 transition"
                  >
                    <span>Next Question</span>
                    <ChevronRight size={14} />
                  </button>
                )}
              </div>
            </div>

          </div>
        )}

        {/* SUMMARY SCORECARD VIEW */}
        {gameState === 'summary' && (
          <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-8 text-center space-y-6">
            <Award size={48} className="mx-auto text-purple-400" />
            <h2 className="text-3xl font-extrabold text-white">Session Completed!</h2>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              Here is your final evaluation summary matrix for <strong className="text-purple-300">{sessionMode === 'viva' ? selectedExperiment : programmingLanguage}</strong>.
            </p>

            <div className="space-y-3 max-w-3xl mx-auto text-left">
              {history.map((item, idx) => (
                <div key={idx} className="p-4 rounded-2xl bg-slate-950 border border-slate-800 text-xs space-y-1">
                  <div className="flex justify-between font-bold text-slate-200">
                    <span>Q{idx + 1}: {item.question}</span>
                    <span className="text-purple-400">Score: {item.score}/10 ({item.grade})</span>
                  </div>
                  <p className="text-slate-400">Your Answer: "{item.answer}"</p>
                  {item.isMisaligned && (
                    <p className="text-amber-400 font-semibold">Rectified Misaligned Concept: {item.misalignedReason}</p>
                  )}
                </div>
              ))}
            </div>

            <button
              onClick={() => setGameState('setup')}
              className="px-8 py-3 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-2xl text-xs shadow-xl inline-flex items-center space-x-2"
            >
              <RotateCcw size={16} />
              <span>Start Another Round</span>
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
