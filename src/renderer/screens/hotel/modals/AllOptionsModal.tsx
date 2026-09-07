import React, { useEffect, useMemo, useState } from 'react';
import type { HotelRoom, HotelSearchSnapshot, Offer } from '@shared/types/hotel';
import type { AiRoomPick } from '@shared/utils/hotelUtils/aiRoomPick';
import {
  isOfferHighlightedByAiPick,
  isSameHotelRoom,
  resolveAiSelectedOffer,
  resolveAiSelectedRoom,
  resolveAiPriceChange,
  enrichAiRoomPickFromRooms,
  getAiPriceChangeLabel,
} from '@shared/utils/hotelUtils/aiRoomPick';
import { extractOperators, groupOffersByMealType, formatOfferDate, formatOfferPrice } from '@shared/utils/hotelUtils/roomHelpers';
import { createPackage } from '@shared/modules/api/levelTravelApi';
import { extractPackageId } from '@shared/utils/hotelUtils/packageHelpers';
import { getOfferPriceSubtitle, navigateAfterPackageCreate, normalizeSearchType } from '@shared/utils/bookingFlowUtils';
import { useAppNavigation } from '../../../app/navigation';
import { Modal } from '../../../components/Modal';
import { CloseIcon } from '../../../components/uiIcons';
import { AiPickBadge } from '../../../components/HotelCard';

// Порт hotel/modals/AllOptionsModal(+Content).tsx: «Все варианты проживания», чипы операторов,
// предложения по типу питания, «Выбрать … ₽» → createPackage → navigateAfterPackageCreate.
// Alert.alert → инлайновая ошибка (.error-text).

type Props = {
  visible: boolean;
  onClose: () => void;
  room: HotelRoom | null;
  selectedDate?: string | null;
  requestId: string | null;
  aiRoomPick?: AiRoomPick | null;
  hotelMeta: { name?: string; country?: string; city?: string };
  searchContext: HotelSearchSnapshot | null;
  searchType?: string;
};

// Meal type mapping
const roomTypeName: { [key: string]: string } = {
  BB: 'Завтрак',
  RO: 'Без питания',
  AI: 'Всё включено',
  UAI: 'Ультра всё включено',
  HB: 'Завтрак и ужин',
  FB: 'Завтрак, обед, ужин',
  HBD: 'Завтрак и ужин',
  AI24: 'Всё включено 24 часа',
  DNR: 'Ужин',
  AIL: 'Всё включено с ограничениями',
  'FB+': 'Завтрак, обед, ужин +',
  'HB+': 'Завтрак и ужин +',
  HBL: 'Завтрак и обед',
};

