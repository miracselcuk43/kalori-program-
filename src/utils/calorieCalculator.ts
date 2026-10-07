export type Gender = 'male' | 'female';

export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'active' | 'athlete';

export type GoalType = 'cut_fast' | 'cut_moderate' | 'maintain' | 'lean_bulk' | 'bulk';

export type MacroPreset = 'balanced' | 'high_protein' | 'low_carb' | 'ketogenic';

export type FormulaType = 'mifflin' | 'katch';

export interface UserMetrics {
  gender: Gender;
  age: number;
  heightCm: number;
  weightKg: number;
  targetWeightKg: number;
  bodyFatPct?: number;
  activity: ActivityLevel;
  goal: GoalType;
  macroPreset: MacroPreset;
  formula: FormulaType;
}

export interface ActivityOption {
  id: ActivityLevel;
  label: string;
  description: string;
  multiplier: number;
}

export const ACTIVITY_OPTIONS: ActivityOption[] = [
  {
    id: 'sedentary',
    label: 'Hareketsiz (Masa Başı)',
    description: 'Günlük egzersiz yok, ofis veya ev içi yaşam',
    multiplier: 1.2,
  },
  {
    id: 'light',
    label: 'Az Hareketli',
    description: 'Haftada 1–3 gün hafif yürüyüş veya egzersiz',
    multiplier: 1.375,
  },
  {
    id: 'moderate',
    label: 'Orta Aktif',
    description: 'Haftada 3–5 gün orta şiddette antrenman',
    multiplier: 1.55,
  },
  {
    id: 'active',
    label: 'Çok Aktif',
    description: 'Haftada 6–7 gün yoğun spor veya fiziksel iş',
    multiplier: 1.725,
  },
  {
    id: 'athlete',
    label: 'Profesyonel / Çift Antrenman',
    description: 'Günde 2 antrenman veya çok ağır fiziksel mesai',
    multiplier: 1.9,
  },
];

export interface GoalOption {
  id: GoalType;
  label: string;
  subtitle: string;
  calorieDelta: number;
  weeklyKgChange: number;
}

export const GOAL_OPTIONS: GoalOption[] = [
  {
    id: 'cut_fast',
    label: 'Hızlı Yağ Yakımı',
    subtitle: 'Günlük -650 kcal açık',
    calorieDelta: -650,
    weeklyKgChange: -0.6,
  },
  {
    id: 'cut_moderate',
    label: 'Dengeli Kilo Verme',
    subtitle: 'Günlük -400 kcal açık',
    calorieDelta: -400,
    weeklyKgChange: -0.38,
  },
  {
    id: 'maintain',
    label: 'Kilo Koruma (Formda Kal)',
    subtitle: 'Günlük denge kalorisi (0 kcal)',
    calorieDelta: 0,
    weeklyKgChange: 0,
  },
  {
    id: 'lean_bulk',
    label: 'Temiz Kas Kazanımı',
    subtitle: 'Günlük +250 kcal fazlalık',
    calorieDelta: 250,
    weeklyKgChange: 0.23,
  },
  {
    id: 'bulk',
    label: 'Hacim & Kilo Alma',
    subtitle: 'Günlük +500 kcal fazlalık',
    calorieDelta: 500,
    weeklyKgChange: 0.45,
  },
];

export interface MacroPresetOption {
  id: MacroPreset;
  label: string;
  ratios: { protein: number; carbs: number; fat: number }; // percentages summing to 100
  description: string;
}

export const MACRO_PRESETS: MacroPresetOption[] = [
  {
    id: 'balanced',
    label: 'Dengeli Akdeniz',
    ratios: { protein: 30, carbs: 40, fat: 30 },
    description: '%30 Protein · %40 Karbonhidrat · %30 Yağ',
  },
  {
    id: 'high_protein',
    label: 'Yüksek Protein (Sporcu)',
    ratios: { protein: 35, carbs: 40, fat: 25 },
    description: '%35 Protein · %40 Karbonhidrat · %25 Yağ',
  },
  {
    id: 'low_carb',
    label: 'Düşük Karbonhidrat',
    ratios: { protein: 35, carbs: 25, fat: 40 },
    description: '%35 Protein · %25 Karbonhidrat · %40 Yağ',
  },
  {
    id: 'ketogenic',
    label: 'Ketojenik Oran',
    ratios: { protein: 25, carbs: 5, fat: 70 },
    description: '%25 Protein · %5 Karbonhidrat · %70 Yağ',
  },
];

