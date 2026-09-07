import React, { useEffect, useState } from 'react';
import type { HotelRoom } from '@shared/types/hotel';
import { transformRoomImages } from '@shared/modules/hooks/useRoomTransformers';
import { Modal } from '../../../components/Modal';
import { CheckmarkIcon, CloseIcon } from '../../../components/uiIcons';
import { Icon } from '../../../icons';
import { resolveImageSrc } from '../../../components/HotelCard';

// Порт hotel/modals/RoomDetailsModal(+Content).tsx: «О номере», название, описание, слайдер фото, удобства.
// Иконки удобств (UI/icons/hotelIcons по group_identifier) не портированы — используется галочка.

type Props = {
  visible: boolean;
  onClose: () => void;
  room: HotelRoom | null;
};

/** Точки пагинации: максимум 9, размер убывает с расстоянием от активной (как в приложении). */
const Dots: React.FC<{ total: number; current: number }> = ({ total, current }) => {
  const maxVisibleDots = 9;
  const dots: React.ReactElement[] = [];
  const dot = (key: string, size: number, active: boolean) => (
    <span key={key} className={'hotel-room-modal__dot' + (active ? ' hotel-room-modal__dot--active' : '')} style={{ width: active ? 8 : size, height: active ? 8 : size }} />
  );
  if (total <= maxVisibleDots) {
    for (let i = 0; i < total; i++) dots.push(dot(`dot-${i}`, Math.max(4, 8 - Math.abs(i - current) * 0.8), i === current));
  } else {
    const windowSize = maxVisibleDots - 2;
    const startIndex = Math.max(0, Math.min(current - Math.floor(windowSize / 2), total - windowSize));
    const endIndex = Math.min(startIndex + windowSize, total);
    if (startIndex > 0) dots.push(dot('dot-start', 4, false));
    for (let i = startIndex; i < endIndex; i++) dots.push(dot(`dot-${i}`, Math.max(4, 8 - Math.abs(i - current) * 0.8), i === current));
    if (endIndex < total) dots.push(dot('dot-end', 4, false));
  }
  return <div className="hotel-room-modal__dots">{dots}</div>;
};

export const RoomDetailsModal: React.FC<Props> = ({ visible, onClose, room }) => {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  useEffect(() => {
    if (visible) setCurrentImageIndex(0);
  }, [visible, room?.ID]);

  if (!room) return null;

  const images: unknown[] = transformRoomImages(room.room.images);
  const showLogoPlaceholder = images.length === 0;
  const safeIndex = Math.min(currentImageIndex, Math.max(0, images.length - 1));

  return (
    <Modal open={visible} onClose={onClose} width={720}>
      <div className="hotel-modal">
        <div className="hotel-modal__head">
          <div className="hotel-modal__titles">
            <div className="hotel-modal__title" style={{ fontSize: 18, fontWeight: 600 }}>
              О номере
            </div>
          </div>
          <button type="button" className="hotel-modal__close" onClick={onClose} aria-label="Закрыть">
            <CloseIcon size={20} />
          </button>
        </div>

        <div className="hotel-modal__scroll">
          {/* Room Name */}
          <div className="hotel-room-modal__name">{room.room.name_ru}</div>

          {/* Description */}
          {room.room.description ? <div className="hotel-room-modal__desc">{room.room.description}</div> : null}

          {/* Image Slider or Totus logo when room has no photos */}
          {showLogoPlaceholder ? (
            <div className="hotel-room-modal__slider">
              <div className="hotel-room-modal__placeholder">
                <Icon name="radiologo" size={96} />
              </div>
            </div>
          ) : (
            <div>
              <div className="hotel-room-modal__slider">
                <img className="hotel-room-modal__img" src={resolveImageSrc(images[safeIndex])} alt={room.room.name_ru} draggable={false} />
                {images.length > 1 ? (
                  <>
                    <button
                      type="button"
                      className="hotel-room-modal__nav hotel-room-modal__nav--prev"
                      onClick={() => setCurrentImageIndex(i => (i - 1 + images.length) % images.length)}
                      aria-label="Предыдущее фото">
                      <Icon name="chevronLeft" size={22} />
                    </button>
                    <button
                      type="button"
                      className="hotel-room-modal__nav hotel-room-modal__nav--next"
                      onClick={() => setCurrentImageIndex(i => (i + 1) % images.length)}
                      aria-label="Следующее фото">
                      <Icon name="chevronLeft" size={22} style={{ transform: 'rotate(180deg)' }} />
                    </button>
                  </>
                ) : null}
              </div>
              {images.length > 1 ? <Dots total={images.length} current={safeIndex} /> : null}
            </div>
          )}

          {/* Facilities List */}
          {room.room.facilities && room.room.facilities.length > 0 ? (
            <div className="hotel-facilities">
              {room.room.facilities.map((facility, index) => (
                <div key={`facility-${facility.id}-${index}`} className="hotel-facility">
                  <CheckmarkIcon size={24} />
                  <span className="hotel-facility__text">{facility.name}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="hotel-room-modal__nodata">Нет данных об удобствах</div>
          )}
        </div>
      </div>
    </Modal>
  );
};

export default RoomDetailsModal;