const AllOptionsModalContent: React.FC<Omit<Props, 'visible' | 'room'> & { room: HotelRoom }> = ({
  onClose,
  room,
  selectedDate,
  requestId,
  hotelMeta,
  searchContext,
  searchType,
  aiRoomPick = null,
}) => {
  const navigation = useAppNavigation();
  const resolvedSearchType = normalizeSearchType(searchType);
  const priceSubtitle = getOfferPriceSubtitle(resolvedSearchType);
  const [selectedOperator, setSelectedOperator] = useState<string | null>(null);
  const [selectedOffer, setSelectedOffer] = useState<Offer | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  /** Per meal-type expand state — match kedam-WEB priceList (1 offer + show more). */
  const [expandedMealTypes, setExpandedMealTypes] = useState<Record<string, boolean>>({});

  const enrichedAiRoomPick = useMemo(
    () => enrichAiRoomPickFromRooms(aiRoomPick, [room], selectedDate ?? null),
    [aiRoomPick, room, selectedDate],
  );

  const isAiSelectedRoom = isSameHotelRoom(room, resolveAiSelectedRoom([room], enrichedAiRoomPick, selectedDate ?? null));

  useEffect(() => {
    if (!isAiSelectedRoom || !enrichedAiRoomPick) return;

    const resolved = resolveAiSelectedOffer(room, enrichedAiRoomPick, selectedDate ?? null);
    if (resolved?.offer.operator_name) {
      setSelectedOperator(resolved.offer.operator_name);
      setSelectedOffer(resolved.offer);
      return;
    }
    if (enrichedAiRoomPick.operatorName) setSelectedOperator(enrichedAiRoomPick.operatorName);
  }, [room, enrichedAiRoomPick, selectedDate, isAiSelectedRoom]);

  // Filter room offers by selected date + exact search nights (kedam-WEB parity)
  const filteredRoom = useMemo(() => {
    const searchNights = searchContext?.nights ?? null;
    if (!selectedDate && searchNights == null) return room;

    const filteredOffers: { [key: string]: Offer[] } = {};
    Object.entries(room.offers).forEach(([mealTypeId, offers]) => {
      const dateFilteredOffers = offers.filter(offer => {
        if (selectedDate && offer.start_date !== selectedDate) return false;
        if (searchNights != null && Number(offer.nights_count) !== searchNights) return false;
        return true;
      });
      if (dateFilteredOffers.length > 0) filteredOffers[mealTypeId] = dateFilteredOffers;
    });

    return { ...room, offers: filteredOffers };
  }, [room, selectedDate, searchContext?.nights]);

  // Extract all unique operators from filtered room
  const operators = useMemo(() => extractOperators(filteredRoom), [filteredRoom]);

  // Group offers by meal type, cheapest first (kedam-WEB priceList)
  const offersByMealType = useMemo(() => {
    const grouped = groupOffersByMealType(filteredRoom, selectedOperator);
    const sorted: typeof grouped = {};
    Object.entries(grouped).forEach(([mealTypeId, value]) => {
      sorted[mealTypeId] = {
        ...value,
        offers: [...value.offers].sort((a, b) => {
          const priceA = Number(a?.analytics_price ?? a?.price) || Number.POSITIVE_INFINITY;
          const priceB = Number(b?.analytics_price ?? b?.price) || Number.POSITIVE_INFINITY;
          return priceA - priceB;
        }),
      };
    });
    return sorted;
  }, [filteredRoom, selectedOperator]);

  const formatHiddenOffersLabel = (count: number) => {
    if (count === 1) return 'вариант';
    if (count < 5) return 'варианта';
    return 'вариантов';
  };

  const toggleMealTypeExpanded = (mealTypeId: string) => {
    setExpandedMealTypes(prev => ({ ...prev, [mealTypeId]: !prev[mealTypeId] }));
  };

  // Get selected offer price for button
  const selectedPrice = selectedOffer ? formatOfferPrice(selectedOffer.price) : '';

  const handleOfferPress = (offer: Offer) => {
    console.log('[AllOptionsModal] Room offer clicked:', {
      room: { id: room.ID, name: room.room?.name_ru, nameEn: room.room?.name_en },
      selectedDate,
      offer,
    });
    setSelectedOffer(offer);
  };

  const handleSelect = async () => {
    if (!requestId) {
      setErrorMessage('Не найден идентификатор поиска');
      return;
    }
    if (!selectedOffer) {
      setErrorMessage('Выберите предложение');
      return;
    }
    try {
      setErrorMessage(null);
      setIsProcessing(true);
      const packageDetails = await createPackage({ request_id: requestId, tour_id: selectedOffer.id });
      // Prefer LT package.id (same as kedam_WEB) — avoid nested hotel/tour ids
      const packageId = (packageDetails as any)?.package?.id ?? extractPackageId(packageDetails);
      if (!packageId) throw new Error('Не удалось получить идентификатор пакета');
      onClose();
      navigateAfterPackageCreate(navigation, {
        packageId,
        searchType: resolvedSearchType,
        hotelMeta,
        searchContext,
        packageDetails,
      });
    } catch (error: any) {
      setErrorMessage(error?.message || 'Не удалось открыть билеты');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="hotel-modal">
      <div className="hotel-modal__head">
        <div className="hotel-modal__titles">
          <div className="hotel-modal__title" style={{ fontWeight: 600 }}>
            Все варианты проживания
          </div>
        </div>
        <button type="button" className="hotel-modal__close" onClick={onClose} aria-label="Закрыть">
          <CloseIcon size={20} />
        </button>
      </div>

      {/* Operator Filters */}
      <div className="hotel-options__chips">
        <button
          type="button"
          className={'hotel-options__chip' + (!selectedOperator ? ' hotel-options__chip--active' : '')}
          onClick={() => setSelectedOperator(null)}>
          Все
        </button>
        {operators.map(operator => (
          <button
            type="button"
            key={operator}
            className={'hotel-options__chip' + (selectedOperator === operator ? ' hotel-options__chip--active' : '')}
            onClick={() => setSelectedOperator(operator)}>
            {operator}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="hotel-modal__scroll" style={{ maxHeight: 'calc(100vh - 420px)' }}>
        {Object.entries(offersByMealType).map(([mealTypeId, { mealType, offers }]) => {
          const showAll = Boolean(expandedMealTypes[mealTypeId]);
          const hiddenCount = Math.max(0, offers.length - 1);
          const visibleOffers = showAll ? offers : offers.slice(0, 1);

          return (
            <div key={mealTypeId} className="hotel-options__meal">
              <div className="hotel-options__meal-title">{roomTypeName[mealTypeId] || mealType.description || mealTypeId}</div>

              <div className="hotel-options__list">
                {visibleOffers.map((offer, index) => {
                  const isSelected = selectedOffer?.id === offer.id && selectedOffer?.operator_id === offer.operator_id;
                  const isAiOffer =
                    isAiSelectedRoom && isOfferHighlightedByAiPick(offer, mealTypeId, enrichedAiRoomPick, selectedDate, room);
                  const aiPriceChange = isAiOffer ? resolveAiPriceChange(enrichedAiRoomPick, offer) : null;
                  const isLastItem = index === visibleOffers.length - 1 && hiddenCount === 0;

                  return (
                    <button
                      type="button"
                      key={`${offer.id}-${offer.operator_id}-${index}`}
                      className={'hotel-offer' + (isLastItem ? ' hotel-offer--last' : '')}
                      onClick={() => handleOfferPress(offer)}>
                      <span className="hotel-offer__left">
                        {isAiOffer ? <AiPickBadge variant="inline" /> : null}
                        <span className="hotel-offer__nights">
                          {offer.nights_count} ночей {formatOfferDate(offer.start_date)}
                        </span>
                        <span className="hotel-offer__operator">{offer.operator_name}</span>
                      </span>
                      <span className="hotel-offer__right">
                        <span className="hotel-offer__price">{formatOfferPrice(offer.price)}₽</span>
                        {aiPriceChange ? (
                          <span className="hotel-offer__delta" style={{ color: aiPriceChange.delta > 0 ? 'var(--brand)' : 'var(--success)' }}>
                            {getAiPriceChangeLabel(aiPriceChange)}
                          </span>
                        ) : null}
                      </span>
                      <span className={'hotel-offer__radio' + (isSelected ? ' hotel-offer__radio--on' : '')} aria-hidden="true">
                        {isSelected ? <span className="hotel-offer__radio-dot" /> : null}
                      </span>
                    </button>
                  );
                })}

                {hiddenCount > 0 ? (
                  <button type="button" className="hotel-options__more" onClick={() => toggleMealTypeExpanded(mealTypeId)}>
                    {showAll ? 'Скрыть варианты' : `Показать ещё ${hiddenCount} ${formatHiddenOffersLabel(hiddenCount)}`}
                  </button>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>

      {errorMessage ? <div className="error-text">{errorMessage}</div> : null}

      {/* Footer Button */}
      {selectedOffer ? (
        <div className="hotel-options__footer">
          <div className="hotel-options__footer-text">
            <span className="hotel-options__footer-price">Выбрать {selectedPrice} ₽</span>
            <span className="hotel-options__footer-sub">{priceSubtitle}</span>
          </div>
          <button type="button" className="btn btn--block" onClick={() => void handleSelect()} disabled={isProcessing}>
            {isProcessing ? <span className="hotel-spinner hotel-spinner--sm" style={{ borderTopColor: '#fff' }} /> : null}
            Выбрать {selectedPrice} ₽
          </button>
        </div>
      ) : null}
    </div>
  );
};

export const AllOptionsModal: React.FC<Props> = ({ visible, room, ...rest }) => {
  if (!room) return null;
  return (
    <Modal open={visible} onClose={rest.onClose} width={720}>
      <AllOptionsModalContent room={room} {...rest} />
    </Modal>
  );
};

export default AllOptionsModal;
