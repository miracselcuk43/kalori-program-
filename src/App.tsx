import React, { useState, useEffect, useMemo } from 'react';
import {
  Search,
  Plus,
  Trash2,
  RotateCcw,
  Check,
  ChevronRight,
  SlidersHorizontal,
  Utensils,
  Calculator,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
} from 'lucide-react';
import {
  TURKISH_FOOD_DATABASE,
  INITIAL_LOGGED_MEALS,
  FoodItem,
  LoggedMealItem,
  MealType,
} from './data/turkishFoods';
import {
  UserMetrics,
  ACTIVITY_OPTIONS,
  GOAL_OPTIONS,
  MACRO_PRESETS,
  calculateNutritionMetrics,
  Gender,
  ActivityLevel,
  GoalType,
  MacroPreset,
  FormulaType,
} from './utils/calorieCalculator';

type ActiveSection = 'dashboard' | 'food-log' | 'database' | 'projection';

const STORAGE_KEY_METRICS = 'kalorimetrik_user_metrics_v1';
const STORAGE_KEY_MEALS = 'kalorimetrik_logged_meals_v1';
const STORAGE_KEY_WATER = 'kalorimetrik_water_glasses_v1';

const DEFAULT_METRICS: UserMetrics = {
  gender: 'male',
  age: 29,
  heightCm: 178,
  weightKg: 79,
  targetWeightKg: 73,
  bodyFatPct: 18,
  activity: 'moderate',
  goal: 'cut_moderate',
  macroPreset: 'high_protein',
  formula: 'mifflin',
};

const MEAL_TYPES: MealType[] = ['Kahvaltı', 'Öğle Yemeği', 'Akşam Yemeği', 'Ara Öğün'];

