import React, { useCallback, useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import type { RootState } from '@shared/modules/store';
import { getUserFavorites, removeFavorite, type Favorite } from '@shared/modules/api/favorites';
import type { HotelInfo } from '@shared/types/hotel/hotelCard';
import { buildRecommendedHotelRouteParams } from '@shared/utils/hotelUtils/recommendedHotelNavigation';
import { useAppNavigation } from '../../app/navigation';
import { PageHeader } from '../../shell/PageHeader';
import { Icon } from '../../icons';
import { HotelCard } from '../../components/HotelCard';
import { HotelCardSkeleton } from '../../components/HotelCardSkeleton';
import { ConfirmModal } from '../../components/Modal';
import './favorites.css';

// Порт screens/favorites/FavoritesScreen.tsx (Figma «Desktop / Favorites»):
// сетка карточек отелей в 3 колонки, кнопка-сердце для удаления (Alert → ConfirmModal).

export const FavoritesScreen: React.FC = () => {
  const nav = useAppNavigation();
  const { user: loggedInUser } = useSelector((state: RootState) => state.auth);

  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [removeError, setRemoveError] = useState<string | null>(null);
  const [pendingRemove, setPendingRemove] = useState<number | null>(null);

  const userId: number | null = loggedInUser ? Number((loggedInUser as { id?: string | number }).id) || null : null;

  const loadFavorites = useCallback(async () => {
    if (!userId) {
      return;
    }
    try {
      setLoading(true);
      setLoadError(null);
      const favs = await getUserFavorites(userId);
      setFavorites(favs);
    } catch (error) {
      console.error('Failed to load favorites:', error);
      setLoadError('Не удалось загрузить избранное');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  // Загрузка при монтировании (useFocusEffect в RN — экран монтируется заново при каждом переходе).
  useEffect(() => {
    void loadFavorites();
  }, [loadFavorites]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadFavorites();
    setRefreshing(false);
  };

  const handleHotelPress = (hotel: HotelInfo) => {
    const hotelId = typeof hotel.id === 'string' ? parseInt(hotel.id, 10) : Number(hotel.id);
    // Same handoff as home recommendations — hotel page needs searchParams to startSearch/rooms.
    const routeParams = buildRecommendedHotelRouteParams(hotelId);
    nav.navigate('hotel', {
      ...routeParams,
      hotel,
    });
  };

  const confirmRemoveFavorite = async () => {
    const hotelId = pendingRemove;
    setPendingRemove(null);
    if (!userId || hotelId == null) return;
    try {
      setRemoveError(null);
      await removeFavorite(userId, hotelId);
      await loadFavorites();
    } catch (error: any) {
      setRemoveError(error?.message || 'Не удалось удалить из избранного');
    }
  };

  if (!userId) {
    return (
      <>
        <PageHeader title="Избранное" />
        <div className="page-body">
          <div className="empty favorites-empty">
            <div className="favorites-empty__text">Пожалуйста, войдите в систему для просмотра избранного</div>
            <button type="button" className="btn" onClick={() => nav.navigate('login', { returnTo: 'favorites' })}>
              Войти
            </button>
          </div>
        </div>
      </>
    );
  }

  const refreshButton = (
    <button
      type="button"
      className={'favorites-refresh' + (refreshing || loading ? ' favorites-refresh--spinning' : '')}
      onClick={() => void onRefresh()}
      disabled={refreshing || loading}
      title="Обновить"
      aria-label="Обновить">
      <svg viewBox="0 0 24 24" fill="none" width={22} height={22} style={{ display: 'block' }} aria-hidden="true">
        <path d="M20 12a8 8 0 1 1-2.34-5.66M20 4v5h-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  );

  return (
    <>
      <PageHeader title="Избранное" right={refreshButton} />
      <div className="page-body">
        {loading && favorites.length === 0 ? (
          <>
            <div className="grid grid--3 favorites-grid" aria-busy="true">
              {[1, 2, 3].map(i => (
                <HotelCardSkeleton key={i} variant="detail" imageHeight={200} />
              ))}
            </div>
            <div className="favorites-loading">Загрузка избранного...</div>
          </>
        ) : loadError && favorites.length === 0 ? (
          <div className="empty favorites-empty">
            <div className="empty__title">Ошибка</div>
            <div className="favorites-empty__sub">{loadError}</div>
            <button type="button" className="btn btn--sm" onClick={() => void loadFavorites()}>
              Повторить
            </button>
          </div>
        ) : favorites.length === 0 ? (
          <div className="empty favorites-empty">
            <Icon name="heart" size={64} color="var(--text-tertiary)" />
            <div className="favorites-empty__text">У вас пока нет избранных отелей</div>
            <div className="favorites-empty__sub">Добавьте отели в избранное, нажав на иконку сердца на странице отеля</div>
          </div>
        ) : (
          <div className="grid grid--3 favorites-grid">
            {favorites.map(favorite => {
              const hotelData = favorite.hotelData || {};
              // Ensure hotel has required HotelInfo structure
              const hotel: HotelInfo = {
                id: String(hotelData.id || favorite.hotelId),
                name: hotelData.name || 'Отель',
                reviews: hotelData.reviews || 0,
                rating: hotelData.rating || 0,
                stars: hotelData.stars || 0,
                images: hotelData.images || [],
                tags: hotelData.tags || [],
                price: hotelData.price || '',
                dateRange: hotelData.dateRange || '',
                address: hotelData.address || hotelData.city_name || '',
              };
              return (
                <div key={favorite.id} className="favorites-item">
                  <HotelCard hotel={hotel} imageHeight={200} showAddress showTags={false} onPress={() => handleHotelPress(hotel)} />
                  <button
                    type="button"
                    className="favorites-remove"
                    onClick={e => {
                      e.stopPropagation();
                      setPendingRemove(favorite.hotelId);
                    }}
                    title="Удалить из избранного"
                    aria-label="Удалить из избранного">
                    <Icon name="heartFilled" size={24} color="var(--error)" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
        {removeError ? <div className="error-text favorites-error">{removeError}</div> : null}
        {loadError && favorites.length > 0 ? <div className="error-text favorites-error">{loadError}</div> : null}
      </div>

      <ConfirmModal
        open={pendingRemove != null}
        title="Удалить из избранного"
        text="Вы уверены, что хотите удалить этот отель из избранного?"
        cancelText="Отмена"
        confirmText="Удалить"
        danger
        onCancel={() => setPendingRemove(null)}
        onConfirm={() => void confirmRemoveFavorite()}
      />
    </>
  );
};

export default FavoritesScreen;
