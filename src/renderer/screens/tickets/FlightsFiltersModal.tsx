import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { buildFilterSections, getFastConfirmIds } from '@shared/utils/ticketsUtils/filterSections';
import { normalizeTicketsFilterSelections } from '@shared/utils/ticketsUtils/sanitizeTicketsFilterPayload';
import { Modal } from '../../components/Modal';

// Порт tickets/FlightsFiltersModal.tsx: «Фильтры», тумблер «Быстрое подтверждение», секции чипов, «Применить».
// Шторка RN → центрированный диалог.

type Props = {
  visible: boolean;
  filters: any;
  selectedFilters: Record<string, string[]>;
  /** Package base price — flight options show "от {netPrice + min_fuel_charge}". */
  netPrice?: number;
  onApply: (selections: Record<string, string[]>) => void;
  onClose: () => void;
};

export const FlightsFiltersModal: React.FC<Props> = ({ visible, filters, selectedFilters, netPrice, onApply, onClose }) => {
  const sections = useMemo(() => buildFilterSections(filters, netPrice), [filters, netPrice]);
  const [pendingSelections, setPendingSelections] = useState<Record<string, string[]>>(selectedFilters);

  useEffect(() => {
    if (visible) setPendingSelections(selectedFilters);
  }, [visible, selectedFilters]);

  const fastConfirmOn = (pendingSelections.confirmability?.length ?? 0) > 0;

  const toggleValue = useCallback((sectionId: string, optionId: string) => {
    setPendingSelections(prev => {
      const current = prev[sectionId] || [];
      const nextValues = current.includes(optionId) ? current.filter(item => item !== optionId) : [...current, optionId];
      return { ...prev, [sectionId]: nextValues };
    });
  }, []);

  const toggleFastConfirm = useCallback(() => {
    setPendingSelections(prev => ({
      ...prev,
      confirmability: prev.confirmability?.length ? [] : getFastConfirmIds(filters),
    }));
  }, [filters]);

  const handleApply = useCallback(() => {
    onApply(normalizeTicketsFilterSelections(pendingSelections));
    onClose();
  }, [onApply, onClose, pendingSelections]);

  // Match hotel filters: reset only clears local draft until "Применить".
  const handleResetLocal = useCallback(() => {
    setPendingSelections({});
  }, []);

  return (
    <Modal open={visible} onClose={onClose} width={640}>
      <div className="tickets-filters">
        <div className="tickets-filters__head">
          <div className="tickets-filters__title">Фильтры</div>
          <div className="tickets-filters__actions">
            <button type="button" className="tickets-filters__reset" onClick={handleResetLocal}>
              Сбросить
            </button>
            <button type="button" className="tickets-filters__cancel" onClick={onClose}>
              Отменить
            </button>
          </div>
        </div>

        <div className="tickets-filters__scroll">
          <div className="tickets-filters__section">
            <button type="button" className="tickets-filters__toggle-row" onClick={toggleFastConfirm} aria-pressed={fastConfirmOn}>
              <span className="tickets-filters__toggle-label">Быстрое подтверждение</span>
              <span className={'toggle' + (fastConfirmOn ? ' toggle--on' : '')} aria-hidden="true" />
            </button>
          </div>
          {sections.map(section => (
            <div key={section.id} className="tickets-filters__section">
              <div className="tickets-filters__section-title">{section.title}</div>
              <div className="tickets-filters__chips">
                {section.options.map(option => {
                  const active = Boolean(pendingSelections[section.id]?.includes(option.id));
                  return (
                    <button
                      type="button"
                      key={option.id}
                      className={'tickets-filters__chip' + (active ? ' tickets-filters__chip--active' : '')}
                      aria-pressed={active}
                      onClick={() => toggleValue(section.id, option.id)}>
                      <span className="tickets-filters__chip-text">{option.label}</span>
                      {option.meta ? <span className="tickets-filters__chip-meta">{option.meta}</span> : null}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <div className="tickets-filters__footer">
          <button type="button" className="btn btn--block" onClick={handleApply}>
            Применить
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default FlightsFiltersModal;
