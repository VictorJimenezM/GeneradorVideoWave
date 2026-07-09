import { type ReactNode } from "react";

export default function CollapsibleSection({
  title,
  icon,
  titleButtons,
  headerCenter,
  enabled,
  onToggleEnabled,
  collapsed,
  onToggle,
  sectionBg,
  headerBg,
  allCollapsed,
  children,
}: {
  title: string;
  icon?: ReactNode;
  titleButtons?: ReactNode;
  headerCenter?: ReactNode;
  enabled?: boolean;
  onToggleEnabled?: (v: boolean) => void;
  collapsed: boolean;
  onToggle: () => void;
  sectionBg?: string;
  headerBg?: string;
  allCollapsed?: boolean;
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
        className={`flex w-full items-center gap-1 py-0.5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50 focus-visible:ring-offset-1 focus-visible:ring-offset-slate-950 rounded-sm ${headerBg || ''}`}
      >
        <svg
          aria-hidden="true"
          className={`h-2.5 w-2.5 text-slate-500 transition-transform duration-200 flex-shrink-0 ${
            collapsed ? "" : "rotate-90"
          }`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
        {icon}
        <span id={labelId} className={`text-xs font-semibold tracking-wider text-slate-400 uppercase ${!headerCenter ? "flex-1" : ""}`}>
          {title}
        </span>
        {headerCenter && (
          <span className="flex items-center flex-1">
            <span className="flex-1 flex items-center justify-end">{headerCenter}</span>
            {titleButtons && (
              <span className="flex gap-0.5 items-center flex-shrink-0">
                {titleButtons}
              </span>
            )}
          </span>
        )}
        {!headerCenter && titleButtons && (
          <span className="flex gap-0.5 items-center flex-shrink-0">
            {titleButtons}
          </span>
        )}
        {onToggleEnabled && (
          <span className="flex gap-0.5 mr-1 items-center flex-shrink-0">
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onToggleEnabled(!enabled); }}
              className={`relative w-12 h-5 rounded transition-all duration-200 flex-shrink-0 border ${
                enabled
                  ? "bg-red-600 border-red-500"
                  : "bg-neutral-950 border-neutral-700"
              }`}
              aria-label={enabled ? `Desactivar ${title}` : `Activar ${title}`}
            >
              <span className={`absolute left-1 top-1/2 -translate-y-1/2 text-[9px] font-bold text-white uppercase select-none transition-opacity duration-200 ${enabled ? "opacity-100" : "opacity-25"}`}>ON</span>
              <span className={`absolute right-1 top-1/2 -translate-y-1/2 text-[9px] font-bold text-white uppercase select-none transition-opacity duration-200 ${!enabled ? "opacity-100" : "opacity-25"}`}>OFF</span>
              <span
                className={`absolute top-[2px] z-10 h-[16px] w-[16px] rounded-full bg-white shadow-sm transition-all duration-200 ${
                  enabled ? "right-[2px]" : "left-[2px]"
                }`}
              />
            </button>
          </span>
        )}
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
