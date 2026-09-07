import React, { useState } from 'react';
import type { HotelInfo as HotelCardInfo } from '@shared/types/hotel/hotelCard';
import type { AiPriceChange } from '@shared/utils/hotelUtils/aiRoomPick';
import { getAiPriceChangeLabel } from '@shared/utils/hotelUtils/aiRoomPick';
import { Icon } from '../icons';
import { CheckmarkIcon } from './uiIcons';
import './HotelCard.css';

// Порт totus_APP src/component/UI/hotelCard/index.tsx: те же пропсы, та же логика показа блоков.
export type HotelInfo = HotelCardInfo;

export const CARD_IMAGE_PLACEHOLDER_SRC = './images/cardImage.svg';

/** HotelInfo.images: string | {uri} | number (require(...) в RN = плейсхолдер). */
export function resolveImageSrc(img: unknown): string {
  if (typeof img === 'string' && img) return img;
  if (img && typeof img === 'object' && typeof (img as { uri?: unknown }).uri === 'string') {
    return (img as { uri: string }).uri || CARD_IMAGE_PLACEHOLDER_SRC;
  }
  return CARD_IMAGE_PLACEHOLDER_SRC;
}

type HotelCardProps = {
  hotel: HotelInfo;
  footer?: React.ReactNode;
  imageHeight?: number;
  showAddress?: boolean;
  showTags?: boolean;
  onPress?: () => void;
  isSearchResult?: boolean;
  showSlider?: boolean;
  dateRange?: string;
  type?: 'hotel' | 'room';
  roomFeatures?: string[];
  onViewAllOptions?: () => void;
  onMoreDetails?: () => void;
  onReviewsPress?: () => void;
  showAiBadge?: boolean;
  aiPriceChange?: AiPriceChange | null;
};

/** Бейдж «AI Подбор» (UI/aiPickBadge, variant overlay). */
export const AiPickBadge: React.FC<{ variant?: 'overlay' | 'inline'; className?: string }> = ({ variant = 'overlay', className }) => (
  <div className={`ai-pick-badge ai-pick-badge--${variant}${className ? ` ${className}` : ''}`}>
    <span className="ai-pick-badge__mark">AI</span>
    <span className="ai-pick-badge__label">Подбор</span>
  </div>
);

/** Точки пагинации как в приложении: максимум 9, размер убывает с расстоянием от активной. */
const PaginationDots: React.FC<{ total: number; current: number }> = ({ total, current }) => {
  const maxVisibleDots = 9;
  const dots: React.ReactElement[] = [];
  const dot = (key: string, size: number, active: boolean) => (
    <span
      key={key}
      className={'hotel-card__dot' + (active ? ' hotel-card__dot--active' : '')}
      style={{ width: active ? 8 : size, height: active ? 8 : size }}
    />
  );
  if (total <= maxVisibleDots) {
    for (let i = 0; i < total; i++) {
      const distance = Math.abs(i - current);
      dots.push(dot(`dot-${i}`, Math.max(4, 8 - distance * 0.8), i === current));
    }
  } else {
    const windowSize = maxVisibleDots - 2;
    const startIndex = Math.max(0, Math.min(current - Math.floor(windowSize / 2), total - windowSize));
    const endIndex = Math.min(startIndex + windowSize, total);
    if (startIndex > 0) dots.push(dot('dot-start', 4, false));
    for (let i = startIndex; i < endIndex; i++) {
      const distance = Math.abs(i - current);
      dots.push(dot(`dot-${i}`, Math.max(4, 8 - distance * 0.8), i === current));
    }
    if (endIndex < total) dots.push(dot('dot-end', 4, false));
  }
  return <div className="hotel-card__dots">{dots}</div>;
};

