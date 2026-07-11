export type ContrastMode = 'default' | 'high';
export type MotionMode = 'default' | 'reduced';

const contrastKey = 'zemen:a11y:contrast';
const motionKey = 'zemen:a11y:motion';

const normalizeContrast = (value: string | null): ContrastMode => (value === 'high' ? 'high' : 'default');
const normalizeMotion = (value: string | null): MotionMode => (value === 'reduced' ? 'reduced' : 'default');

export const getContrastMode = (): ContrastMode => {
  if (typeof window === 'undefined') {
    return 'default';
  }
  return normalizeContrast(window.localStorage.getItem(contrastKey));
};

export const getMotionMode = (): MotionMode => {
  if (typeof window === 'undefined') {
    return 'default';
  }
  return normalizeMotion(window.localStorage.getItem(motionKey));
};

export const applyContrastMode = (mode: ContrastMode): void => {
  if (typeof document === 'undefined') {
    return;
  }
  document.documentElement.dataset.contrast = mode;
};

export const applyMotionMode = (mode: MotionMode): void => {
  if (typeof document === 'undefined') {
    return;
  }
  document.documentElement.dataset.motion = mode;
};

export const setContrastMode = (mode: ContrastMode): ContrastMode => {
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(contrastKey, mode);
  }
  applyContrastMode(mode);
  return mode;
};

export const setMotionMode = (mode: MotionMode): MotionMode => {
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(motionKey, mode);
  }
  applyMotionMode(mode);
  return mode;
};

export const initializeAccessibilityPreferences = (): {
  contrast: ContrastMode;
  motion: MotionMode;
} => {
  const contrast = getContrastMode();
  const motion = getMotionMode();
  applyContrastMode(contrast);
  applyMotionMode(motion);
  return { contrast, motion };
};
