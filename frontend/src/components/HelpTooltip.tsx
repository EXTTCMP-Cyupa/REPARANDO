import { HelpCircle } from "lucide-react";
import { useState } from "react";

interface HelpTooltipProps {
  text: string;
  children?: React.ReactNode;
  side?: "top" | "right" | "bottom" | "left";
}

export function HelpTooltip({ text, children, side = "right" }: HelpTooltipProps) {
  const [visible, setVisible] = useState(false);

  const sideClasses = {
    top: "bottom-full mb-2",
    right: "left-full ml-2",
    bottom: "top-full mt-2",
    left: "right-full mr-2"
  };

  return (
    <div className="relative inline-flex">
      <button
        type="button"
        onClick={() => setVisible(!visible)}
        onBlur={() => setTimeout(() => setVisible(false), 100)}
        className="inline-flex h-5 w-5 items-center justify-center rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
        aria-label="Más información"
      >
        <HelpCircle size={16} />
      </button>

      {visible && (
        <div className={`absolute z-50 ${sideClasses[side]} w-48 rounded-lg bg-slate-900 px-3 py-2 text-xs text-white shadow-lg`}>
          {text}
          {children && <div className="mt-1">{children}</div>}
          <div className={`absolute w-2 h-2 bg-slate-900 ${side === "top" ? "top-[-4px]" : side === "bottom" ? "bottom-[-4px]" : side === "left" ? "left-[-4px]" : "right-[-4px]"}`} />
        </div>
      )}
    </div>
  );
}

interface InfoBoxProps {
  title?: string;
  text: string;
  variant?: "info" | "warning" | "success";
}

export function InfoBox({ title, text, variant = "info" }: InfoBoxProps) {
  const variants = {
    info: "bg-blue-50 border-blue-200 text-blue-900",
    warning: "bg-amber-50 border-amber-200 text-amber-900",
    success: "bg-emerald-50 border-emerald-200 text-emerald-900"
  };

  return (
    <div className={`rounded-lg border px-3 py-2 text-xs ${variants[variant]}`}>
      {title && <p className="font-bold">{title}</p>}
      <p className={title ? "mt-1" : ""}>{text}</p>
    </div>
  );
}
