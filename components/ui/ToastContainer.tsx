"use client";

import { useUIStore, Toast } from "@/hooks/useUIStore";
import { AnimatePresence, motion } from "framer-motion";

export function ToastContainer() {
  const { toasts, removeToast } = useUIStore();

  return (
    <div className="fixed right-4 bottom-4 left-4 md:left-auto md:right-8 md:bottom-8 z-[9999] flex flex-col gap-3 max-w-full md:max-w-[360px] w-[calc(100%-32px)] md:w-auto items-center md:items-end pointer-events-none">
      <AnimatePresence>
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 30 }}
            transition={{ duration: 0.3 }}
            className={`
              pointer-events-auto cursor-pointer flex items-center justify-center rounded-[14px] border border-jj-border bg-jj-surface2 px-6 py-2.5 text-[14px] font-semibold text-jj-text shadow-xl transition-all duration-300
              min-h-[44px] min-w-[240px] max-w-[360px] w-fit text-center border-l-[4px]
              ${toast.type === "success" && "border-l-jj-green"}
              ${toast.type === "error" && "border-l-jj-red"}
              ${toast.type === "info" && "border-l-jj-blue"}
              ${toast.type === "warning" && "border-l-jj-accent"}
            `}
            onClick={() => removeToast(toast.id)}
          >
            <span className="break-words whitespace-normal leading-[1.4]">
              {toast.message}
            </span>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}



