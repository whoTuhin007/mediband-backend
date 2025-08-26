import mongoose from 'mongoose';
const userMedRecordSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

    age: { type: Number, required: true },
    height: { type: Number, required: true },
    weight: { type: Number, required: true },
    gender: { type: String, required: true },
    bloodGroup: { type: String, required: true },
    emergencyContact: { type: String, required: true },

    allergies: { type: String },
    medication: { type: String },
    medicationlist: { type: String },
    prescriptions: [  String ],
    surgeries: { type: String },

    familyHistory: {
      diabetes: { type: Boolean, default: false },
      hypertension: { type: Boolean, default: false },
      heartDisease: { type: Boolean, default: false },
      cancer: { type: Boolean, default: false },
      asthma: { type: Boolean, default: false },
      epilepsy: { type: Boolean, default: false },
      other: { type: Boolean, default: false },
    },

    currentlyExperiencing: {
      chestPain: { type: Boolean, default: false },
      shortnessOfBreath: { type: Boolean, default: false },
      dizziness: { type: Boolean, default: false },
      severeHeadache: { type: Boolean, default: false },
      suddenWeakness: { type: Boolean, default: false },
      visionProblems: { type: Boolean, default: false },
      difficultySpeaking: { type: Boolean, default: false },
      numbness: { type: Boolean, default: false },
      weightLoss: { type: Boolean, default: false },
      weightGain: { type: Boolean, default: false },
      nightSweats: { type: Boolean, default: false },
      unexplainedFever: { type: Boolean, default: false },
      persistentCough: { type: Boolean, default: false },
      coughingBlood: { type: Boolean, default: false },
      frequentUrination: { type: Boolean, default: false },
      excessiveThirst: { type: Boolean, default: false },
      hunger: { type: Boolean, default: false },
      abdominalPain: { type: Boolean, default: false },
      nauseaVomiting: { type: Boolean, default: false },
      diarrhea: { type: Boolean, default: false },
      jointPain: { type: Boolean, default: false },
      skinRash: { type: Boolean, default: false },
      swelling: { type: Boolean, default: false },
      fatigue: { type: Boolean, default: false },
      anxiety: { type: Boolean, default: false },
      depression: { type: Boolean, default: false },
      sleepProblems: { type: Boolean, default: false },
      memoryIssues: { type: Boolean, default: false },
      concentrationIssues: { type: Boolean, default: false },
      moodSwings: { type: Boolean, default: false },
      gastrointestinalIssues: { type: Boolean, default: false },
      urinaryIssues: { type: Boolean, default: false },
      menstrualIssues: { type: Boolean, default: false },
      other: { type: Boolean, default: false },
    },

    immunizations: {
      tetanus: { type: Boolean, default: false },
      influenza: { type: Boolean, default: false },
      covid19: { type: Boolean, default: false },
      hepatitisB: { type: Boolean, default: false },
      mmr: { type: Boolean, default: false },
      varicella: { type: Boolean, default: false },
      pneumococcal: { type: Boolean, default: false },
      meningococcal: { type: Boolean, default: false },
      hpv: { type: Boolean, default: false },
    },

    lifestyle: {
      smoking: { type: Boolean, default: false },
      alcohol: { type: Boolean, default: false },
      exercise: { type: Boolean, default: false },
      diet: { type: Boolean, default: false },
    },
  },
  { timestamps: true }
);

const UserMedRecord = mongoose.models.UserMedRecord || mongoose.model('UserMedRecord', userMedRecordSchema);

export default UserMedRecord;