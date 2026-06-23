import { useState } from "react";

/**
 * Reusable hook to manage confirmation dialog states dynamically.
 */
export function useConfirmDialog() {
  const [isOpen, setIsOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [onConfirm, setOnConfirm] = useState<() => void>(() => () => {});

  const confirm = (options: { title: string; description: string; action: () => void }) => {
    setTitle(options.title);
    setDescription(options.description);
    setOnConfirm(() => () => {
      options.action();
      setIsOpen(false);
    });
    setIsOpen(true);
  };

  return {
    isOpen,
    setIsOpen,
    title,
    description,
    onConfirm,
    confirm,
  };
}
