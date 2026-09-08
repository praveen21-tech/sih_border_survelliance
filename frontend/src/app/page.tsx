"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useRouter } from "next/navigation";
import LoadingScreen from "@/components/LoadingScreen";

export default function RootPage() {
  const router = useRouter();
  const [done, setDone] = useState(false);

  function handleComplete() {
    setDone(true);
    // Small delay so the fade-out finishes before navigation
    setTimeout(() => router.push("/dashboard"), 300);
  }

  return (
    <AnimatePresence mode="wait">
      {!done && (
        <motion.div
          key="loading"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          style={{ position: "fixed", inset: 0, zIndex: 50 }}
        >
          <LoadingScreen onComplete={handleComplete} />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