export default function App() {
  // User profile & metrics state
  const [metrics, setMetrics] = useState<UserMetrics>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_METRICS);
      return saved ? JSON.parse(saved) : DEFAULT_METRICS;
    } catch {
      return DEFAULT_METRICS;
    }
  });

  // Logged meals state
  const [loggedMeals, setLoggedMeals] = useState<LoggedMealItem[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_MEALS);
      return saved ? JSON.parse(saved) : INITIAL_LOGGED_MEALS;
    } catch {
      return INITIAL_LOGGED_MEALS;
    }
  });

  // Water glasses state (each glass = 250ml)
  const [waterGlasses, setWaterGlasses] = useState<number>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_WATER);
      return saved ? Number(saved) : 6;
    } catch {
      return 6;
    }
  });

  // Navigation tab
  const [activeSection, setActiveSection] = useState<ActiveSection>('dashboard');

  // Food search & filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('Tümü');
  const [selectedMealType, setSelectedMealType] = useState<MealType>('Öğle Yemeği');
  const [servingMultipliers, setServingMultipliers] = useState<Record<string, number>>({});

  // Custom food modal / inline state
  const [showCustomForm, setShowCustomForm] = useState(false);
  const [customName, setCustomName] = useState('');
  const [customGrams, setCustomGrams] = useState('100');
  const [customCalories, setCustomCalories] = useState('');
  const [customProtein, setCustomProtein] = useState('');
  const [customCarbs, setCustomCarbs] = useState('');
  const [customFat, setCustomFat] = useState('');

  // Persist to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_METRICS, JSON.stringify(metrics));
    } catch {
      // ignore storage errors
    }
  }, [metrics]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_MEALS, JSON.stringify(loggedMeals));
    } catch {
      // ignore storage errors
    }
  }, [loggedMeals]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_WATER, String(waterGlasses));
    } catch {
      // ignore storage errors
    }
  }, [waterGlasses]);

  // Derived nutrition calculation
  const calculation = useMemo(() => calculateNutritionMetrics(metrics), [metrics]);

  // Derived logged meal totals
  const consumedTotals = useMemo(() => {
    return loggedMeals.reduce(
      (acc, item) => {
        acc.calories += item.calories;
        acc.protein += item.protein;
        acc.carbs += item.carbs;
        acc.fat += item.fat;
        return acc;
      },
      { calories: 0, protein: 0, carbs: 0, fat: 0 }
    );
  }, [loggedMeals]);

  const calorieRemaining = calculation.targetCalories - Math.round(consumedTotals.calories);
  const calorieProgressPct = Math.min(
    100,
    Math.round((consumedTotals.calories / Math.max(1, calculation.targetCalories)) * 100)
  );

  // Categories for food database
  const categories = useMemo(() => {
    const unique = Array.from(new Set(TURKISH_FOOD_DATABASE.map((f) => f.category)));
    return ['Tümü', ...unique];
  }, []);

  // Filtered foods
  const filteredFoods = useMemo(() => {
    return TURKISH_FOOD_DATABASE.filter((food) => {
      const matchesCategory = selectedCategory === 'Tümü' || food.category === selectedCategory;
      const matchesQuery =
        searchQuery.trim() === '' ||
        food.name.toLocaleLowerCase('tr-TR').includes(searchQuery.toLocaleLowerCase('tr-TR')) ||
        food.category.toLocaleLowerCase('tr-TR').includes(searchQuery.toLocaleLowerCase('tr-TR'));
      return matchesCategory && matchesQuery;
    });
  }, [searchQuery, selectedCategory]);

  // Handlers
  const updateMetric = <K extends keyof UserMetrics>(key: K, value: UserMetrics[K]) => {
    setMetrics((prev) => ({ ...prev, [key]: value }));
  };

  const getMultiplier = (foodId: string) => servingMultipliers[foodId] ?? 1;

  const adjustMultiplier = (foodId: string, delta: number) => {
    setServingMultipliers((prev) => {
      const current = prev[foodId] ?? 1;
      const next = Math.max(0.5, Math.min(5, Number((current + delta).toFixed(1))));
      return { ...prev, [foodId]: next };
    });
  };

  const handleAddFoodFromDb = (food: FoodItem) => {
    const mult = getMultiplier(food.id);
    const totalGrams = Math.round(food.gramsPerServing * mult);
    const factor = totalGrams / 100;

    const newItem: LoggedMealItem = {
      id: `meal-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      foodId: food.id,
      name: food.name,
      mealType: selectedMealType,
      grams: totalGrams,
      servingDescription: `${mult} × ${food.servingLabel}`,
      calories: Math.round(food.caloriesPer100g * factor),
      protein: Number((food.proteinPer100g * factor).toFixed(1)),
      carbs: Number((food.carbsPer100g * factor).toFixed(1)),
      fat: Number((food.fatPer100g * factor).toFixed(1)),
      timestamp: new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }),
    };

    setLoggedMeals((prev) => [newItem, ...prev]);
  };

  const handleAddCustomFood = (e: React.FormEvent) => {
    e.preventDefault();
    const kcal = Number(customCalories);
    if (!customName.trim() || isNaN(kcal) || kcal <= 0) return;

    const grams = Math.max(1, Number(customGrams) || 100);
    const prot = Math.max(0, Number(customProtein) || 0);
    const carb = Math.max(0, Number(customCarbs) || 0);
    const fatVal = Math.max(0, Number(customFat) || 0);

    const newItem: LoggedMealItem = {
      id: `custom-${Date.now()}`,
      foodId: 'custom',
      name: customName.trim(),
      mealType: selectedMealType,
      grams,
      servingDescription: 'Özel Porsiyon',
      calories: Math.round(kcal),
      protein: Number(prot.toFixed(1)),
      carbs: Number(carb.toFixed(1)),
      fat: Number(fatVal.toFixed(1)),
      timestamp: new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }),
    };

    setLoggedMeals((prev) => [newItem, ...prev]);
    setCustomName('');
    setCustomCalories('');
    setCustomProtein('');
    setCustomCarbs('');
    setCustomFat('');
    setShowCustomForm(false);
  };

  const handleRemoveMeal = (id: string) => {
    setLoggedMeals((prev) => prev.filter((item) => item.id !== id));
  };

  const handleResetDefaults = () => {
    setMetrics(DEFAULT_METRICS);
    setLoggedMeals(INITIAL_LOGGED_MEALS);
    setWaterGlasses(6);
  };

  // 8-Week weight projection array
  const weeklyProjection = useMemo(() => {
    const rows = [];
    const dailyDiff = calculation.targetCalories - calculation.tdee;
    const weeklyKgDelta = (dailyDiff * 7) / 7700;

    for (let week = 1; week <= 8; week++) {
      const projectedWeight = Number((metrics.weightKg + weeklyKgDelta * week).toFixed(1));
      const totalKcalDelta = dailyDiff * 7 * week;
      rows.push({
        week,
        projectedWeight,
        weeklyKgDelta: Number(weeklyKgDelta.toFixed(2)),
        totalKcalDelta,
      });
    }
    return rows;
  }, [calculation.targetCalories, calculation.tdee, metrics.weightKg]);

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 flex flex-col">
      {/* Top Bar Contract: Zone 1 (Single brand text) — Zone 2 (4 clean nav links) — Zone 3 (Primary action) */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur border-b border-slate-200 px-6 py-3.5">
        <div className="max-w-[1380px] mx-auto flex items-center justify-between gap-4">
          {/* Zone 1: Single text element wordmark */}
          <a
            href="#top"
            onClick={(e) => {
              e.preventDefault();
              setActiveSection('dashboard');
            }}
            className="text-xl font-semibold tracking-tight text-slate-900 font-display whitespace-nowrap shrink-0"
          >
            KaloriMetrik
          </a>

          {/* Zone 2: 4 clean text navigation links */}
          <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-slate-600">
            <button
              type="button"
              onClick={() => setActiveSection('dashboard')}
              className={`py-1 transition-colors whitespace-nowrap shrink-0 border-b-2 ${
                activeSection === 'dashboard'
                  ? 'text-slate-900 border-emerald-600 font-semibold'
                  : 'border-transparent hover:text-slate-900'
              }`}
            >
              Kalori & Makro Hesaplayıcı
            </button>
            <button
              type="button"
              onClick={() => setActiveSection('food-log')}
              className={`py-1 transition-colors whitespace-nowrap shrink-0 border-b-2 ${
                activeSection === 'food-log'
                  ? 'text-slate-900 border-emerald-600 font-semibold'
                  : 'border-transparent hover:text-slate-900'
              }`}
            >
              Günlük Öğün Çizelgesi
            </button>
            <button
              type="button"
              onClick={() => setActiveSection('database')}
              className={`py-1 transition-colors whitespace-nowrap shrink-0 border-b-2 ${
                activeSection === 'database'
                  ? 'text-slate-900 border-emerald-600 font-semibold'
                  : 'border-transparent hover:text-slate-900'
              }`}
            >
              Türk Mutfağı Besin Cetveli
            </button>
            <button
              type="button"
              onClick={() => setActiveSection('projection')}
              className={`py-1 transition-colors whitespace-nowrap shrink-0 border-b-2 ${
                activeSection === 'projection'
                  ? 'text-slate-900 border-emerald-600 font-semibold'
                  : 'border-transparent hover:text-slate-900'
              }`}
            >
              8 Haftalık Projeksiyon
            </button>
          </nav>

          {/* Zone 3: 1-2 primary actions */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleResetDefaults}
              className="px-3.5 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0"
            >
              Varsayılana Sıfırla
            </button>
            <button
              type="button"
              onClick={() => {
                setShowCustomForm(true);
                setActiveSection('food-log');
              }}
              className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 transition-colors whitespace-nowrap shrink-0"
            >
              + Hızlı Öğün Ekle
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Segmented Navigation */}
      <div className="md:hidden bg-white border-b border-slate-200 px-4 py-2 overflow-x-auto">
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg min-w-max">
          <button
            type="button"
            onClick={() => setActiveSection('dashboard')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
              activeSection === 'dashboard' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
            }`}
          >
            Hesaplayıcı
          </button>
          <button
            type="button"
            onClick={() => setActiveSection('food-log')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
              activeSection === 'food-log' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
            }`}
          >
            Öğün Günlüğü ({loggedMeals.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveSection('database')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
              activeSection === 'database' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
            }`}
          >
            Besin Cetveli
          </button>
          <button
            type="button"
            onClick={() => setActiveSection('projection')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
              activeSection === 'projection' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
            }`}
          >
            8 Hafta Planı
          </button>
        </div>
      </div>

      {/* Main Content Container */}
      <main className="flex-1 max-w-[1380px] w-full mx-auto px-6 py-8">
        {/* Top Summary Strip — Always visible context */}
        <div className="mb-8 flex flex-col lg:flex-row lg:items-end justify-between gap-4 pb-6 border-b border-slate-200">
          <div>
            <p className="text-xs text-slate-500 mb-1">
              Klinik Beslenme Analizi · Mifflin-St Jeor & Katch-McArdle Denklemleri · Canlı Hesaplama
            </p>
            <h1 className="text-2xl sm:text-3xl font-semibold text-slate-900 tracking-tight text-balance">
              Kişisel Enerji Dengesi ve Günlük Makro Besin Planlayıcısı
            </h1>
          </div>

          {/* Unboxed quiet metadata summary */}
          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600">
            <span>
              Bazal Metabolizma: <strong className="font-mono-num text-slate-900">{calculation.bmr} kcal</strong>
            </span>
            <span aria-hidden="true">·</span>
            <span>
              Günlük TDEE: <strong className="font-mono-num text-slate-900">{calculation.tdee} kcal</strong>
            </span>
            <span aria-hidden="true">·</span>
            <span>
              VKİ: <strong className="font-mono-num text-slate-900">{calculation.bmi}</strong> ({calculation.bmiCategory})
            </span>
            <span aria-hidden="true">·</span>
            <span>
              Su İhtiyacı: <strong className="font-mono-num text-slate-900">{calculation.waterLiters} L</strong>
            </span>
          </div>
        </div>

        {/* Workspace Grid: Left Parametric Panel + Right Analytical View */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* LEFT COLUMN (4 cols): Biometric & Goal Controls */}
          <aside className="lg:col-span-4 bg-white border border-slate-200 rounded-xl p-6 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-base font-semibold text-slate-900">Vücut Ölçüleri & Hedef</h2>
                <p className="text-xs text-slate-500 mt-0.5">Değerleri değiştirdiğinizde hedefler anında güncellenir</p>
              </div>
              <SlidersHorizontal className="w-4 h-4 text-slate-400 shrink-0" />
            </div>

            {/* Gender Segmented Control */}
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-2">Cinsiyet</label>
              <div className="grid grid-cols-2 gap-1 p-1 bg-slate-100 rounded-lg">
                <button
                  type="button"
                  onClick={() => updateMetric('gender', 'male')}
                  className={`py-2 px-3 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                    metrics.gender === 'male'
                      ? 'bg-white text-slate-900 shadow-xs font-semibold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Erkek
                </button>
                <button
                  type="button"
                  onClick={() => updateMetric('gender', 'female')}
                  className={`py-2 px-3 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                    metrics.gender === 'female'
                      ? 'bg-white text-slate-900 shadow-xs font-semibold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Kadın
                </button>
              </div>
            </div>

            {/* Age, Height, Weight Numeric Controls */}
            <div className="space-y-4">
              {/* Age */}
              <div>
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="font-medium text-slate-700">Yaş</span>
                  <span className="font-mono-num font-semibold text-slate-900">{metrics.age} yaş</span>
                </div>
                <input
                  type="range"
                  min={15}
                  max={85}
                  value={metrics.age}
                  onChange={(e) => updateMetric('age', Number(e.target.value))}
                  className="w-full accent-emerald-600 cursor-pointer"
                />
              </div>

              {/* Height */}
              <div>
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="font-medium text-slate-700">Boy Uzunluğu</span>
                  <span className="font-mono-num font-semibold text-slate-900">{metrics.heightCm} cm</span>
                </div>
                <input
                  type="range"
                  min={140}
                  max={215}
                  value={metrics.heightCm}
                  onChange={(e) => updateMetric('heightCm', Number(e.target.value))}
                  className="w-full accent-emerald-600 cursor-pointer"
                />
              </div>

              {/* Current Weight & Target Weight side by side */}
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Mevcut Kilo (kg)</label>
                  <input
                    type="number"
                    min={35}
                    max={220}
                    step={0.5}
                    value={metrics.weightKg}
                    onChange={(e) => updateMetric('weightKg', Math.max(35, Number(e.target.value) || 35))}
                    className="w-full px-3 py-2 text-sm font-mono-num bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-600 focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Hedef Kilo (kg)</label>
                  <input
                    type="number"
                    min={35}
                    max={220}
                    step={0.5}
                    value={metrics.targetWeightKg}
                    onChange={(e) => updateMetric('targetWeightKg', Math.max(35, Number(e.target.value) || 35))}
                    className="w-full px-3 py-2 text-sm font-mono-num bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-600 focus:bg-white"
                  />
                </div>
              </div>
            </div>

            {/* Activity Level Selector */}
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-2">Haftalık Aktivite Düzeyi</label>
              <div className="space-y-1.5">
                {ACTIVITY_OPTIONS.map((act) => {
                  const active = metrics.activity === act.id;
                  return (
                    <button
                      key={act.id}
                      type="button"
                      onClick={() => updateMetric('activity', act.id)}
                      className={`w-full text-left px-3.5 py-2.5 rounded-lg border transition-colors flex items-center justify-between gap-2 ${
                        active
                          ? 'bg-emerald-50/70 border-emerald-600 text-slate-900'
                          : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <div className="min-w-0">
                        <div className="text-xs font-semibold truncate">{act.label}</div>
                        <div className="text-[11px] text-slate-500 truncate">{act.description}</div>
                      </div>
                      <span className="text-xs font-mono-num text-slate-500 shrink-0">×{act.multiplier}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Goal Selector */}
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-2">Beslenme & Fiziksel Hedef</label>
              <div className="space-y-1.5">
                {GOAL_OPTIONS.map((g) => {
                  const active = metrics.goal === g.id;
                  return (
                    <button
                      key={g.id}
                      type="button"
                      onClick={() => updateMetric('goal', g.id)}
                      className={`w-full text-left px-3.5 py-2 rounded-lg border transition-colors flex items-center justify-between gap-2 ${
                        active
                          ? 'bg-slate-900 border-slate-900 text-white'
                          : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <span className="text-xs font-medium truncate">{g.label}</span>
                      <span
                        className={`text-[11px] font-mono-num shrink-0 ${
                          active ? 'text-emerald-300' : 'text-slate-500'
                        }`}
                      >
                        {g.calorieDelta > 0 ? `+${g.calorieDelta}` : g.calorieDelta} kcal
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Macro Distribution Preset */}
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-2">Makro Besin Dağılım Modeli</label>
              <select
                value={metrics.macroPreset}
                onChange={(e) => updateMetric('macroPreset', e.target.value as MacroPreset)}
                className="w-full px-3 py-2.5 text-xs font-medium bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:border-emerald-600"
              >
                {MACRO_PRESETS.map((preset) => (
                  <option key={preset.id} value={preset.id}>
                    {preset.label} ({preset.description})
                  </option>
                ))}
              </select>
            </div>

            {/* Calculation Formula & Optional Body Fat */}
            <div className="pt-2 border-t border-slate-100 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-700">BMR Hesaplama Denklemi</span>
                <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-md">
                  <button
                    type="button"
                    onClick={() => updateMetric('formula', 'mifflin')}
                    className={`px-2 py-1 text-[11px] font-medium rounded transition-colors ${
                      metrics.formula === 'mifflin' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600'
                    }`}
                  >
                    Mifflin-St Jeor
                  </button>
                  <button
                    type="button"
                    onClick={() => updateMetric('formula', 'katch')}
                    className={`px-2 py-1 text-[11px] font-medium rounded transition-colors ${
                      metrics.formula === 'katch' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600'
                    }`}
                  >
                    Katch-McArdle
                  </button>
                </div>
              </div>

              {metrics.formula === 'katch' && (
                <div>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-slate-600">Tahmini Vücut Yağ Oranı (%)</span>
                    <span className="font-mono-num font-semibold text-slate-900">%{metrics.bodyFatPct ?? 18}</span>
                  </div>
                  <input
                    type="range"
                    min={5}
                    max={45}
                    value={metrics.bodyFatPct ?? 18}
                    onChange={(e) => updateMetric('bodyFatPct', Number(e.target.value))}
                    className="w-full accent-emerald-600 cursor-pointer"
                  />
                </div>
              )}
            </div>
          </aside>

          {/* RIGHT COLUMN (8 cols): Active Analytical Workspace */}
          <div className="lg:col-span-8 space-y-8">
            {/* PRIMARY FOCAL ANCHOR: Daily Calorie Budget & Macro Split */}
            <section className="bg-white border border-slate-200 rounded-xl p-6">
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center pb-6 border-b border-slate-100">
                {/* Main Target Number */}
                <div className="md:col-span-5">
                  <span className="text-xs font-medium text-slate-500">Önerilen Günlük Hedef Kalori</span>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="text-4xl sm:text-5xl font-semibold tracking-tight font-mono-num text-slate-900">
                      {calculation.targetCalories.toLocaleString('tr-TR')}
                    </span>
                    <span className="text-sm font-medium text-slate-500">kcal / gün</span>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-600">
                    <span>Bazal: {calculation.bmr} kcal</span>
                    <span aria-hidden="true">·</span>
                    <span>Koruma: {calculation.tdee} kcal</span>
                  </div>
                </div>

                {/* Live Logged vs Remaining Progress */}
                <div className="md:col-span-7 bg-slate-50 rounded-lg p-4 border border-slate-200/80">
                  <div className="flex items-center justify-between text-xs mb-2">
                    <span className="font-medium text-slate-700">
                      Bugün Alınan: <strong className="font-mono-num text-slate-900">{Math.round(consumedTotals.calories)} kcal</strong>
                    </span>
                    <span className="font-mono-num font-semibold text-emerald-700">
                      {calorieRemaining >= 0
                        ? `${calorieRemaining} kcal kullanılabilir`
                        : `${Math.abs(calorieRemaining)} kcal hedef aşımı`}
                    </span>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full h-2.5 bg-slate-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-150 ${
                        calorieRemaining >= 0 ? 'bg-emerald-600' : 'bg-amber-600'
                      }`}
                      style={{ width: `${calorieProgressPct}%` }}
                    />
                  </div>

                  <div className="mt-2.5 flex items-center justify-between text-[11px] text-slate-500">
                    <span>Günlük Hedefin %{calorieProgressPct}’i tamamlandı</span>
                    <span>
                      İdeal Kilo Aralığı ({metrics.heightCm} cm):{' '}
                      <strong className="font-mono-num text-slate-700">
                        {calculation.idealWeightMin}–{calculation.idealWeightMax} kg
                      </strong>
                    </span>
                  </div>
                </div>
              </div>

              {/* 3 Macro Targets + Water Intake Strip */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-6 pt-6">
                {/* Protein */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-800">Protein</span>
                    <span className="font-mono-num text-slate-500">{calculation.macros.proteinKcal} kcal</span>
                  </div>
                  <div className="flex items-baseline justify-between">
                    <span className="text-2xl font-semibold font-mono-num text-slate-900">
                      {calculation.macros.proteinGrams}g
                    </span>
                    <span className="text-xs font-mono-num text-slate-500">
                      Alınan: {Math.round(consumedTotals.protein)}g
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-600"
                      style={{
                        width: `${Math.min(
                          100,
                          Math.round((consumedTotals.protein / Math.max(1, calculation.macros.proteinGrams)) * 100)
                        )}%`,
                      }}
                    />
                  </div>
                  <p className="text-[11px] text-slate-500">Kas onarımı & tokluk (4 kcal/g)</p>
                </div>

                {/* Carbs */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-800">Karbonhidrat</span>
                    <span className="font-mono-num text-slate-500">{calculation.macros.carbsKcal} kcal</span>
                  </div>
                  <div className="flex items-baseline justify-between">
                    <span className="text-2xl font-semibold font-mono-num text-slate-900">
                      {calculation.macros.carbsGrams}g
                    </span>
                    <span className="text-xs font-mono-num text-slate-500">
                      Alınan: {Math.round(consumedTotals.carbs)}g
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-amber-500"
                      style={{
                        width: `${Math.min(
                          100,
                          Math.round((consumedTotals.carbs / Math.max(1, calculation.macros.carbsGrams)) * 100)
                        )}%`,
                      }}
                    />
                  </div>
                  <p className="text-[11px] text-slate-500">Antrenman & beyin enerjisi (4 kcal/g)</p>
                </div>

                {/* Fat */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-800">Sağlıklı Yağ</span>
                    <span className="font-mono-num text-slate-500">{calculation.macros.fatKcal} kcal</span>
                  </div>
                  <div className="flex items-baseline justify-between">
                    <span className="text-2xl font-semibold font-mono-num text-slate-900">
                      {calculation.macros.fatGrams}g
                    </span>
                    <span className="text-xs font-mono-num text-slate-500">
                      Alınan: {Math.round(consumedTotals.fat)}g
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-sky-600"
                      style={{
                        width: `${Math.min(
                          100,
                          Math.round((consumedTotals.fat / Math.max(1, calculation.macros.fatGrams)) * 100)
                        )}%`,
                      }}
                    />
                  </div>
                  <p className="text-[11px] text-slate-500">Hormon & hücre dengesi (9 kcal/g)</p>
                </div>

                {/* Daily Water Interactive Counter */}
                <div className="space-y-2 pl-0 sm:pl-4 sm:border-l border-slate-100">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-800">Günlük Su Takibi</span>
                    <span className="font-mono-num text-slate-500">Hedef: {calculation.waterLiters} L</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-2xl font-semibold font-mono-num text-slate-900">
                      {(waterGlasses * 0.25).toFixed(2)} L
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setWaterGlasses((w) => Math.max(0, w - 1))}
                        aria-label="Su azalt"
                        className="w-7 h-7 flex items-center justify-center rounded border border-slate-200 hover:bg-slate-100 text-slate-700"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setWaterGlasses((w) => Math.min(24, w + 1))}
                        aria-label="Su ekle"
                        className="w-7 h-7 flex items-center justify-center rounded bg-emerald-600 hover:bg-emerald-700 text-white"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    {waterGlasses} bardak (250 ml) · Lif hedefi: {calculation.fiberGrams}g
                  </p>
                </div>
              </div>
            </section>

            {/* CONDITIONAL / INTEGRATED SECTIONS BASED ON NAVIGATION */}
            {(activeSection === 'dashboard' || activeSection === 'database') && (
              <section className="bg-white border border-slate-200 rounded-xl p-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-100">
                  <div>
                    <h2 className="text-base font-semibold text-slate-900">
                      Türk Mutfağı Besin Veritabanı & Hızlı Kalori Ekleme
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Porsiyon çarpanını ayarlayıp seçili öğüne tek tıkla ekleyebilirsiniz
                    </p>
                  </div>

                  {/* Meal Slot Selector for Adding */}
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-500 whitespace-nowrap">Eklenecek Öğün:</span>
                    <select
                      value={selectedMealType}
                      onChange={(e) => setSelectedMealType(e.target.value as MealType)}
                      className="px-3 py-1.5 text-xs font-semibold bg-emerald-50 border border-emerald-600/40 text-emerald-950 rounded-lg focus:outline-none"
                    >
                      {MEAL_TYPES.map((m) => (
                        <option key={m} value={m}>
                          {m}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Search & Category Filter Controls */}
                <div className="my-4 flex flex-col sm:flex-row gap-3">
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Besin ara (örn. Haşlanmış yumurta, mercimek çorbası, ızgara köfte, simit...)"
                      className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:bg-white focus:border-emerald-600"
                    />
                  </div>
                </div>

                {/* Interactive Category Tabs */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-3 mb-2">
                  {categories.map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setSelectedCategory(cat)}
                      className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 ${
                        selectedCategory === cat
                          ? 'bg-slate-900 text-white'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200/70 hover:text-slate-900'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>

                {/* High-Density Food Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 text-[11px] font-semibold text-slate-500">
                        <th className="py-2.5 pr-4">Besin & Kategori</th>
                        <th className="py-2.5 px-3">Porsiyon Ölçüsü</th>
                        <th className="py-2.5 px-3 text-right">Kalori</th>
                        <th className="py-2.5 px-3 text-right hidden sm:table-cell">Protein</th>
                        <th className="py-2.5 px-3 text-right hidden sm:table-cell">Karb</th>
                        <th className="py-2.5 px-3 text-right hidden sm:table-cell">Yağ</th>
                        <th className="py-2.5 pl-3 text-right">İşlem</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs">
                      {filteredFoods.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="py-8 text-center text-slate-500">
                            Aramanızla eşleşen besin bulunamadı. Özel besin olarak ekleyebilirsiniz.
                          </td>
                        </tr>
                      ) : (
                        filteredFoods.slice(0, activeSection === 'database' ? 40 : 8).map((food) => {
                          const mult = getMultiplier(food.id);
                          const grams = Math.round(food.gramsPerServing * mult);
                          const factor = grams / 100;
                          const kcal = Math.round(food.caloriesPer100g * factor);
                          const prot = (food.proteinPer100g * factor).toFixed(1);
                          const carb = (food.carbsPer100g * factor).toFixed(1);
                          const fat = (food.fatPer100g * factor).toFixed(1);

                          return (
                            <tr key={food.id} className="hover:bg-slate-50/90 transition-colors">
                              <td className="py-2.5 pr-4">
                                <div className="font-medium text-slate-900">{food.name}</div>
                                <div className="text-[11px] text-slate-500">
                                  {food.category} · 100g: {food.caloriesPer100g} kcal
                                </div>
                              </td>
                              <td className="py-2.5 px-3">
                                <div className="flex items-center gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => adjustMultiplier(food.id, -0.5)}
                                    className="w-6 h-6 rounded border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-100"
                                  >
                                    -
                                  </button>
                                  <span className="font-mono-num text-xs font-medium text-slate-800 min-w-[85px] text-center">
                                    {mult}× ({grams}g)
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => adjustMultiplier(food.id, 0.5)}
                                    className="w-6 h-6 rounded border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-100"
                                  >
                                    +
                                  </button>
                                </div>
                                <div className="text-[10px] text-slate-400 mt-0.5">{food.servingLabel}</div>
                              </td>
                              <td className="py-2.5 px-3 text-right font-mono-num font-semibold text-slate-900">
                                {kcal} kcal
                              </td>
                              <td className="py-2.5 px-3 text-right font-mono-num text-slate-600 hidden sm:table-cell">
                                {prot}g
                              </td>
                              <td className="py-2.5 px-3 text-right font-mono-num text-slate-600 hidden sm:table-cell">
                                {carb}g
                              </td>
                              <td className="py-2.5 px-3 text-right font-mono-num text-slate-600 hidden sm:table-cell">
                                {fat}g
                              </td>
                              <td className="py-2.5 pl-3 text-right">
                                <button
                                  type="button"
                                  onClick={() => handleAddFoodFromDb(food)}
                                  className="px-3 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors whitespace-nowrap"
                                >
                                  + Ekle
                                </button>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                {activeSection === 'dashboard' && filteredFoods.length > 8 && (
                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                    <span className="text-slate-500">
                      Toplam {filteredFoods.length} besinden ilk 8 tanesi gösteriliyor
                    </span>
                    <button
                      type="button"
                      onClick={() => setActiveSection('database')}
                      className="font-semibold text-emerald-700 hover:text-emerald-800 flex items-center gap-1"
                    >
                      Tüm Besin Cetvelini Gör ({TURKISH_FOOD_DATABASE.length} Besin)
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </section>
            )}

            {/* DAILY MEAL LOG SECTION */}
            {(activeSection === 'dashboard' || activeSection === 'food-log') && (
              <section className="bg-white border border-slate-200 rounded-xl p-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-100">
                  <div>
                    <h2 className="text-base font-semibold text-slate-900">Günlük Öğün Çizelgesi</h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Bugün kaydettiğiniz tüm yiyeceklerin öğün bazlı kalori ve makro dökümü
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setShowCustomForm((prev) => !prev)}
                      className="px-3 py-1.5 text-xs font-medium text-slate-700 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors whitespace-nowrap"
                    >
                      {showCustomForm ? 'Formu Kapat' : '+ Özel Kalori / Yemek Gir'}
                    </button>
                    {loggedMeals.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setLoggedMeals([])}
                        className="px-3 py-1.5 text-xs font-medium text-rose-600 border border-rose-200 rounded-lg hover:bg-rose-50 transition-colors whitespace-nowrap"
                      >
                        Günlüğü Temizle
                      </button>
                    )}
                  </div>
                </div>

                {/* Custom Food Entry Form */}
                {showCustomForm && (
                  <form
                    onSubmit={handleAddCustomFood}
                    className="my-4 p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-3"
                  >
                    <div className="text-xs font-semibold text-slate-800">
                      Listede Olmayan Özel Yiyecek / Tarif Ekle
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-6 gap-3">
                      <div className="sm:col-span-2">
                        <label className="block text-[11px] text-slate-600 mb-1">Yiyecek Adı *</label>
                        <input
                          type="text"
                          required
                          value={customName}
                          onChange={(e) => setCustomName(e.target.value)}
                          placeholder="Örn: Ev Yapımı Mercole"
                          className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-md"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] text-slate-600 mb-1">Öğün</label>
                        <select
                          value={selectedMealType}
                          onChange={(e) => setSelectedMealType(e.target.value as MealType)}
                          className="w-full px-2 py-1.5 text-xs bg-white border border-slate-200 rounded-md"
                        >
                          {MEAL_TYPES.map((m) => (
                            <option key={m} value={m}>
                              {m}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-[11px] text-slate-600 mb-1">Kalori (kcal) *</label>
                        <input
                          type="number"
                          required
                          min={1}
                          value={customCalories}
                          onChange={(e) => setCustomCalories(e.target.value)}
                          placeholder="250"
                          className="w-full px-2.5 py-1.5 text-xs font-mono-num bg-white border border-slate-200 rounded-md"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] text-slate-600 mb-1">Protein (g)</label>
                        <input
                          type="number"
                          min={0}
                          step={0.1}
                          value={customProtein}
                          onChange={(e) => setCustomProtein(e.target.value)}
                          placeholder="15"
                          className="w-full px-2.5 py-1.5 text-xs font-mono-num bg-white border border-slate-200 rounded-md"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] text-slate-600 mb-1">Karb / Yağ (g)</label>
                        <div className="grid grid-cols-2 gap-1">
                          <input
                            type="number"
                            min={0}
                            placeholder="K"
                            value={customCarbs}
                            onChange={(e) => setCustomCarbs(e.target.value)}
                            className="w-full px-2 py-1.5 text-xs font-mono-num bg-white border border-slate-200 rounded-md"
                          />
                          <input
                            type="number"
                            min={0}
                            placeholder="Y"
                            value={customFat}
                            onChange={(e) => setCustomFat(e.target.value)}
                            className="w-full px-2 py-1.5 text-xs font-mono-num bg-white border border-slate-200 rounded-md"
                          />
                        </div>
                      </div>
                    </div>
                    <div className="flex justify-end gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setShowCustomForm(false)}
                        className="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-900"
                      >
                        İptal
                      </button>
                      <button
                        type="submit"
                        className="px-4 py-1.5 text-xs font-semibold text-white bg-emerald-600 rounded-md hover:bg-emerald-700"
                      >
                        Öğüne Kaydet
                      </button>
                    </div>
                  </form>
                )}

                {/* Meal Breakdown Table */}
                {loggedMeals.length === 0 ? (
                  <div className="py-12 text-center space-y-3">
                    <p className="text-sm text-slate-600">Henüz bugün için kaydedilmiş bir öğün bulunmuyor.</p>
                    <button
                      type="button"
                      onClick={() => setLoggedMeals(INITIAL_LOGGED_MEALS)}
                      className="px-4 py-2 text-xs font-semibold text-emerald-700 bg-emerald-50 rounded-lg hover:bg-emerald-100 transition-colors"
                    >
                      Örnek Günlük Menüyü Yükle
                    </button>
                  </div>
                ) : (
                  <div className="overflow-x-auto mt-2">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-slate-200 text-[11px] font-semibold text-slate-500">
                          <th className="py-2.5 pr-4">Öğün & Besin</th>
                          <th className="py-2.5 px-3">Miktar</th>
                          <th className="py-2.5 px-3 text-right">Kalori</th>
                          <th className="py-2.5 px-3 text-right hidden sm:table-cell">Protein</th>
                          <th className="py-2.5 px-3 text-right hidden sm:table-cell">Karb</th>
                          <th className="py-2.5 px-3 text-right hidden sm:table-cell">Yağ</th>
                          <th className="py-2.5 pl-3 text-right">Sil</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-xs">
                        {loggedMeals.map((item) => (
                          <tr key={item.id} className="hover:bg-slate-50/80">
                            <td className="py-2.5 pr-4">
                              <div className="font-medium text-slate-900">{item.name}</div>
                              <div className="text-[11px] text-slate-500">
                                {item.mealType} · Saat {item.timestamp}
                              </div>
                            </td>
                            <td className="py-2.5 px-3 text-slate-600">
                              <span className="font-mono-num">{item.grams}g</span>
                              <span className="text-slate-400"> · {item.servingDescription}</span>
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono-num font-semibold text-slate-900">
                              {item.calories} kcal
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono-num text-slate-600 hidden sm:table-cell">
                              {item.protein}g
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono-num text-slate-600 hidden sm:table-cell">
                              {item.carbs}g
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono-num text-slate-600 hidden sm:table-cell">
                              {item.fat}g
                            </td>
                            <td className="py-2.5 pl-3 text-right">
                              <button
                                type="button"
                                onClick={() => handleRemoveMeal(item.id)}
                                aria-label={`${item.name} kaydını sil`}
                                className="p-1.5 text-slate-400 hover:text-rose-600 rounded transition-colors"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="border-t-2 border-slate-200 font-semibold text-xs bg-slate-50/70">
                          <td className="py-3 pr-4 pl-2 text-slate-900">Günlük Toplam Alınan</td>
                          <td className="py-3 px-3 text-slate-600 font-mono-num">{loggedMeals.length} kayıt</td>
                          <td className="py-3 px-3 text-right font-mono-num text-emerald-700">
                            {Math.round(consumedTotals.calories)} kcal
                          </td>
                          <td className="py-3 px-3 text-right font-mono-num text-slate-900 hidden sm:table-cell">
                            {consumedTotals.protein.toFixed(1)}g
                          </td>
                          <td className="py-3 px-3 text-right font-mono-num text-slate-900 hidden sm:table-cell">
                            {consumedTotals.carbs.toFixed(1)}g
                          </td>
                          <td className="py-3 px-3 text-right font-mono-num text-slate-900 hidden sm:table-cell">
                            {consumedTotals.fat.toFixed(1)}g
                          </td>
                          <td className="py-3 pl-3" />
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}
              </section>
            )}

            {/* 8-WEEK PROJECTION & METABOLIC REFERENCE */}
            {(activeSection === 'dashboard' || activeSection === 'projection') && (
              <section className="bg-white border border-slate-200 rounded-xl p-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-5 border-b border-slate-100">
                  <div>
                    <h2 className="text-base font-semibold text-slate-900">
                      8 Haftalık Kilo Değişim Projeksiyonu & Enerji Dengesi
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Günlük {calculation.targetCalories} kcal hedefiniz ve {calculation.tdee} kcal harcamanıza göre
                      beklenen haftalık seyir (1 kg yağ dokusu ≈ 7.700 kcal)
                    </p>
                  </div>
                  {calculation.estimatedWeeksToGoal && (
                    <div className="text-xs text-emerald-800 font-medium">
                      Hedef kiloya ({metrics.targetWeightKg} kg) tahmini süre:{' '}
                      <strong className="font-mono-num">{calculation.estimatedWeeksToGoal} hafta</strong>
                    </div>
                  )}
                </div>

                <div className="overflow-x-auto mt-3">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 text-[11px] font-semibold text-slate-500">
                        <th className="py-2.5 pr-4">Dönem</th>
                        <th className="py-2.5 px-3 text-right">Tahmini Ağırlık</th>
                        <th className="py-2.5 px-3 text-right">Haftalık Değişim</th>
                        <th className="py-2.5 pl-3 text-right">Kümülatif Enerji Farkı</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs">
                      {weeklyProjection.map((row) => (
                        <tr key={row.week} className="hover:bg-slate-50/80">
                          <td className="py-2.5 pr-4 font-medium text-slate-900">{row.week}. Hafta Sonu</td>
                          <td className="py-2.5 px-3 text-right font-mono-num font-semibold text-slate-900">
                            {row.projectedWeight} kg
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono-num">
                            <span
                              className={
                                row.weeklyKgDelta < 0
                                  ? 'text-emerald-700'
                                  : row.weeklyKgDelta > 0
                                  ? 'text-amber-700'
                                  : 'text-slate-600'
                              }
                            >
                              {row.weeklyKgDelta > 0 ? `+${row.weeklyKgDelta}` : row.weeklyKgDelta} kg / hafta
                            </span>
                          </td>
                          <td className="py-2.5 pl-3 text-right font-mono-num text-slate-600">
                            {row.totalKcalDelta > 0
                              ? `+${row.totalKcalDelta.toLocaleString('tr-TR')}`
                              : row.totalKcalDelta.toLocaleString('tr-TR')}{' '}
                            kcal
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            )}
          </div>
        </div>
      </main>

      {/* Quiet Editorial Footer */}
      <footer className="mt-12 border-t border-slate-200 bg-white py-6 px-6">
        <div className="max-w-[1380px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <span>KaloriMetrik — Bilimsel Kalori, BMR, TDEE ve Makro Besin Hesaplama Platformu</span>
          <span>
            Hesaplamalar Mifflin-St Jeor ve Katch-McArdle klinik standartlarına dayanır · Veriler tarayıcınızda saklanır
          </span>
        </div>
      </footer>
    </div>
  );
}
