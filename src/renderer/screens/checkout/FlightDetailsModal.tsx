import React, { useMemo } from 'react';
import { transformFlightDetails } from '@shared/utils/ticketsUtils/flightDetailsUtils';
import type { FlightDetails, FlightDetailSegment } from '@shared/types/tickets';
import { Modal } from '../../components/Modal';
import { CloseIcon } from '../../components/uiIcons';
import { Icon } from '../../icons';
import { FlightSegmentView } from '../tickets/FlightSegmentView';

// Порт checkout/components/FlightDetailsModal.tsx: «Детали перелёта» (туда / обратно), «В пути …».

type Props = {
  visible: boolean;
  onClose: () => void;
  flightData?: any;
};

const sumSegmentDuration = (segment?: FlightDetailSegment): number => {
  if (!segment) return 0;
  const base = segment.durationSeconds || 0;
  const transitions = segment.transitions?.reduce((acc, item) => acc + (item.durationSeconds || 0), 0) || 0;
  return base + transitions;
};

export const FlightDetailsModal: React.FC<Props> = ({ visible, onClose, flightData }) => {
  const flightDetails = useMemo<FlightDetails | null>(() => {
    if (!flightData) return null;
    return transformFlightDetails(flightData);
  }, [flightData]);

  const totalDuration = useMemo(() => {
    if (!flightDetails) return '';
    const totalSeconds = sumSegmentDuration(flightDetails.to) + sumSegmentDuration(flightDetails.back);
    if (!totalSeconds) return '';
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    return `${hours}ч ${minutes}м`;
  }, [flightDetails]);

  return (
    <Modal open={visible} onClose={onClose} width={640}>
      <div className="checkout-modal__head">
        <div>
          <div className="checkout-modal__title">Детали перелёта</div>
          {totalDuration ? <div className="checkout-modal__subtitle">В пути {totalDuration}</div> : null}
        </div>
        <button type="button" className="checkout-modal__close" onClick={onClose} aria-label="Закрыть">
          <CloseIcon size={22} />
        </button>
      </div>

      <div className="checkout-modal__body">
        {flightDetails?.to ? <FlightSegmentView segment={flightDetails.to} title="Перелёт туда" /> : null}
        {flightDetails?.back ? <FlightSegmentView segment={flightDetails.back} title="Перелёт обратно" /> : null}

        <div className="checkout-banner">
          <Icon name="warning" size={24} color="var(--brand)" />
          <span className="checkout-banner__text">Указано местное время, багаж на пассажира</span>
        </div>
      </div>
    </Modal>
  );
};

export default FlightDetailsModal;
