import { create } from 'zustand';
import { localBoothPrintService } from '../services/api/localBoothPrintService';

// Phien "dung khong can dang nhap" tren may booth: chi ton tai trong tab hien tai,
// khong dinh gi toi token/JWT cua he thong quan tri.
const BOOTH_GUEST_SESSION_KEY = 'booth_guest_session';

type BoothGuestSession = {
  boothCode: string;
  verifiedAt: string;
};

function readStoredSession(): BoothGuestSession | null {
  try {
    const raw = sessionStorage.getItem(BOOTH_GUEST_SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<BoothGuestSession>;
    if (!parsed?.verifiedAt) return null;
    return { boothCode: String(parsed.boothCode ?? ''), verifiedAt: String(parsed.verifiedAt) };
  } catch {
    return null;
  }
}

interface BoothGuestState {
  session: BoothGuestSession | null;
  isBoothGuest: boolean;
  isVerifying: boolean;
  verifyPin: (pinCode: string) => Promise<void>;
  exit: () => void;
}

export const useBoothGuestStore = create<BoothGuestState>((set) => {
  const stored = readStoredSession();

  return {
    session: stored,
    isBoothGuest: Boolean(stored),
    isVerifying: false,

    verifyPin: async (pinCode: string) => {
      set({ isVerifying: true });
      try {
        const result = await localBoothPrintService.validatePin(pinCode);
        if (!result.ok) {
          throw new Error(result.message);
        }

        // Lay boothCode de hien thi; khong lay duoc cung khong chan phien.
        let boothCode = '';
        try {
          boothCode = (await localBoothPrintService.getBoothInfo()).boothCode;
        } catch {
          boothCode = '';
        }

        const session: BoothGuestSession = {
          boothCode,
          verifiedAt: new Date().toISOString(),
        };

        try {
          sessionStorage.setItem(BOOTH_GUEST_SESSION_KEY, JSON.stringify(session));
        } catch {
          // sessionStorage bi chan thi phien chi song trong bo nho.
        }

        set({ session, isBoothGuest: true });
      } finally {
        set({ isVerifying: false });
      }
    },

    exit: () => {
      try {
        sessionStorage.removeItem(BOOTH_GUEST_SESSION_KEY);
      } catch {
        // bo qua
      }
      set({ session: null, isBoothGuest: false });
    },
  };
});
