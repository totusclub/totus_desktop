import { describe, expect, it } from 'vitest';
import { resolve } from '../renderer/app/navigation';

describe('navigation.resolve — маршруты как в totus_APP', () => {
  it('маппит имена экранов RN на пути', () => {
    expect(resolve('hotel', { hotelId: '1' })).toEqual({ path: '/hotel', state: { hotelId: '1' } });
    expect(resolve('hotelFromAi').path).toBe('/hotel');
    expect(resolve('pendingPayment').path).toBe('/pending-payment');
  });
  it('разворачивает вложенную форму navigate(tab, {screen, params})', () => {
    expect(resolve('OrdersStackScreen', { screen: 'orders' }).path).toBe('/orders');
    expect(resolve('tab', { screen: 'AccountStackScreen', params: { screen: 'login', params: { returnTo: 'account' } } })).toEqual({
      path: '/login',
      state: { returnTo: 'account' },
    });
  });
  it('неизвестный маршрут → главная', () => {
    expect(resolve('nope').path).toBe('/');
  });
});
