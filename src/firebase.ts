import { initializeApp } from "firebase/app";
import { getDatabase, ref, runTransaction, get, set } from "firebase/database";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getStorage, ref as storageRef, uploadString, getDownloadURL } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyDEOQ0xiSg2MfqmL5qVlm-MP6fRC32OpVQ",
  authDomain: "shiden-games.firebaseapp.com",
  databaseURL: "https://shiden-games-default-rtdb.firebaseio.com",
  projectId: "shiden-games",
  storageBucket: "shiden-games.firebasestorage.app",
  messagingSenderId: "764248462785",
  appId: "1:764248462785:web:aa3e68326893a71d288b40",
  measurementId: "G-V0VXR4MERY"
};

const app = initializeApp(firebaseConfig);
export const database = getDatabase(app);
export const auth = getAuth(app);
export const storage = getStorage(app);
export const storageBaseUrl = `https://firebasestorage.googleapis.com/v0/b/${firebaseConfig.storageBucket}/o/`;
const storageCache: { [key: string]: string } = {};
export const getStorageUrl = (path: string) => {
  if (!path) return '';
  if (path.startsWith('http')) return path;
  if (storageCache[path]) return storageCache[path];
  const encodedPath = encodeURIComponent(path.startsWith('/') ? path.substring(1) : path);
  const url = `${storageBaseUrl}${encodedPath}?alt=media`;
  storageCache[path] = url;
  return url;
};

export const googleProvider = new GoogleAuthProvider();

