import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { Onboarding } from './components/Onboarding';
import { CalendarView } from './components/CalendarView';
import { StatsChart } from './components/StatsChart';
import { SettingsModal } from './components/SettingsModal';
import { ArchiveView } from './components/ArchiveView';
import { LessonCard } from './components/LessonCard';
import { AdInterstitial } from './components/AdInterstitial';
import PremiumModal from './components/PremiumModal';
import { AuthModal } from './components/AuthModal';
import { generateLesson } from './services/geminiService';
import { login, logout, getStorageKey } from './services/authService';
import { purchaseProduct } from './services/storeService'; // Import Store Service
import { 
  UserSettings, 
  DailyLesson, 
  LearningTrack, 
  UserProgress,
  LessonArchive,
  SubscriptionState,
  User,
  SKU
} from './types';
import { 
  SunIcon, 
  MoonIcon, 
  FireIcon, 
  SettingsIcon,
  BookOpenIcon,
  CrownIcon
} from './components/Icons';

// Helper to get today's date string YYYY-MM-DD local time
const getTodayString = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const INITIAL_SETTINGS: UserSettings = {
  isOnboarded: false,
  selectedTrack: null,
  customTopic: null,
  isDarkMode: false,
};

const INITIAL_PROGRESS: UserProgress = {
  currentStreak: 0,
  longestStreak: 0,
  lastCompletedDate: null,
  history: {}
};

const INITIAL_SUBSCRIPTION: SubscriptionState = {
  isPremium: false,
  premiumType: 'none',
  freeTrackId: null,
  purchasedTracks: [],
  purchasedCustomTopics: []
};

