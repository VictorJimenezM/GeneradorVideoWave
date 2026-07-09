import { type ReactNode } from "react";

export default function CollapsibleSection({
  title,
  icon,
  titleButtons,
  enabled,
  onToggleEnabled,
  collapsed,
  onToggle,
  sectionBg,
  children,
}: {
  title: string;
  icon?: ReactNode;
  titleButtons?: ReactNode;
  enabled?: boolean;
  onToggleEnabled?: (v: boolean) => void;
  collapsed: boolean;
  onToggle: () => void;
  sectionBg?: string;
  children: ReactNode;
}) {
  const sectionId = title.toLowerCase().replace(/[\s/]+/g, "-");
  const labelId = `${sectionId}-label`;

  return (
    <div>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={!collapsed}
        aria-controls={sectionId}
        className="flex w-full items-center gap-1.5 py-0.5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50 focus-visible:ring-offset-1 focus-visible:ring-offset-slate-950 rounded-sm"
      >
        {icon}
        <span id={labelId} className="text-xs font-semibold tracking-wider text-slate-400 uppercase flex-1">
          {title}
        </span>
        {(onToggleEnabled || titleButtons) && (
          <span className="flex gap-0.5 mr-1 items-center">
            {onToggleEnabled ? (
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); onToggleEnabled(!enabled); }}
                className={`relative w-8 h-4 rounded-full transition-all duration-200 flex-shrink-0 ${
                  enabled
                    ? "bg-gradient-to-r from-indigo-900 to-indigo-500"
                    : "bg-neutral-800"
                }`}
                aria-label={enabled ? `Desactivar ${title}` : `Activar ${title}`}
              >
                <span
                  className={`absolute top-[1px] h-[14px] w-[14px] rounded-full bg-white shadow-sm transition-all duration-200 ${
                    enabled ? "right-[1px]" : "left-[1px]"
                  }`}
                />
              </button>
            ) : null}
            {titleButtons}
          </span>
        )}
        <svg
          aria-hidden="true"
          className={`h-2.5 w-2.5 text-slate-500 transition-transform duration-200 ${
            collapsed ? "" : "rotate-90"
          }`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      </button>
      <div
        id={sectionId}
        role="region"
        aria-labelledby={labelId}
        className={`overflow-hidden transition-all duration-250 ease-in-out ${
          collapsed ? "max-h-0 opacity-0" : "max-h-[2000px] opacity-100"
        }`}
      >
        <div className={`pt-0.5 p-1.5 rounded-lg ${sectionBg || ''}`}>{children}</div>
      </div>
    </div>
  );
}
