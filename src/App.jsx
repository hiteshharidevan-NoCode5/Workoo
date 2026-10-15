import React, { useState, useEffect, useRef } from 'react';
import { 
  Dumbbell, Shield, Play, Plus, Trash2, CheckCircle2, 
  Clock, ChevronRight, Activity, Mic, MicOff, Calendar,
  QrCode, X, Share2, Edit2
} from 'lucide-react';
import QRCode from 'qrcode';

const DAYS_OF_WEEK = [
  'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'
];

const INITIAL_MUSCLES = [
  'Chest', 'Back', 'Biceps', 'Triceps', 'Shoulders', 
  'Quads', 'Hamstrings', 'Calves', 'Core', 'Glutes', 'Traps', 'Forearms'
];

const DEFAULT_PRESET_SPLITS = [
  { id: 'split1', name: 'Back, Biceps & Lower Body', muscles: ['Back', 'Biceps', 'Quads', 'Hamstrings', 'Calves'] },
  { id: 'split2', name: 'Quads, Hamstrings & Calves (Leg Day)', muscles: ['Quads', 'Hamstrings', 'Calves'] },
  { id: 'split3', name: 'Chest & Triceps (Push Focus)', muscles: ['Chest', 'Triceps'] },
  { id: 'split4', name: 'Core Day (Abs & Stability)', muscles: ['Core'] },
  { id: 'split5', name: 'Shoulder & Chest Heavy', muscles: ['Shoulders', 'Chest'] }
];

const DEFAULT_EXERCISES = [
  { id: 'e1', name: 'Barbell Bench Press', muscle: 'Chest' },
  { id: 'e2', name: 'Incline Dumbbell Press', muscle: 'Chest' },
  { id: 'e3', name: 'Barbell Deadlift', muscle: 'Back' },
  { id: 'e4', name: 'Lat Pulldown / Pull-ups', muscle: 'Back' },
  { id: 'e5', name: 'Barbell Bicep Curl', muscle: 'Biceps' },
  { id: 'e6', name: 'Tricep Rope Pushdown', muscle: 'Triceps' },
  { id: 'e7', name: 'Overhead Shoulder Press', muscle: 'Shoulders' },
  { id: 'e8', name: 'Barbell Squat', muscle: 'Quads' },
  { id: 'e9', name: 'Romanian Deadlift', muscle: 'Hamstrings' },
  { id: 'e10', name: 'Standing Calf Raise', muscle: 'Calves' },
  { id: 'e11', name: 'Hanging Leg Raise', muscle: 'Core' },
  { id: 'e12', name: 'Plank', muscle: 'Core' }
];

const playChime = (type = 'restEnd') => {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    if (type === 'restEnd') {
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.setValueAtTime(1174.66, ctx.currentTime + 0.15);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
      osc.start();
      osc.stop(ctx.currentTime + 0.6);
    } else {
      osc.frequency.setValueAtTime(523.25, ctx.currentTime);
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
      osc.start();
      osc.stop(ctx.currentTime + 0.2);
    }
  } catch (err) {
    console.error('Audio error:', err);
  }
};