const App: React.FC = () => {
  // --- State ---
  const [user, setUser] = useState<User | null>(null);
  const [settings, setSettings] = useState<UserSettings>(INITIAL_SETTINGS);
  const [progress, setProgress] = useState<UserProgress>(INITIAL_PROGRESS);
  const [archive, setArchive] = useState<LessonArchive>({});
  const [subscription, setSubscription] = useState<SubscriptionState>(INITIAL_SUBSCRIPTION);
  
  const [todayLesson, setTodayLesson] = useState<DailyLesson | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isPurchaseProcessing, setIsPurchaseProcessing] = useState(false);
  
  // UI State
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [currentView, setCurrentView] = useState<'home' | 'archive'>('home');
  const [showAd, setShowAd] = useState(false);
  const [showPremiumModal, setShowPremiumModal] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [premiumTargetTrack, setPremiumTargetTrack] = useState<LearningTrack | null>(null);
  const [premiumTargetCustomTopic, setPremiumTargetCustomTopic] = useState<string | null>(null);

  // --- Initialization & Data Loading ---
  
  // This effect runs whenever the 'user' changes (login/logout)
  useEffect(() => {
    loadUserData(user);
  }, [user]);

  const loadUserData = (currentUser: User | null) => {
    // Determine the key prefix based on who is logged in
    const userId = currentUser ? currentUser.id : undefined;

    const savedSettings = localStorage.getItem(getStorageKey('calearner_settings', userId));
    const savedProgress = localStorage.getItem(getStorageKey('calearner_progress', userId));
    const savedArchive = localStorage.getItem(getStorageKey('calearner_archive', userId));
    const savedSub = localStorage.getItem(getStorageKey('calearner_subscription', userId));
    const savedLesson = localStorage.getItem(getStorageKey(`calearner_lesson_${getTodayString()}`, userId));

    setSettings(savedSettings ? JSON.parse(savedSettings) : INITIAL_SETTINGS);
    setProgress(savedProgress ? JSON.parse(savedProgress) : INITIAL_PROGRESS);
    setArchive(savedArchive ? JSON.parse(savedArchive) : {});
    setSubscription(savedSub ? JSON.parse(savedSub) : INITIAL_SUBSCRIPTION);
    
    // Reset lesson if we are switching users, unless specifically saved for this user
    setTodayLesson(savedLesson ? JSON.parse(savedLesson) : null);
    
    // Reset View
    setCurrentView('home');
  };

  // --- Persistence ---
  // Save changes to local storage based on CURRENT user
  
  useEffect(() => {
    localStorage.setItem(getStorageKey('calearner_settings', user?.id), JSON.stringify(settings));
    // Also sync global theme
    if (settings.isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [settings, user]);

  useEffect(() => {
    localStorage.setItem(getStorageKey('calearner_progress', user?.id), JSON.stringify(progress));
  }, [progress, user]);
  
  useEffect(() => {
    localStorage.setItem(getStorageKey('calearner_archive', user?.id), JSON.stringify(archive));
  }, [archive, user]);
  
  useEffect(() => {
    localStorage.setItem(getStorageKey('calearner_subscription', user?.id), JSON.stringify(subscription));
  }, [subscription, user]);


  // --- Handlers ---

  const handleLogin = async (email: string) => {
      const loggedInUser = await login(email);
      setUser(loggedInUser);
      setShowAuthModal(false);
      
      // The useEffect will trigger data reload
      confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.8 },
          colors: ['#3b82f6', '#8b5cf6']
      });
  };

  const handleLogout = async () => {
      await logout();
      setUser(null);
      // The useEffect will trigger data reload (reverting to guest data)
  };

  const handleOnboardingSelection = async (track: LearningTrack, customTopic?: string) => {
    setSubscription(prev => ({
        ...prev,
        freeTrackId: track,
        purchasedCustomTopics: (track === LearningTrack.CUSTOM && customTopic) 
            ? [...prev.purchasedCustomTopics, customTopic.toLowerCase()] 
            : prev.purchasedCustomTopics
    }));
    
    const newSettings = { 
        ...settings, 
        isOnboarded: true, 
        selectedTrack: track,
        customTopic: customTopic || null
    };
    setSettings(newSettings);
    await fetchLesson(track, customTopic || null);
  };

  const isTrackOwned = (track: LearningTrack, specificCustomTopic?: string | null) => {
      if (subscription.isPremium) return true;
      if (subscription.freeTrackId === track) {
         if (track !== LearningTrack.CUSTOM) return true;
      }
      
      if (track === LearningTrack.CUSTOM && specificCustomTopic) {
          return subscription.purchasedCustomTopics.includes(specificCustomTopic.toLowerCase());
      }

      return subscription.purchasedTracks.includes(track);
  };

  const handleTrackSwitchAttempt = (track: LearningTrack, customTopic?: string) => {
      if (isTrackOwned(track, customTopic)) {
          setSettings(prev => ({ 
              ...prev, 
              selectedTrack: track,
              customTopic: customTopic || (track === LearningTrack.CUSTOM ? prev.customTopic : null)
          }));
          
          setTodayLesson(null);
          fetchLesson(track, customTopic);
      } else {
          setPremiumTargetTrack(track);
          if (track === LearningTrack.CUSTOM && customTopic) {
              setPremiumTargetCustomTopic(customTopic);
          } else {
              setPremiumTargetCustomTopic(null);
          }
          setShowPremiumModal(true);
      }
  };

  const fetchLesson = async (track: LearningTrack, customTopic?: string | null) => {
    const dateStr = getTodayString();
    
    if (todayLesson && todayLesson.id === dateStr && todayLesson.track === track) {
         if (track !== LearningTrack.CUSTOM || settings.customTopic === customTopic) {
             return;
         }
    }

    const savedLessonKey = getStorageKey(`calearner_lesson_${dateStr}`, user?.id);
    const savedLesson = localStorage.getItem(savedLessonKey);
    let shouldShowAd = !subscription.isPremium;
    
    if (savedLesson) {
        const parsed = JSON.parse(savedLesson);
        if (parsed.track === track) {
            setTodayLesson(parsed);
            shouldShowAd = false;
        }
    }

    if (shouldShowAd) {
        setShowAd(true);
    } else {
        if (!todayLesson || todayLesson.track !== track || (track === LearningTrack.CUSTOM && settings.customTopic !== customTopic)) {
            const topic = customTopic || settings.customTopic;
            await performLessonGeneration(track, dateStr, topic);
        }
    }
  };

  const performLessonGeneration = async (track: LearningTrack, dateStr: string, customTopic?: string | null) => {
    setIsLoading(true);
    const lesson = await generateLesson(track, dateStr, customTopic);
    
    if (progress.history[dateStr]) {
        lesson.completed = true;
    }

    setTodayLesson(lesson);
    localStorage.setItem(getStorageKey(`calearner_lesson_${dateStr}`, user?.id), JSON.stringify(lesson));
    setIsLoading(false);
  };

  const handleAdClose = async () => {
      setShowAd(false);
      if (settings.selectedTrack) {
          await performLessonGeneration(settings.selectedTrack, getTodayString(), settings.customTopic);
      }
  };

  const toggleTheme = () => {
    setSettings(prev => ({ ...prev, isDarkMode: !prev.isDarkMode }));
  };

  const resetProgress = () => {
    setProgress(INITIAL_PROGRESS);
    setArchive({});
    setTodayLesson(null);
    localStorage.removeItem(getStorageKey('calearner_progress', user?.id));
    localStorage.removeItem(getStorageKey('calearner_archive', user?.id));
  };

  const playSuccessSound = () => {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;
    
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(523.25, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1046.5, ctx.currentTime + 0.1);
    
    gain.gain.setValueAtTime(0.1, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
    
    osc.start();
    osc.stop(ctx.currentTime + 0.5);
  };

  const handleCompleteLesson = () => {
    if (!todayLesson || todayLesson.completed) return;

    confetti({
      particleCount: 150,
      spread: 70,
      origin: { y: 0.7 },
      colors: ['#3b82f6', '#10b981', '#f59e0b']
    });
    
    playSuccessSound();

    const dateStr = getTodayString();
    
    let newCurrentStreak = progress.currentStreak;
    const lastDate = progress.lastCompletedDate;
    
    if (lastDate) {
        const last = new Date(lastDate);
        const now = new Date(dateStr);
        const diffTime = Math.abs(now.getTime() - last.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
        
        if (diffDays === 1) {
            newCurrentStreak += 1;
        } else if (diffDays > 1) {
            newCurrentStreak = 1;
        }
    } else {
        newCurrentStreak = 1;
    }

    const newProgress = {
        ...progress,
        currentStreak: newCurrentStreak,
        longestStreak: Math.max(newCurrentStreak, progress.longestStreak),
        lastCompletedDate: dateStr,
        history: { ...progress.history, [dateStr]: true }
    };

    const updatedLesson = { ...todayLesson, completed: true };
    const newArchive = { ...archive, [dateStr]: updatedLesson };

    setProgress(newProgress);
    setArchive(newArchive);
    setTodayLesson(updatedLesson);
    
    localStorage.setItem(getStorageKey(`calearner_lesson_${dateStr}`, user?.id), JSON.stringify(updatedLesson));
  };

  const handleShare = async (lessonToShare: DailyLesson | null = todayLesson) => {
    if (!lessonToShare) return;
    
    const shareData = {
      title: 'CaLearner Daily Tip',
      text: `Did you know? ${lessonToShare.title}\n\n"${lessonToShare.practicalTip}"\n\nLearned via CaLearner AI!`,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        console.log('Share canceled');
      }
    } else {
      navigator.clipboard.writeText(shareData.text);
      alert('Lesson copied to clipboard!');
    }
  };

  // --- Purchase Handlers ---
  
  const handlePurchaseSub = async (type: 'monthly' | 'yearly' | 'lifetime') => {
      let sku = SKU.SUB_MONTHLY;
      if (type === 'yearly') sku = SKU.SUB_YEARLY;
      if (type === 'lifetime') sku = SKU.SUB_LIFETIME;

      setIsPurchaseProcessing(true);
      try {
          const success = await purchaseProduct(sku);
          if (success) {
            setSubscription(prev => ({
                ...prev,
                isPremium: true,
                premiumType: type
            }));
            setShowPremiumModal(false);
            confetti({ particleCount: 200, spread: 100, origin: { y: 0.6 } });
          }
      } catch (error) {
          console.error("Purchase failed", error);
          alert("Purchase failed. Please try again.");
      } finally {
          setIsPurchaseProcessing(false);
      }
  };

  const handlePurchaseTrack = async (track: LearningTrack) => {
      setIsPurchaseProcessing(true);
      try {
          const isCustom = track === LearningTrack.CUSTOM && premiumTargetCustomTopic;
          const sku = isCustom ? SKU.TRACK_CUSTOM : SKU.TRACK_SINGLE;

          const success = await purchaseProduct(sku);
          if (success) {
            setSubscription(prev => ({
                ...prev,
                purchasedTracks: !isCustom ? [...prev.purchasedTracks, track] : prev.purchasedTracks,
                purchasedCustomTopics: isCustom ? [...prev.purchasedCustomTopics, premiumTargetCustomTopic!.toLowerCase()] : prev.purchasedCustomTopics
            }));
            setShowPremiumModal(false);
            const topic = isCustom ? premiumTargetCustomTopic : undefined;
            handleTrackSwitchAttempt(track, topic);
            confetti({ particleCount: 100, spread: 80, origin: { y: 0.6 } });
          }
      } catch (error) {
          console.error("Purchase failed", error);
          alert("Purchase failed. Please try again.");
      } finally {
        setIsPurchaseProcessing(false);
      }
  };

  if (!settings.isOnboarded) {
    return (
      <div className="relative min-h-screen bg-gray-50 dark:bg-slate-900 pt-[env(safe-area-inset-top)]">
        <div className="absolute top-4 right-4 z-10 pt-[env(safe-area-inset-top)]">
           <button 
              onClick={toggleTheme}
              className="p-2 rounded-full bg-gray-200 dark:bg-slate-700 text-gray-700 dark:text-gray-300 transition-colors"
            >
              {settings.isDarkMode ? <SunIcon /> : <MoonIcon />}
            </button>
        </div>
        <Onboarding onSelectTrack={handleOnboardingSelection} />
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-[calc(3rem+env(safe-area-inset-bottom))] bg-gray-50 dark:bg-slate-900 transition-colors duration-300">
      
      <AdInterstitial isOpen={showAd} onClose={handleAdClose} />
      
      <SettingsModal 
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        currentTrack={settings.selectedTrack}
        subscription={subscription}
        user={user}
        onChangeTrack={handleTrackSwitchAttempt}
        onResetProgress={resetProgress}
        onOpenPremium={() => { 
            setPremiumTargetTrack(null);
            setPremiumTargetCustomTopic(null);
            setShowPremiumModal(true); 
        }}
        onOpenAuth={() => setShowAuthModal(true)}
        onLogout={handleLogout}
      />

      <PremiumModal 
        isOpen={showPremiumModal}
        onClose={() => setShowPremiumModal(false)}
        targetTrack={premiumTargetTrack}
        targetCustomTopic={premiumTargetCustomTopic}
        subscription={subscription}
        onPurchaseSub={handlePurchaseSub}
        onPurchaseTrack={handlePurchaseTrack}
        isProcessing={isPurchaseProcessing}
      />
      
      <AuthModal 
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onLogin={handleLogin}
      />

      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-gray-100 dark:border-slate-800 transition-colors duration-300 pt-[calc(0.5rem+env(safe-area-inset-top))]">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => setCurrentView('home')}>
            <div className="w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center shadow-lg shadow-brand-500/20 relative">
                <span className="text-white font-bold text-lg">C</span>
                {subscription.isPremium && (
                    <div className="absolute -top-1 -right-1 bg-yellow-400 rounded-full p-0.5">
                        <CrownIcon className="w-2 h-2 text-white" />
                    </div>
                )}
            </div>
            <span className="font-bold text-lg hidden sm:block text-gray-900 dark:text-white">CaLearner</span>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5 px-3 py-1 bg-orange-50 dark:bg-orange-900/20 rounded-full border border-orange-100 dark:border-orange-800 transition-colors">
              <FireIcon className="w-4 h-4 text-orange-500 animate-pulse" />
              <span className="text-sm font-bold text-orange-700 dark:text-orange-400">{progress.currentStreak}</span>
            </div>

            <div className="flex items-center gap-1">
               <button 
                onClick={() => setCurrentView(currentView === 'home' ? 'archive' : 'home')}
                className={`p-2 rounded-full transition-colors ${currentView === 'archive' ? 'bg-brand-100 text-brand-600 dark:bg-brand-900 dark:text-brand-300' : 'hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-500 dark:text-gray-400'}`}
                title="Archive"
              >
                <BookOpenIcon className="w-5 h-5" />
              </button>
              
              <button 
                onClick={toggleTheme}
                className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-500 dark:text-gray-400 transition-colors"
                aria-label="Toggle Theme"
              >
                {settings.isDarkMode ? <SunIcon className="w-5 h-5" /> : <MoonIcon className="w-5 h-5" />}
              </button>
              <button 
                onClick={() => setIsSettingsOpen(true)}
                className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-500 dark:text-gray-400 transition-colors"
                title="Settings"
                aria-label="Open Settings"
              >
                <SettingsIcon className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8 space-y-8 animate-fade-in-up">
        
        {currentView === 'archive' ? (
           <ArchiveView 
             archive={archive} 
             onBack={() => setCurrentView('home')} 
             onShare={handleShare}
           />
        ) : (
          <>
            {/* Daily Card */}
            <section>
              <div className="flex justify-between items-end mb-4">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Today's Lesson</h2>
                  <p className="text-gray-500 dark:text-gray-400 text-sm mt-1 flex items-center gap-2">
                      {settings.selectedTrack === LearningTrack.CUSTOM ? settings.customTopic : settings.selectedTrack}
                      {subscription.isPremium && <CrownIcon className="w-3 h-3 text-yellow-500" />}
                  </p>
                </div>
                <div className="text-sm font-medium text-gray-400">{getTodayString()}</div>
              </div>

              {isLoading ? (
                <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 h-80 flex flex-col items-center justify-center animate-pulse">
                  <div className="w-12 h-12 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin mb-4"></div>
                  <p className="text-gray-400 font-medium">Crafting your custom lesson...</p>
                </div>
              ) : todayLesson ? (
                <LessonCard 
                  lesson={todayLesson} 
                  onComplete={handleCompleteLesson}
                  onShare={() => handleShare(todayLesson)}
                />
              ) : (
                <div className="text-center py-12 bg-white dark:bg-slate-800 rounded-2xl border border-dashed border-gray-200 dark:border-slate-700">
                  <p className="text-gray-400 mb-4">Content could not be loaded.</p>
                  <button onClick={() => settings.selectedTrack && fetchLesson(settings.selectedTrack, settings.customTopic)} className="text-brand-600 font-medium hover:underline">Try Reloading</button>
                </div>
              )}
            </section>

            {/* Stats Grid */}
            <section className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <CalendarView progress={progress} />
                <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 transition-colors duration-300">
                  <h3 className="text-lg font-bold mb-2 text-gray-900 dark:text-white">Learning Consistency</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Last 7 days activity</p>
                  <StatsChart progress={progress} />
                  <div className="mt-4 pt-4 border-t border-gray-100 dark:border-slate-700 flex justify-between items-center text-sm">
                      <span className="text-gray-500 dark:text-gray-400">Longest Streak</span>
                      <span className="font-bold text-gray-900 dark:text-white flex items-center gap-1">
                        <FireIcon className="w-4 h-4 text-orange-500" />
                        {progress.longestStreak} Days
                      </span>
                  </div>
                </div>
            </section>
          </>
        )}

      </main>
    </div>
  );
};

export default App;
