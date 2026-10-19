import type { ComponentChildren } from "preact";
import { useRef } from "preact/hooks";

export type TabItem = { id: string; label: string; disabled?: boolean };

export function Tabs({ id, label, tabs, selectedId, onSelect }: { id: string; label: string; tabs: readonly TabItem[]; selectedId: string; onSelect: (id: string) => void }) {
  const refs = useRef<Array<HTMLButtonElement | null>>([]);

  function selectIndex(index: number) {
    const tab = tabs[index];
    if (!tab || tab.disabled) return;
    refs.current[index]?.focus();
    onSelect(tab.id);
  }

  function moveFocus(currentIndex: number, direction: 1 | -1) {
    const enabled = tabs.map((tab, index) => (tab.disabled ? -1 : index)).filter((index) => index >= 0);
    if (enabled.length === 0) return;
    const currentEnabledIndex = enabled.indexOf(currentIndex);
    const nextEnabledIndex = (currentEnabledIndex + direction + enabled.length) % enabled.length;
    const nextIndex = enabled[nextEnabledIndex];
    if (nextIndex !== undefined) selectIndex(nextIndex);
  }

  return (
    <div class="ui-tabs" role="tablist" aria-label={label}>
      {tabs.map((tab, index) => {
        const selected = tab.id === selectedId;
        return (
          <button
            class="ui-tabs__tab"
            id={`${id}-tab-${tab.id}`}
            type="button"
            role="tab"
            aria-selected={selected}
            aria-controls={`${id}-panel-${tab.id}`}
            tabIndex={selected ? 0 : -1}
            disabled={tab.disabled}
            ref={(node) => { refs.current[index] = node; }}
            onClick={() => onSelect(tab.id)}
            onKeyDown={(event) => {
              if (event.key === "ArrowRight") { event.preventDefault(); moveFocus(index, 1); }
              else if (event.key === "ArrowLeft") { event.preventDefault(); moveFocus(index, -1); }
              else if (event.key === "Home") { event.preventDefault(); selectIndex(tabs.findIndex((item) => !item.disabled)); }
              else if (event.key === "End") { event.preventDefault(); selectIndex(tabs.findLastIndex((item) => !item.disabled)); }
            }}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}

export function TabPanel({ tabsId, tabId, selected, children }: { tabsId: string; tabId: string; selected: boolean; children: ComponentChildren }) {
  return (
    <section class="ui-tab-panel" id={`${tabsId}-panel-${tabId}`} role="tabpanel" aria-labelledby={`${tabsId}-tab-${tabId}`} hidden={!selected}>
      {children}
    </section>
  );
}