export default function App() {
  const [activeTab, setActiveTab] = useState('split');
  const [showQrModal, setShowQrModal] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState('');
  const appUrl = window.location.href;

  const [muscleGroups, setMuscleGroups] = useState(() => {
    try {
      const saved = localStorage.getItem('workoo_muscles');
      return saved ? JSON.parse(saved) : INITIAL_MUSCLES;
    } catch {
      return INITIAL_MUSCLES;
    }
  });
  const [newMuscleInput, setNewMuscleInput] = useState('');
  const [selectedMuscles, setSelectedMuscles] = useState(['Chest', 'Triceps']);

  const [presetSplits, setPresetSplits] = useState(() => {
    try {
      const saved = localStorage.getItem('workoo_presets');
      return saved ? JSON.parse(saved) : DEFAULT_PRESET_SPLITS;
    } catch {
      return DEFAULT_PRESET_SPLITS;
    }
  });

  const [editingPreset, setEditingPreset] = useState(null);

  // Editable Weekly Plan
  const [weeklyPlan, setWeeklyPlan] = useState(() => {
    try {
      const saved = localStorage.getItem('workoo_weekly');
      return saved ? JSON.parse(saved) : {
        Monday: ['Chest', 'Triceps'],
        Tuesday: ['Back', 'Biceps'],
        Wednesday: ['Quads', 'Hamstrings', 'Calves'],
        Thursday: ['Shoulders', 'Core'],
        Friday: ['Chest', 'Back'],
        Saturday: ['Core', 'Calves'],
        Sunday: ['Rest']
      };
    } catch {
      return { Sunday: ['Rest'] };
    }
  });

  // State for editing a specific day's schedule
  const [editingDay, setEditingDay] = useState(null); // e.g. { day: 'Thursday', muscles: ['Chest', 'Triceps'] }

  const [exercises] = useState(() => {
    try {
      const saved = localStorage.getItem('workoo_exercises');
      return saved ? JSON.parse(saved) : DEFAULT_EXERCISES;
    } catch {
      return DEFAULT_EXERCISES;
    }
  });

  const [activeWorkout, setActiveWorkout] = useState(() => {
    try {
      const saved = localStorage.getItem('workoo_active');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [timerSeconds, setTimerSeconds] = useState(0);
  const [timerRunning, setTimerRunning] = useState(false);
  const timerRef = useRef(null);
  const wakeLockRef = useRef(null);

  const [listening, setListening] = useState(false);
  const [voiceNotice, setVoiceNotice] = useState('');

  useEffect(() => {
    if (navigator.storage && navigator.storage.persist) {
      navigator.storage.persist().catch(() => {});
    }
  }, []);

  useEffect(() => {
    QRCode.toDataURL(appUrl, {
      width: 220,
      margin: 2,
      color: { dark: '#090d16', light: '#ffffff' }
    })
      .then(url => setQrDataUrl(url))
      .catch(err => console.error(err));
  }, [appUrl]);

  useEffect(() => {
    localStorage.setItem('workoo_muscles', JSON.stringify(muscleGroups));
  }, [muscleGroups]);

  useEffect(() => {
    localStorage.setItem('workoo_presets', JSON.stringify(presetSplits));
  }, [presetSplits]);

  useEffect(() => {
    localStorage.setItem('workoo_weekly', JSON.stringify(weeklyPlan));
  }, [weeklyPlan]);

  useEffect(() => {
    if (activeWorkout) {
      localStorage.setItem('workoo_active', JSON.stringify(activeWorkout));
    } else {
      localStorage.removeItem('workoo_active');
    }
  }, [activeWorkout]);

  useEffect(() => {
    const requestWakeLock = async () => {
      if ('wakeLock' in navigator && activeWorkout) {
        try {
          wakeLockRef.current = await navigator.wakeLock.request('screen');
        } catch (err) {
          console.log('Wake Lock unavailable:', err);
        }
      }
    };

    if (activeWorkout) {
      requestWakeLock();
    } else if (wakeLockRef.current) {
      wakeLockRef.current.release().then(() => {
        wakeLockRef.current = null;
      });
    }

    return () => {
      if (wakeLockRef.current) {
        wakeLockRef.current.release().catch(() => {});
      }
    };
  }, [activeWorkout]);

  useEffect(() => {
    if (timerRunning && timerSeconds > 0) {
      timerRef.current = setInterval(() => {
        setTimerSeconds(s => s - 1);
      }, 1000);
    } else if (timerSeconds === 0 && timerRunning) {
      setTimerRunning(false);
      clearInterval(timerRef.current);
      playChime('restEnd');
      if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
    }
    return () => clearInterval(timerRef.current);
  }, [timerRunning, timerSeconds]);

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Workoo! - Offline Workout Tracker',
          text: 'Private, offline workout tracker:',
          url: appUrl,
        });
      } catch (err) {
        console.log('Share dismissed');
      }
    }
  };

  const toggleVoiceControl = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Speech recognition is not supported in this browser.');
      return;
    }

    if (listening) {
      setListening(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      setListening(true);
      setVoiceNotice('Listening... Say muscle names or "Clear"');
    };

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript.toLowerCase();
      setVoiceNotice(`Heard: "${transcript}"`);

      if (transcript.includes('clear') || transcript.includes('reset')) {
        setSelectedMuscles([]);
      } else {
        muscleGroups.forEach(m => {
          if (transcript.includes(m.toLowerCase())) {
            setSelectedMuscles(prev => prev.includes(m) ? prev : [...prev, m]);
          }
        });
      }
      setListening(false);
    };

    recognition.onerror = () => {
      setListening(false);
      setVoiceNotice('Voice recognition ended.');
    };

    recognition.onend = () => {
      setListening(false);
    };

    recognition.start();
  };

  const toggleMuscle = (muscle) => {
    setSelectedMuscles(prev => 
      prev.includes(muscle) ? prev.filter(m => m !== muscle) : [...prev, muscle]
    );
  };

  const handleAddCustomMuscle = (e) => {
    e.preventDefault();
    const clean = newMuscleInput.trim();
    if (clean && !muscleGroups.some(m => m.toLowerCase() === clean.toLowerCase())) {
      setMuscleGroups([...muscleGroups, clean]);
      setSelectedMuscles([...selectedMuscles, clean]);
      setNewMuscleInput('');
    }
  };

  // Preset Handlers
  const handleOpenNewPreset = () => {
    setEditingPreset({
      id: `custom_${Date.now()}`,
      name: '',
      muscles: []
    });
  };

  const handleOpenEditPreset = (preset, e) => {
    e.stopPropagation();
    setEditingPreset({ ...preset, muscles: [...preset.muscles] });
  };

  const handleDeletePreset = (id, e) => {
    e.stopPropagation();
    if (confirm('Delete this preset combination?')) {
      setPresetSplits(presetSplits.filter(p => p.id !== id));
    }
  };

  const togglePresetEditorMuscle = (muscle) => {
    setEditingPreset(prev => {
      const has = prev.muscles.includes(muscle);
      return {
        ...prev,
        muscles: has ? prev.muscles.filter(m => m !== muscle) : [...prev.muscles, muscle]
      };
    });
  };

  const handleSavePreset = (e) => {
    e.preventDefault();
    if (!editingPreset.name.trim()) {
      alert('Please enter a preset name');
      return;
    }
    if (editingPreset.muscles.length === 0) {
      alert('Please select at least one muscle group');
      return;
    }

    const exists = presetSplits.some(p => p.id === editingPreset.id);
    if (exists) {
      setPresetSplits(presetSplits.map(p => p.id === editingPreset.id ? editingPreset : p));
    } else {
      setPresetSplits([...presetSplits, editingPreset]);
    }
    setEditingPreset(null);
  };

  // Day Schedule Handlers
  const handleOpenEditDay = (day) => {
    const current = weeklyPlan[day] || ['Rest'];
    setEditingDay({
      day,
      isRest: current.length === 1 && current[0] === 'Rest',
      muscles: current[0] === 'Rest' ? [] : [...current]
    });
  };

  const toggleDayEditorMuscle = (muscle) => {
    setEditingDay(prev => {
      const has = prev.muscles.includes(muscle);
      const updated = has ? prev.muscles.filter(m => m !== muscle) : [...prev.muscles, muscle];
      return { ...prev, isRest: false, muscles: updated };
    });
  };

  const applyPresetToDay = (presetMuscles) => {
    setEditingDay(prev => ({
      ...prev,
      isRest: false,
      muscles: [...presetMuscles]
    }));
  };

  const handleSaveDayPlan = (e) => {
    e.preventDefault();
    const finalMuscles = editingDay.isRest || editingDay.muscles.length === 0 ? ['Rest'] : editingDay.muscles;
    setWeeklyPlan(prev => ({
      ...prev,
      [editingDay.day]: finalMuscles
    }));
    setEditingDay(null);
  };

  const startWorkoutFromSelection = (customList = null) => {
    const targets = customList || selectedMuscles;
    const matching = exercises.filter(e => targets.includes(e.muscle));
    
    const sessionItems = matching.length > 0 ? matching.map(m => ({
      id: m.id,
      name: m.name,
      muscle: m.muscle,
      sets: [{ weight: '', reps: '', done: false }]
    })) : targets.map((t, idx) => ({
      id: `custom_${idx}`,
      name: `${t} Exercise`,
      muscle: t,
      sets: [{ weight: '', reps: '', done: false }]
    }));

    setActiveWorkout({
      startedAt: new Date().toISOString(),
      name: targets.join(' + ') + ' Session',
      items: sessionItems
    });
    playChime('start');
    setActiveTab('session');
  };

  const addSet = (itemIndex) => {
    const updated = { ...activeWorkout };
    updated.items[itemIndex].sets.push({ weight: '', reps: '', done: false });
    setActiveWorkout(updated);
  };

  const toggleSetDone = (itemIdx, setIdx) => {
    const updated = { ...activeWorkout };
    const currentStatus = updated.items[itemIdx].sets[setIdx].done;
    updated.items[itemIdx].sets[setIdx].done = !currentStatus;
    setActiveWorkout(updated);
    if (!currentStatus) {
      setTimerSeconds(60);
      setTimerRunning(true);
      playChime('start');
    }
  };

  const currentDayName = DAYS_OF_WEEK[new Date().getDay() === 0 ? 6 : new Date().getDay() - 1];

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#090d16', color: '#f1f5f9', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      {/* Header */}
      <header style={{ padding: '16px 20px', borderBottom: '1px solid #1e293b', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <img src="icon.png" alt="Workoo!" style={{ width: '28px', height: '28px', borderRadius: '4px' }} />
          <h1 style={{ fontSize: '20px', fontWeight: 'bold', margin: 0, letterSpacing: '-0.5px' }}>Workoo!</h1>
          <span style={{ fontSize: '11px', background: '#0284c7', color: '#fff', padding: '2px 8px', borderRadius: '12px' }}>Offline</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <button 
            onClick={() => setShowQrModal(true)} 
            title="Scan & Share App"
            style={{ background: 'transparent', border: 'none', color: '#38bdf8', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
          >
            <QrCode size={22} />
          </button>
          <button 
            onClick={() => setActiveTab('privacy')} 
            style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
          >
            <Shield size={20} />
          </button>
        </div>
      </header>

      <main style={{ maxWidth: '640px', margin: '0 auto', padding: '20px 16px 90px 16px' }}>
        {activeTab === 'split' && (
          <div>
            {/* Weekly Muscle Schedule */}
            <div style={{ background: '#131b2e', border: '1px solid #1e293b', borderRadius: '12px', padding: '16px', marginBottom: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <h2 style={{ fontSize: '16px', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Calendar size={18} color="#38bdf8" /> Weekly Muscle Schedule
                </h2>
                <span style={{ fontSize: '12px', color: '#38bdf8', fontWeight: '600' }}>Today: {currentDayName}</span>
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {DAYS_OF_WEEK.map(day => {
                  const isToday = day === currentDayName;
                  const daySplit = weeklyPlan[day] || ['Rest'];
                  const isRest = daySplit.length === 1 && daySplit[0] === 'Rest';

                  return (
                    <div 
                      key={day} 
                      style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center', 
                        padding: '8px 12px', 
                        borderRadius: '6px', 
                        background: isToday ? '#1e293b' : 'transparent',
                        border: isToday ? '1px solid #0284c7' : '1px solid #1e293b'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: 0, overflow: 'hidden' }}>
                        <span style={{ fontSize: '13px', fontWeight: isToday ? 'bold' : 'normal', color: isToday ? '#38bdf8' : '#cbd5e1', minWidth: '75px' }}>
                          {day}
                        </span>
                        <span style={{ fontSize: '12px', color: isRest ? '#64748b' : '#94a3b8', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {daySplit.join(', ')}
                        </span>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <button
                          onClick={() => handleOpenEditDay(day)}
                          title={`Edit ${day}'s routine`}
                          style={{ background: 'transparent', border: 'none', color: '#38bdf8', cursor: 'pointer', padding: '4px' }}
                        >
                          <Edit2 size={15} />
                        </button>
                        {!isRest && (
                          <button
                            onClick={() => startWorkoutFromSelection(daySplit)}
                            style={{ background: '#0284c7', border: 'none', color: '#fff', padding: '4px 10px', borderRadius: '4px', fontSize: '11px', cursor: 'pointer', fontWeight: 'bold' }}
                          >
                            Start
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Target Muscle Groups */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <h2 style={{ fontSize: '16px', margin: 0 }}>Target Muscle Groups</h2>
              <button
                onClick={toggleVoiceControl}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: listening ? '#dc2626' : '#1e293b',
                  border: '1px solid #334155',
                  color: '#fff',
                  padding: '6px 12px',
                  borderRadius: '20px',
                  fontSize: '12px',
                  cursor: 'pointer'
                }}
              >
                {listening ? <MicOff size={14} /> : <Mic size={14} color="#38bdf8" />}
                {listening ? 'Listening...' : 'Voice Select'}
              </button>
            </div>

            {voiceNotice && (
              <div style={{ fontSize: '12px', color: '#38bdf8', marginBottom: '10px', fontStyle: 'italic' }}>
                {voiceNotice}
              </div>
            )}

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '16px' }}>
              {muscleGroups.map(muscle => {
                const active = selectedMuscles.includes(muscle);
                return (
                  <button
                    key={muscle}
                    onClick={() => toggleMuscle(muscle)}
                    style={{
                      padding: '8px 14px',
                      borderRadius: '20px',
                      fontSize: '13px',
                      border: active ? '1px solid #38bdf8' : '1px solid #334155',
                      background: active ? '#0284c7' : '#1e293b',
                      color: active ? '#fff' : '#cbd5e1',
                      cursor: 'pointer'
                    }}
                  >
                    {muscle}
                  </button>
                );
              })}
            </div>

            <form onSubmit={handleAddCustomMuscle} style={{ display: 'flex', gap: '8px', marginBottom: '24px' }}>
              <input
                type="text"
                placeholder="Add custom muscle (e.g. Forearms, Neck)..."
                value={newMuscleInput}
                onChange={(e) => setNewMuscleInput(e.target.value)}
                style={{
                  flex: 1,
                  padding: '8px 12px',
                  background: '#1e293b',
                  border: '1px solid #334155',
                  borderRadius: '6px',
                  color: '#fff',
                  fontSize: '13px'
                }}
              />
              <button
                type="submit"
                style={{
                  background: '#334155',
                  border: 'none',
                  color: '#fff',
                  padding: '8px 14px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '13px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                <Plus size={16} /> Add
              </button>
            </form>

            {/* Editable Preset Combinations */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <h2 style={{ fontSize: '16px', margin: 0 }}>Preset Combinations</h2>
              <button
                onClick={handleOpenNewPreset}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  background: 'transparent',
                  border: '1px solid #0284c7',
                  color: '#38bdf8',
                  padding: '4px 10px',
                  borderRadius: '6px',
                  fontSize: '12px',
                  cursor: 'pointer'
                }}
              >
                <Plus size={14} /> New Preset
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '24px' }}>
              {presetSplits.map(split => (
                <div
                  key={split.id}
                  onClick={() => setSelectedMuscles(split.muscles)}
                  style={{
                    padding: '12px 14px',
                    borderRadius: '8px',
                    border: '1px solid #334155',
                    background: '#1e293b',
                    color: '#fff',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    cursor: 'pointer'
                  }}
                >
                  <div style={{ flex: 1, marginRight: '10px' }}>
                    <div style={{ fontWeight: '600', fontSize: '14px', color: '#f1f5f9' }}>{split.name}</div>
                    <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '2px' }}>{split.muscles.join(', ')}</div>
                  </div>
                  
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <button
                      onClick={(e) => handleOpenEditPreset(split, e)}
                      title="Edit Preset"
                      style={{ background: 'transparent', border: 'none', color: '#38bdf8', cursor: 'pointer', padding: '4px' }}
                    >
                      <Edit2 size={16} />
                    </button>
                    <button
                      onClick={(e) => handleDeletePreset(split.id, e)}
                      title="Delete Preset"
                      style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '4px' }}
                    >
                      <Trash2 size={16} />
                    </button>
                    <ChevronRight size={16} color="#64748b" />
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={() => startWorkoutFromSelection()}
              disabled={selectedMuscles.length === 0}
              style={{
                width: '100%',
                padding: '14px',
                background: selectedMuscles.length === 0 ? '#334155' : '#0284c7',
                border: 'none',
                borderRadius: '8px',
                color: '#fff',
                fontWeight: 'bold',
                cursor: selectedMuscles.length === 0 ? 'not-allowed' : 'pointer',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <Play size={18} /> Start Session ({selectedMuscles.length} Muscles)
            </button>
          </div>
        )}

        {/* Active Workout Session */}
        {activeTab === 'session' && (
          <div>
            {!activeWorkout ? (
              <div style={{ textAlign: 'center', padding: '40px 0', color: '#94a3b8' }}>
                <Activity size={48} style={{ opacity: 0.4, marginBottom: '12px' }} />
                <p>No active workout underway.</p>
                <button onClick={() => setActiveTab('split')} style={{ color: '#38bdf8', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}>
                  Pick a split to begin &rarr;
                </button>
              </div>
            ) : (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <div>
                    <h2 style={{ margin: 0, fontSize: '18px' }}>{activeWorkout.name}</h2>
                    <span style={{ fontSize: '12px', color: '#10b981' }}>● Screen Wake Lock Active</span>
                  </div>
                  <button 
                    onClick={() => { if(confirm('Finish and record workout?')) setActiveWorkout(null); }}
                    style={{ background: '#dc2626', border: 'none', color: '#fff', padding: '6px 12px', borderRadius: '6px', fontSize: '12px', cursor: 'pointer' }}
                  >
                    Finish
                  </button>
                </div>

                {timerSeconds > 0 && (
                  <div style={{ background: '#1e293b', border: '1px solid #38bdf8', padding: '14px', borderRadius: '8px', marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <Clock size={22} color="#38bdf8" />
                      <div>
                        <div style={{ fontWeight: 'bold', fontSize: '16px' }}>Rest: {timerSeconds}s</div>
                        <div style={{ fontSize: '11px', color: '#94a3b8' }}>Chimes will alert when time is up</div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button onClick={() => setTimerSeconds(s => s + 30)} style={{ background: '#334155', border: 'none', color: '#fff', padding: '6px 8px', borderRadius: '4px', fontSize: '12px', cursor: 'pointer' }}>+30s</button>
                      <button onClick={() => setTimerSeconds(0)} style={{ background: '#dc2626', border: 'none', color: '#fff', padding: '6px 8px', borderRadius: '4px', fontSize: '12px', cursor: 'pointer' }}>Skip</button>
                    </div>
                  </div>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {activeWorkout.items.map((item, itemIdx) => (
                    <div key={item.id} style={{ background: '#1e293b', borderRadius: '8px', padding: '16px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                        <span style={{ fontWeight: '600' }}>{item.name}</span>
                        <span style={{ fontSize: '12px', color: '#38bdf8' }}>{item.muscle}</span>
                      </div>
                      
                      {item.sets.map((set, sIdx) => (
                        <div key={sIdx} style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '8px' }}>
                          <span style={{ width: '24px', fontSize: '12px', color: '#94a3b8' }}>#{sIdx + 1}</span>
                          <input 
                            placeholder="kg" 
                            style={{ width: '60px', padding: '6px', background: '#0f172a', border: '1px solid #334155', color: '#fff', borderRadius: '4px' }} 
                          />
                          <input 
                            placeholder="reps" 
                            style={{ width: '60px', padding: '6px', background: '#0f172a', border: '1px solid #334155', color: '#fff', borderRadius: '4px' }} 
                          />
                          <button
                            onClick={() => toggleSetDone(itemIdx, sIdx)}
                            style={{ 
                              marginLeft: 'auto', 
                              background: set.done ? '#10b981' : '#334155', 
                              border: 'none', 
                              color: '#fff', 
                              padding: '6px 12px', 
                              borderRadius: '4px',
                              cursor: 'pointer' 
                            }}
                          >
                            <CheckCircle2 size={16} />
                          </button>
                        </div>
                      ))}

                      <button 
                        onClick={() => addSet(itemIdx)}
                        style={{ marginTop: '8px', background: 'transparent', border: '1px dashed #475569', color: '#cbd5e1', padding: '6px', width: '100%', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}
                      >
                        + Add Set
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Privacy Screen */}
        {activeTab === 'privacy' && (
          <div style={{ background: '#1e293b', padding: '20px', borderRadius: '8px' }}>
            <h2 style={{ fontSize: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Shield color="#10b981" /> 100% Privacy Guarantee
            </h2>
            <p style={{ fontSize: '13px', color: '#cbd5e1', lineHeight: '1.6' }}>
              Workoo! runs exclusively on your device. Zero servers, zero telemetry, zero analytics.
            </p>
            <hr style={{ borderColor: '#334155', margin: '16px 0' }} />
            <button 
              onClick={() => { if(confirm('Clear local data?')) { localStorage.clear(); window.location.reload(); } }}
              style={{ width: '100%', padding: '10px', background: 'transparent', border: '1px solid #ef4444', borderRadius: '6px', color: '#ef4444', fontWeight: 'bold', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}
            >
              <Trash2 size={16} /> Wipe Local Storage
            </button>
          </div>
        )}
      </main>

      {/* Day Schedule Editor Modal */}
      {editingDay && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.75)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          padding: '16px',
          zIndex: 110
        }}>
          <div style={{
            background: '#131b2e',
            border: '1px solid #334155',
            borderRadius: '16px',
            padding: '24px',
            maxWidth: '380px',
            width: '100%',
            position: 'relative',
            maxHeight: '90vh',
            overflowY: 'auto'
          }}>
            <button 
              onClick={() => setEditingDay(null)}
              style={{ position: 'absolute', top: '16px', right: '16px', background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
            >
              <X size={20} />
            </button>

            <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', color: '#f1f5f9' }}>
              Edit Routine for {editingDay.day}
            </h3>

            {/* Quick apply preset */}
            {presetSplits.length > 0 && (
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '6px' }}>
                  Quick Apply Saved Preset:
                </label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {presetSplits.map(preset => (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => applyPresetToDay(preset.muscles)}
                      style={{
                        padding: '6px 10px',
                        borderRadius: '6px',
                        fontSize: '12px',
                        background: '#1e293b',
                        border: '1px solid #0284c7',
                        color: '#38bdf8',
                        cursor: 'pointer'
                      }}
                    >
                      {preset.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', color: '#cbd5e1' }}>
                <input 
                  type="checkbox"
                  checked={editingDay.isRest}
                  onChange={(e) => setEditingDay({ ...editingDay, isRest: e.target.checked, muscles: [] })}
                  style={{ width: '16px', height: '16px', accentColor: '#0284c7' }}
                />
                Mark as Rest Day
              </label>
            </div>

            {!editingDay.isRest && (
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '8px' }}>
                  Target Muscle Groups ({editingDay.muscles.length} selected):
                </label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', maxHeight: '160px', overflowY: 'auto' }}>
                  {muscleGroups.map(muscle => {
                    const active = editingDay.muscles.includes(muscle);
                    return (
                      <button
                        type="button"
                        key={muscle}
                        onClick={() => toggleDayEditorMuscle(muscle)}
                        style={{
                          padding: '6px 12px',
                          borderRadius: '16px',
                          fontSize: '12px',
                          border: active ? '1px solid #38bdf8' : '1px solid #334155',
                          background: active ? '#0284c7' : '#1e293b',
                          color: active ? '#fff' : '#cbd5e1',
                          cursor: 'pointer'
                        }}
                      >
                        {muscle}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="button"
                onClick={() => setEditingDay(null)}
                style={{ flex: 1, padding: '10px', background: 'transparent', border: '1px solid #334155', borderRadius: '6px', color: '#cbd5e1', fontSize: '13px', cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveDayPlan}
                style={{ flex: 1, padding: '10px', background: '#0284c7', border: 'none', borderRadius: '6px', color: '#fff', fontWeight: 'bold', fontSize: '13px', cursor: 'pointer' }}
              >
                Save Day
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Preset Create / Edit Modal */}
      {editingPreset && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.75)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          padding: '16px',
          zIndex: 110
        }}>
          <div style={{
            background: '#131b2e',
            border: '1px solid #334155',
            borderRadius: '16px',
            padding: '24px',
            maxWidth: '380px',
            width: '100%',
            position: 'relative',
            maxHeight: '90vh',
            overflowY: 'auto'
          }}>
            <button 
              onClick={() => setEditingPreset(null)}
              style={{ position: 'absolute', top: '16px', right: '16px', background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
            >
              <X size={20} />
            </button>

            <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', color: '#f1f5f9' }}>
              {presetSplits.some(p => p.id === editingPreset.id) ? 'Edit Preset Split' : 'Design New Preset'}
            </h3>

            <form onSubmit={handleSavePreset}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '6px' }}>
                  Preset Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Chest & Triceps (Push)"
                  value={editingPreset.name}
                  onChange={(e) => setEditingPreset({ ...editingPreset, name: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    background: '#1e293b',
                    border: '1px solid #334155',
                    borderRadius: '6px',
                    color: '#fff',
                    fontSize: '14px',
                    boxSizing: 'border-box'
                  }}
                  autoFocus
                />
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '8px' }}>
                  Included Muscle Groups ({editingPreset.muscles.length} selected)
                </label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', maxHeight: '180px', overflowY: 'auto' }}>
                  {muscleGroups.map(muscle => {
                    const active = editingPreset.muscles.includes(muscle);
                    return (
                      <button
                        type="button"
                        key={muscle}
                        onClick={() => togglePresetEditorMuscle(muscle)}
                        style={{
                          padding: '6px 12px',
                          borderRadius: '16px',
                          fontSize: '12px',
                          border: active ? '1px solid #38bdf8' : '1px solid #334155',
                          background: active ? '#0284c7' : '#1e293b',
                          color: active ? '#fff' : '#cbd5e1',
                          cursor: 'pointer'
                        }}
                      >
                        {muscle}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => setEditingPreset(null)}
                  style={{ flex: 1, padding: '10px', background: 'transparent', border: '1px solid #334155', borderRadius: '6px', color: '#cbd5e1', fontSize: '13px', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{ flex: 1, padding: '10px', background: '#0284c7', border: 'none', borderRadius: '6px', color: '#fff', fontWeight: 'bold', fontSize: '13px', cursor: 'pointer' }}
                >
                  Save Preset
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* QR Modal */}
      {showQrModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.75)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          padding: '16px',
          zIndex: 100
        }}>
          <div style={{
            background: '#131b2e',
            border: '1px solid #334155',
            borderRadius: '16px',
            padding: '24px',
            maxWidth: '340px',
            width: '100%',
            textAlign: 'center',
            position: 'relative'
          }}>
            <button 
              onClick={() => setShowQrModal(false)}
              style={{ position: 'absolute', top: '14px', right: '14px', background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
            >
              <X size={20} />
            </button>

            <h3 style={{ margin: '0 0 6px 0', fontSize: '18px', color: '#f1f5f9' }}>Scan to Install Workoo!</h3>
            <p style={{ fontSize: '12px', color: '#94a3b8', margin: '0 0 16px 0' }}>
              Scan with any phone camera to open and install offline.
            </p>

            {qrDataUrl && (
              <div style={{ background: '#fff', padding: '12px', borderRadius: '12px', display: 'inline-block', marginBottom: '16px' }}>
                <img src={qrDataUrl} alt="App QR Code" style={{ display: 'block', width: '200px', height: '200px' }} />
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {navigator.share && (
                <button
                  onClick={handleShare}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    width: '100%',
                    padding: '10px',
                    background: '#0284c7',
                    border: 'none',
                    borderRadius: '8px',
                    color: '#fff',
                    fontWeight: 'bold',
                    fontSize: '13px',
                    cursor: 'pointer'
                  }}
                >
                  <Share2 size={16} /> Share Link
                </button>
              )}
              <button
                onClick={() => setShowQrModal(false)}
                style={{ width: '100%', padding: '8px', background: 'transparent', border: '1px solid #334155', borderRadius: '8px', color: '#cbd5e1', fontSize: '12px', cursor: 'pointer' }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Navigation */}
      <nav style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: '#0f172a', borderTop: '1px solid #1e293b', display: 'flex', justifyContent: 'space-around', padding: '12px 0' }}>
        <button 
          onClick={() => setActiveTab('split')}
          style={{ background: 'none', border: 'none', color: activeTab === 'split' ? '#38bdf8' : '#64748b', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', fontSize: '11px', gap: '4px' }}
        >
          <Dumbbell size={20} />
          <span>Splits</span>
        </button>
        <button 
          onClick={() => setActiveTab('session')}
          style={{ background: 'none', border: 'none', color: activeTab === 'session' ? '#38bdf8' : '#64748b', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', fontSize: '11px', gap: '4px' }}
        >
          <Activity size={20} />
          <span>Workout</span>
        </button>
        <button 
          onClick={() => setActiveTab('privacy')}
          style={{ background: 'none', border: 'none', color: activeTab === 'privacy' ? '#38bdf8' : '#64748b', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', fontSize: '11px', gap: '4px' }}
        >
          <Shield size={20} />
          <span>Privacy</span>
        </button>
      </nav>
    </div>
  );
}
