import React from 'react';
import type { HotelReview } from '@shared/types/hotel';
import { Modal } from '../../../components/Modal';
import { CloseIcon } from '../../../components/uiIcons';
import { Icon } from '../../../icons';

// Порт hotel/modals/HotelReviewsModal(+Content).tsx: «Отзывы», карточки отзывов, «Показать ещё».

type Props = {
  visible: boolean;
  onClose: () => void;
  reviews: HotelReview[];
  loading: boolean;
  loadingMore: boolean;
  hasMore: boolean;
  error: string | null;
  reviewsCount: number;
  rating: number;
  onLoadMore: () => void;
};

function formatReviewDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
  } catch {
    return dateStr;
  }
}

export const HotelReviewsModal: React.FC<Props> = ({
  visible,
  onClose,
  reviews,
  loading,
  loadingMore,
  hasMore,
  error,
  reviewsCount,
  rating,
  onLoadMore,
}) => {
  const subTitle = reviewsCount > 0 ? `${reviewsCount} отзывов${rating > 0 ? ` · рейтинг ${rating.toFixed(1)}` : ''}` : '';

  return (
    <Modal open={visible} onClose={onClose} width={680}>
      <div className="hotel-modal">
        <div className="hotel-modal__head">
          <div className="hotel-modal__titles">
            <div className="hotel-modal__title">Отзывы</div>
            {subTitle ? <div className="hotel-modal__subtitle">{subTitle}</div> : null}
          </div>
          <button type="button" className="hotel-modal__close" onClick={onClose} aria-label="Закрыть">
            <CloseIcon size={20} />
          </button>
        </div>

        {loading && reviews.length === 0 ? (
          <div className="hotel-modal__empty">
            <span className="hotel-spinner" />
            <span>Загрузка отзывов...</span>
          </div>
        ) : error ? (
          <div className="hotel-modal__empty">{error}</div>
        ) : reviews.length === 0 ? (
          <div className="hotel-modal__empty">Нет отзывов</div>
        ) : (
          <div className="hotel-modal__scroll">
            {reviews.map(review => (
              <article key={review.id} className="hotel-review">
                <div className="hotel-review__head">
                  <div className="hotel-review__avatar">
                    <Icon name="radiologo" size={40} />
                  </div>
                  <div className="hotel-review__meta">
                    <div className="hotel-review__author-row">
                      <span className="hotel-review__author">{review.name}</span>
                      {review.average_rating > 0 ? <span className="hotel-review__rating">{review.average_rating}</span> : null}
                    </div>
                    {review.title ? <div className="hotel-review__title">{review.title}</div> : null}
                    <div className="hotel-review__date">{formatReviewDate(review.created_at)}</div>
                  </div>
                </div>
                <div className="hotel-review__content">{review.content}</div>
                {review.answer ? (
                  <div className="hotel-review__answer">
                    <div className="hotel-review__answer-label">Ответ отеля</div>
                    <div className="hotel-review__answer-text">{review.answer}</div>
                  </div>
                ) : null}
              </article>
            ))}
            {hasMore ? (
              <button type="button" className="btn btn--block" onClick={onLoadMore} disabled={loadingMore}>
                {loadingMore ? 'Загрузка...' : 'Показать ещё'}
              </button>
            ) : null}
          </div>
        )}
      </div>
    </Modal>
  );
};

export default HotelReviewsModal;