export interface CalculationResult {
  bmr: number;
  tdee: number;
  targetCalories: number;
  bmi: number;
  bmiCategory: string;
  idealWeightMin: number;
  idealWeightMax: number;
  waterLiters: number;
  fiberGrams: number;
  macros: {
    proteinGrams: number;
    proteinKcal: number;
    carbsGrams: number;
    carbsKcal: number;
    fatGrams: number;
    fatKcal: number;
  };
  estimatedWeeksToGoal: number | null;
}

export function calculateNutritionMetrics(metrics: UserMetrics): CalculationResult {
  const { gender, age, heightCm, weightKg, targetWeightKg, bodyFatPct, activity, goal, macroPreset, formula } = metrics;

  // 1. BMR Calculation
  let bmr = 0;
  if (formula === 'katch' && bodyFatPct && bodyFatPct > 3 && bodyFatPct < 60) {
    const leanBodyMass = weightKg * (1 - bodyFatPct / 100);
    bmr = 370 + 21.6 * leanBodyMass;
  } else {
    // Mifflin-St Jeor Equation
    if (gender === 'male') {
      bmr = 10 * weightKg + 6.25 * heightCm - 5 * age + 5;
    } else {
      bmr = 10 * weightKg + 6.25 * heightCm - 5 * age - 161;
    }
  }

  bmr = Math.round(bmr);

  // 2. TDEE Calculation
  const activityObj = ACTIVITY_OPTIONS.find((a) => a.id === activity) || ACTIVITY_OPTIONS[2];
  const tdee = Math.round(bmr * activityObj.multiplier);

  // 3. Target Calories
  const goalObj = GOAL_OPTIONS.find((g) => g.id === goal) || GOAL_OPTIONS[2];
  const minSafeCalories = gender === 'male' ? 1400 : 1200;
  const targetCalories = Math.max(minSafeCalories, Math.round(tdee + goalObj.calorieDelta));

  // 4. BMI & Ideal Weight
  const heightM = heightCm / 100;
  const bmi = Number((weightKg / (heightM * heightM)).toFixed(1));
  let bmiCategory = 'Normal Kilolu';
  if (bmi < 18.5) bmiCategory = 'Zayıf';
  else if (bmi < 25) bmiCategory = 'İdeal Aralık';
  else if (bmi < 30) bmiCategory = 'Fazla Kilolu';
  else bmiCategory = 'Obezite Sınırı';

  const idealWeightMin = Math.round(18.5 * heightM * heightM);
  const idealWeightMax = Math.round(24.9 * heightM * heightM);

  // 5. Water & Fiber
  const activityWaterBonus = activity === 'active' || activity === 'athlete' ? 0.5 : activity === 'moderate' ? 0.25 : 0;
  const waterLiters = Number((weightKg * 0.035 + activityWaterBonus).toFixed(1));
  const fiberGrams = Math.round((targetCalories / 1000) * 14);

  // 6. Macros
  const presetObj = MACRO_PRESETS.find((p) => p.id === macroPreset) || MACRO_PRESETS[0];
  const proteinKcal = Math.round(targetCalories * (presetObj.ratios.protein / 100));
  const carbsKcal = Math.round(targetCalories * (presetObj.ratios.carbs / 100));
  const fatKcal = Math.round(targetCalories * (presetObj.ratios.fat / 100));

  const proteinGrams = Math.round(proteinKcal / 4);
  const carbsGrams = Math.round(carbsKcal / 4);
  const fatGrams = Math.round(fatKcal / 9);

  // 7. Estimated weeks to target weight
  const weightDiff = Math.abs(targetWeightKg - weightKg);
  let estimatedWeeksToGoal: number | null = null;
  if (weightDiff > 0.2 && goalObj.weeklyKgChange !== 0) {
    // 1 kg of body weight ~ 7700 kcal
    const dailyAbsDelta = Math.abs(targetCalories - tdee);
    if (dailyAbsDelta >= 100) {
      const weeklyKg = (dailyAbsDelta * 7) / 7700;
      estimatedWeeksToGoal = Math.max(1, Math.round(weightDiff / weeklyKg));
    }
  }

  return {
    bmr,
    tdee,
    targetCalories,
    bmi,
    bmiCategory,
    idealWeightMin,
    idealWeightMax,
    waterLiters,
    fiberGrams,
    macros: {
      proteinGrams,
      proteinKcal,
      carbsGrams,
      carbsKcal,
      fatGrams,
      fatKcal,
    },
    estimatedWeeksToGoal,
  };
}
