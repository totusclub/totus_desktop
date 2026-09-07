import React from 'react';
import { Icon } from '../../icons';

// Порт planingTrip/RecommendTripCard и PopularDestinations/PopularDestinationCard.

export const RecommendTripCard: React.FC<{ hotel: any; onPress?: () => void }> = ({ hotel, onPress }) => (
  <button type="button" className="home-rec-card" onClick={onPress}>
    <div className="home-rec-card__image" style={hotel?.image ? { backgroundImage: `url("${hotel.image}")` } : undefined}>
      <span className="home-rec-card__badge">Самый популярный</span>
    </div>
    <div className="home-rec-card__footer">
      <div className="home-rec-card__top">
        <span className="home-rec-card__title">{hotel?.name}</span>
        <span className="home-rec-card__rating">
          <span className="home-rec-card__star">★</span>
          <span>{hotel?.rate}</span>
        </span>
      </div>
      <div className="home-rec-card__sub">{hotel?.city}</div>
    </div>
  </button>
);

export const PopularDestinationCard: React.FC<{ destination: any; handlePressHotel: (item: any) => void }> = ({
  destination,
  handlePressHotel,
}) => (
  <button type="button" className="home-dest-card" onClick={() => handlePressHotel(destination)}>
    <div className="home-dest-card__image" style={destination?.image ? { backgroundImage: `url("${destination.image}")` } : undefined}>
      <div className="home-dest-card__gradient">
        <span className="home-dest-card__name">{destination?.name}</span>
        <Icon name="arrowRight" size={18} color="#FFFFFF" />
      </div>
    </div>
  </button>
);