const formatDateKey = (date: Date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

type Chapter2ProgressPatch = {
  stageCycle?: number;
  flowIndex?: number;
  loopCount?: number;
  ownedSkills?: string[];
  claimedRewardSteps?: string[];
  canGoToBoss?: boolean;
  lastUpdated?: number;
};

type ProfileProgressPatch = {
  stageCycle?: number;
  lastGameMode?: string;
  canGoToBoss?: boolean;
  ownedSkills?: string[];
  updatedAt?: number;
};

type Chapter2RewardClaim = {
  rewardStepKey: string;
  rewards: string[];
  stageCycle: number;
  flowIndex: number;
  lastUpdated?: number;
};

const uniqueStrings = (values: unknown[]): string[] => {
  return Array.from(new Set(values.filter((v): v is string => typeof v === 'string')));
};

const toNumber = (value: unknown, fallback: number): number => {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
};

const isProgressAhead = (
  nextStage: number,
  nextFlow: number,
  currentStage: number,
  currentFlow: number
): boolean => {
  return nextStage > currentStage || (nextStage === currentStage && nextFlow > currentFlow);
};

const inferChapter2LoopCount = (data: any): number => {
  const storedLoopCount = toNumber(data?.loopCount, -1);
  if (storedLoopCount >= 0) return storedLoopCount;

  const hasClearedFinalBoss =
    toNumber(data?.stageCycle, 13) === 24 &&
    toNumber(data?.flowIndex, 0) === 5 &&
    Boolean(data?.canGoToBoss);

  return hasClearedFinalBoss ? 1 : 0;
};

export const saveChapter2Progress = async (uid: string, patch: Chapter2ProgressPatch) => {
  const chapter2Ref = ref(database, `profiles/${uid}/chapter2`);
  const now = Date.now();

  await runTransaction(chapter2Ref, (currentData) => {
    const current = currentData && typeof currentData === 'object' ? currentData as any : {};
    const merged = { ...current };
    const currentLoopCount = inferChapter2LoopCount(current);

    if (patch.ownedSkills) {
      merged.ownedSkills = uniqueStrings([...(Array.isArray(current.ownedSkills) ? current.ownedSkills : []), ...patch.ownedSkills]);
    }

    if (patch.claimedRewardSteps) {
      merged.claimedRewardSteps = uniqueStrings([...(Array.isArray(current.claimedRewardSteps) ? current.claimedRewardSteps : []), ...patch.claimedRewardSteps]);
    }

    const currentStage = toNumber(current.stageCycle, toNumber(patch.stageCycle, 13));
    const currentFlow = toNumber(current.flowIndex, 0);
    const hasPatchProgress = patch.stageCycle !== undefined || patch.flowIndex !== undefined;
    const patchStage = toNumber(patch.stageCycle, currentStage);
    const patchFlow = toNumber(patch.flowIndex, patch.stageCycle !== undefined && patch.stageCycle !== currentStage ? 0 : currentFlow);
    const patchIsAhead = isProgressAhead(patchStage, patchFlow, currentStage, currentFlow);

    if (hasPatchProgress && (current.stageCycle === undefined || patchIsAhead || (patchStage === currentStage && patchFlow === currentFlow))) {
      merged.stageCycle = patchIsAhead || current.stageCycle === undefined ? patchStage : currentStage;
      merged.flowIndex = patchIsAhead || current.flowIndex === undefined ? patchFlow : currentFlow;
    } else if (current.stageCycle !== undefined) {
      merged.stageCycle = currentStage;
      merged.flowIndex = currentFlow;
    }

    if (patch.canGoToBoss !== undefined) {
      const sameProgress = patchStage === currentStage && patchFlow === currentFlow;
      if (current.stageCycle === undefined || patchIsAhead) {
        merged.canGoToBoss = patch.canGoToBoss;
      } else if (sameProgress) {
        merged.canGoToBoss = Boolean(current.canGoToBoss || patch.canGoToBoss);
      }
    }

    merged.loopCount = Math.max(
      currentLoopCount,
      patch.loopCount !== undefined ? toNumber(patch.loopCount, currentLoopCount) : currentLoopCount
    );

    merged.lastUpdated = Math.max(toNumber(current.lastUpdated, 0), patch.lastUpdated ?? now);
    return merged;
  });
};

export const claimChapter2Reward = async (uid: string, claim: Chapter2RewardClaim) => {
  const chapter2Ref = ref(database, `profiles/${uid}/chapter2`);
  const now = Date.now();

  const result = await runTransaction(chapter2Ref, (currentData) => {
    const current = currentData && typeof currentData === 'object' ? currentData as any : {};
    const claimedRewardSteps = Array.isArray(current.claimedRewardSteps) ? current.claimedRewardSteps : [];
    const serverStage = toNumber(current.stageCycle, claim.stageCycle);
    const serverFlow = toNumber(current.flowIndex, claim.flowIndex);

    if (!claim.rewardStepKey || claimedRewardSteps.includes(claim.rewardStepKey)) {
      return undefined;
    }

    // サーバ側がすでに先へ進んでいる画面からの報酬確定は、古いタブからの操作として拒否する。
    if (isProgressAhead(serverStage, serverFlow, claim.stageCycle, claim.flowIndex)) {
      return undefined;
    }

    return {
      ...current,
      stageCycle: isProgressAhead(claim.stageCycle, claim.flowIndex, serverStage, serverFlow) ? claim.stageCycle : serverStage,
      flowIndex: isProgressAhead(claim.stageCycle, claim.flowIndex, serverStage, serverFlow) ? claim.flowIndex : serverFlow,
      ownedSkills: uniqueStrings([...(Array.isArray(current.ownedSkills) ? current.ownedSkills : []), ...claim.rewards]),
      claimedRewardSteps: uniqueStrings([...claimedRewardSteps, claim.rewardStepKey]),
      lastUpdated: Math.max(toNumber(current.lastUpdated, 0), claim.lastUpdated ?? now)
    };
  });

  return {
    claimed: result.committed,
    data: result.snapshot.val()
  };
};

export const saveProfileProgress = async (uid: string, patch: ProfileProgressPatch) => {
  const profileRef = ref(database, `profiles/${uid}`);
  const now = Date.now();

  await runTransaction(profileRef, (currentData) => {
    const current = currentData && typeof currentData === 'object' ? currentData as any : {};
    const merged = { ...current };

    if (patch.ownedSkills) {
      merged.ownedSkills = uniqueStrings([...(Array.isArray(current.ownedSkills) ? current.ownedSkills : []), ...patch.ownedSkills]);
    }

    const currentStage = toNumber(current.stageCycle, 1);
    const patchStage = toNumber(patch.stageCycle, currentStage);
    const patchIsAhead = patchStage > currentStage;

    if (patch.stageCycle !== undefined && (current.stageCycle === undefined || patchIsAhead || patchStage === currentStage)) {
      merged.stageCycle = Math.max(currentStage, patchStage);
    }

    if (patch.lastGameMode !== undefined && (patchIsAhead || patchStage === currentStage || current.lastGameMode === undefined)) {
      merged.lastGameMode = patch.lastGameMode;
    }

    if (patch.canGoToBoss !== undefined) {
      if (patchIsAhead || patchStage === currentStage || current.canGoToBoss === undefined) {
        merged.canGoToBoss = patchIsAhead ? patch.canGoToBoss : Boolean(current.canGoToBoss || patch.canGoToBoss);
      }
    }

    merged.updatedAt = Math.max(toNumber(current.updatedAt, 0), patch.updatedAt ?? now);
    return merged;
  });
};

export const resetChapter1Progress = async (uid: string, initialSkills: string[]) => {
  const now = Date.now();
  const profileRef = ref(database, `profiles/${uid}`);
  await runTransaction(profileRef, (currentData) => {
    const current = currentData && typeof currentData === 'object' ? currentData as any : {};
    return {
      ...current,
      stageCycle: 1,
      lastGameMode: 'MID',
      canGoToBoss: false,
      ownedSkills: uniqueStrings(initialSkills),
      updatedAt: now
    };
  });
};

export const resetChapter2Progress = async (uid: string, initialSkills: string[]) => {
  const now = Date.now();
  const chapter2Ref = ref(database, `profiles/${uid}/chapter2`);
  await runTransaction(chapter2Ref, (currentData) => {
    const current = currentData && typeof currentData === 'object' ? currentData as any : {};
    const hasClearedFinalBoss =
      current.stageCycle === 24 &&
      current.flowIndex === 5 &&
      Boolean(current.canGoToBoss);
    const currentLoopCount = inferChapter2LoopCount(current);

    return {
      stageCycle: 13,
      flowIndex: 0,
      loopCount: hasClearedFinalBoss ? currentLoopCount + 1 : currentLoopCount,
      ownedSkills: uniqueStrings(initialSkills),
      claimedRewardSteps: [],
      canGoToBoss: false,
      lastUpdated: now
    };
  });
  await saveProfileProgress(uid, { updatedAt: now });
};

export const saveUserSkills = async (uid: string, skillAbbrs: string[]) => {
  console.log(`[Firebase] Saving skills for ${uid}:`, skillAbbrs);
  await saveChapter2Progress(uid, { ownedSkills: skillAbbrs });
};

export const loadUserSkills = async (uid: string): Promise<string[] | null> => {
  console.log(`[Firebase] Loading skills for ${uid}`);
  const userSkillsRef = ref(database, `profiles/${uid}/chapter2/ownedSkills`);
  const snapshot = await get(userSkillsRef);
  if (snapshot.exists()) {
    const skills = snapshot.val() as string[];
    console.log(`[Firebase] Loaded skills:`, skills);
    return skills;
  }
  console.log(`[Firebase] No skills found for ${uid}`);
  return null;
};

export const resetUserSkills = async (uid: string, initialSkills: string[]) => {
  console.log(`[Firebase] Resetting skills for ${uid}:`, initialSkills);
  const userSkillsRef = ref(database, `profiles/${uid}/chapter2/ownedSkills`);
  await set(userSkillsRef, initialSkills);
};

export const recordAccess = () => {
  const totalAccessRef = ref(database, 'totalAccess');
  runTransaction(totalAccessRef, (currentData) => {
    if (currentData === null) {
      return 1;
    } else {
      return currentData + 1;
    }
  })
  .then(() => console.log("Total access count incremented successfully!"))
  .catch((e) => console.error("Error incrementing total access count: ", e));
};

export const recordDailyAccess = () => {
  const dateKey = formatDateKey();
  const dailyAccessRef = ref(database, `dailyMetrics/accesses/${dateKey}/total`);
  runTransaction(dailyAccessRef, (currentData) => {
    if (currentData === null) {
      return 1;
    }
    return currentData + 1;
  })
  .then(() => console.log(`[Firebase] Daily access count incremented for ${dateKey}`))
  .catch((e) => console.error("Error incrementing daily access count: ", e));
};

export const recordBattleCount = (mode: string, count: number = 1) => {
  const safeCount = Number.isFinite(count) ? Math.max(1, Math.floor(count)) : 1;
  const dateKey = formatDateKey();
  const bucket =
    mode === 'DENEI'
      ? 'denei'
      : mode === 'KENJU'
        ? 'kenju'
        : mode === 'BOSS' || mode === 'MID'
          ? 'story'
          : 'other';

  const refs = [
    ref(database, `dailyMetrics/battles/${dateKey}/total`),
    ref(database, `dailyMetrics/battles/${dateKey}/byMode/${bucket}`)
  ];

  refs.forEach(targetRef => {
    runTransaction(targetRef, (currentData) => {
      if (currentData === null) {
        return safeCount;
      }
      return currentData + safeCount;
    }).catch((e) => console.error("Error incrementing daily battle count: ", e));
  });
};

export const uploadDeneiImage = async (uid: string, dataUrl: string) => {
  const imageRef = storageRef(storage, `images/denei/${uid}.png`);
  // dataUrl は "data:image/png;base64,xxxx" という形式なので uploadString の data_url 形式でアップロード可能
  await uploadString(imageRef, dataUrl, 'data_url');
  return await getDownloadURL(imageRef);
};
