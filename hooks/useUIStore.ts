import { create } from "zustand";

type ToastType = "success" | "error" | "info" | "warning";

export interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

export interface LiveNotif {
  id: string;
  title: string;
  body: string;
  hint?: string;
  icon?: string;
}

interface UIState {
  toasts: Toast[];
  liveNotifs: LiveNotif[];
  isTaskModalOpen: boolean;
  isWorkLogModalOpen: boolean;
  isNotifPopupOpen: boolean;
  isMobileSidebarOpen: boolean;
  
  // Actions
  addToast: (message: string, type?: ToastType) => void;
  removeToast: (id: string) => void;
  
  addLiveNotif: (notif: Omit<LiveNotif, "id">) => void;
  removeLiveNotif: (id: string) => void;
  
  setTaskModalOpen: (open: boolean) => void;
  setWorkLogModalOpen: (open: boolean) => void;
  setNotifPopupOpen: (open: boolean) => void;
  setMobileSidebarOpen: (open: boolean) => void;
}

export const useUIStore = create<UIState>((set) => ({
  toasts: [],
  liveNotifs: [],
  isTaskModalOpen: false,
  isWorkLogModalOpen: false,
  isNotifPopupOpen: false,
  isMobileSidebarOpen: false,

  addToast: (message, type = "info") => {
    const id = Math.random().toString(36).substring(7);
    set((state) => ({ toasts: [...state.toasts, { id, message, type }] }));
    setTimeout(() => {
      set((state) => ({
        toasts: state.toasts.filter((t) => t.id !== id),
      }));
    }, 3500);
  },
  
  removeToast: (id) =>
    set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),

  addLiveNotif: (notif) => {
    const id = Math.random().toString(36).substring(7);
    set((state) => ({ liveNotifs: [...state.liveNotifs, { ...notif, id }] }));
  },
  
  removeLiveNotif: (id) =>
    set((state) => ({ liveNotifs: state.liveNotifs.filter((n) => n.id !== id) })),

  setTaskModalOpen: (open) => set({ isTaskModalOpen: open }),
  setWorkLogModalOpen: (open) => set({ isWorkLogModalOpen: open }),
  setNotifPopupOpen: (open) => set({ isNotifPopupOpen: open }),
  setMobileSidebarOpen: (open) => set({ isMobileSidebarOpen: open }),
}));