const HotelCard: React.FC<HotelCardProps> = ({
  hotel,
  footer,
  imageHeight = 200,
  showAddress = false,
  showTags = false,
  onPress,
  showSlider = false,
  dateRange,
  type = 'hotel',
  roomFeatures = [],
  onViewAllOptions,
  onMoreDetails,
  onReviewsPress,
  showAiBadge = false,
  aiPriceChange = null,
}) => {
  const isRoomCard = type === 'room';
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  const images: unknown[] =
    hotel.images && hotel.images.length > 0 ? hotel.images : isRoomCard ? [] : [CARD_IMAGE_PLACEHOLDER_SRC];
  const showLogoPlaceholder = isRoomCard && images.length === 0;
  const useSlider = (showSlider || isRoomCard) && images.length > 1;
  const safeIndex = Math.min(currentImageIndex, Math.max(0, images.length - 1));

  const stars = Number(hotel.stars) || 0;
  const rating = Number(hotel.rating) || 0;
  const reviews = Number(hotel.reviews) || 0;
  const tags = hotel.tags || [];

  const goPrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentImageIndex(i => (i - 1 + images.length) % images.length);
  };
  const goNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentImageIndex(i => (i + 1) % images.length);
  };

  const renderReviewCount = () => {
    const reviewLabel = reviews > 0 ? `${reviews} отзывов` : 'Отзывы';
    const content = (
      <>
        <Icon name="review" size={showAddress ? 16 : 15} />
        <span className="hotel-card__review-text">{reviewLabel}</span>
      </>
    );
    if (onReviewsPress) {
      return (
        <button
          type="button"
          className="hotel-card__reviews hotel-card__reviews--btn"
          onClick={e => {
            e.stopPropagation();
            onReviewsPress();
          }}>
          {content}
        </button>
      );
    }
    return <span className="hotel-card__reviews">{content}</span>;
  };

  const renderAiPriceChange = () => {
    if (!showAiBadge || !aiPriceChange || aiPriceChange.delta === 0) return null;
    return (
      <span
        className="hotel-card__ai-price"
        style={{ color: aiPriceChange.delta > 0 ? 'var(--brand)' : 'var(--success)' }}>
        {getAiPriceChangeLabel(aiPriceChange)}
      </span>
    );
  };

  const imageSection = (
    <div className={'hotel-card__image-section' + (isRoomCard ? ' hotel-card__image-section--room' : '')}>
      {showLogoPlaceholder ? (
        <div className="hotel-card__logo-placeholder" style={{ height: imageHeight }}>
          <Icon name="radiologo" size={Math.min(96, imageHeight * 0.45)} />
        </div>
      ) : (
        <div className="hotel-card__image-wrap" style={{ height: imageHeight }}>
          <img
            className="hotel-card__image"
            src={resolveImageSrc(useSlider ? images[safeIndex] : images[0])}
            alt={hotel.name || ''}
            style={{ height: imageHeight }}
            draggable={false}
          />
          {useSlider ? (
            <>
              <button type="button" className="hotel-card__nav hotel-card__nav--prev" onClick={goPrev} aria-label="Предыдущее фото">
                <Icon name="chevronLeft" size={22} />
              </button>
              <button type="button" className="hotel-card__nav hotel-card__nav--next" onClick={goNext} aria-label="Следующее фото">
                <Icon name="chevronLeft" size={22} style={{ transform: 'rotate(180deg)' }} />
              </button>
            </>
          ) : null}
          {showAiBadge ? <AiPickBadge variant="overlay" /> : null}
        </div>
      )}
      {useSlider ? <PaginationDots total={images.length} current={safeIndex} /> : null}
    </div>
  );

  const starsRow = (
    <div className="hotel-card__stars">
      {Array.from({ length: 5 }).map((_, index) => (
        <Icon key={`star-${index}`} name={index < stars ? 'starFilled' : 'star'} size={16} color="var(--brand)" />
      ))}
    </div>
  );

  // Бейдж рейтинга: зелёный при рейтинге ≥ 8 (цвет из приложения), иначе жёлтый.
  const ratingBadge = (
    <span className={'hotel-card__rating' + (rating >= 8 ? ' hotel-card__rating--good' : ' hotel-card__rating--mid')}>
      {rating.toFixed(1)}
    </span>
  );

  const addressBlock = showAddress ? <div className="hotel-card__address">{hotel.address || 'Адрес не указан'}</div> : null;

  const tagsBlock =
    showTags && tags.length > 0 ? (
      <div className="hotel-card__tags">
        {tags.map(tag => (
          <span key={`${hotel.id}-${tag}`} className="hotel-card__tag">
            {tag}
          </span>
        ))}
      </div>
    ) : null;

  const roomBlocks = isRoomCard ? (
    <>
      {!onPress ? (
        <div className="hotel-card__room-header">
          <div className="hotel-card__name">{hotel.name}</div>
        </div>
      ) : null}
      <button
        type="button"
        className="hotel-card__more-details"
        onClick={e => {
          e.stopPropagation();
          onMoreDetails?.();
        }}>
        Подробнее о номере
      </button>
      {roomFeatures.length > 0 ? (
        <div className="hotel-card__features">
          {roomFeatures.map((feature, index) => (
            <div key={`feature-${index}`} className="hotel-card__feature">
              <CheckmarkIcon size={16} />
              <span className="hotel-card__feature-text">{feature}</span>
            </div>
          ))}
        </div>
      ) : null}
    </>
  ) : null;

  const content = (
    <div className="hotel-card__content">
      {!isRoomCard ? starsRow : null}
      {!isRoomCard || onPress ? <div className="hotel-card__name">{hotel.name}</div> : null}
      {!isRoomCard ? (
        <div className="hotel-card__review-row">
          {ratingBadge}
          {!showAddress ? <Icon name="document" size={18} color="var(--text-tertiary)" /> : null}
          {renderReviewCount()}
        </div>
      ) : null}
      {addressBlock}
      {tagsBlock}
      {/* Цена: у отелей — только в выдаче (без адреса); у номеров — всегда */}
      {!isRoomCard && !showAddress ? (
        <div className="hotel-card__price-row">
          <span className="hotel-card__price">{hotel.price}</span>
          <span className="hotel-card__date">{dateRange || hotel.dateRange}</span>
        </div>
      ) : null}
      {isRoomCard && !onPress ? (
        <div className="hotel-card__room-price">
          <div className="hotel-card__price-row">
            <span className="hotel-card__price">{hotel.price}</span>
            <span className="hotel-card__date">{hotel.dateRange}</span>
          </div>
          {renderAiPriceChange()}
        </div>
      ) : null}
      {isRoomCard && !onPress && onViewAllOptions ? (
        <button type="button" className="btn btn--block" onClick={onViewAllOptions}>
          Все варианты
        </button>
      ) : null}
    </div>
  );

  const className = 'hotel-card' + (isRoomCard ? ' hotel-card--room' : '') + (onPress ? ' hotel-card--clickable' : '');

  if (onPress) {
    return (
      <div
        className={className}
        role="button"
        tabIndex={0}
        onClick={onPress}
        onKeyDown={e => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onPress();
          }
        }}>
        {imageSection}
        {roomBlocks}
        {content}
      </div>
    );
  }

  return (
    <div className={className}>
      {imageSection}
      {roomBlocks}
      {content}
      {footer}
    </div>
  );
};

export { HotelCard };
export default HotelCard;
