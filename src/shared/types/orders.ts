export type OrderTourist = {
  first_name?: string;
  last_name?: string;
  birth_date?: string;
  passport_number?: string;
  [key: string]: unknown;
};

export type ValidateTouristParams = {
  tourists?: OrderTourist[];
  [key: string]: unknown;
};

export type CreateOrderParams = {
  package_id?: number;
  request_id?: string;
  tourists?: OrderTourist[];
  [key: string]: unknown;
};

export type SbpAmount = {
  value: number;
  code: string;
};

/** Payload accepted by POST /vtb/create-order. */
export type CreatePayParams = {
  order_id?: number | string;
  orderId?: string;
  orderName?: string;
  expire?: Date | string;
  amount?: SbpAmount | number;
  returnUrl?: string;
  paymentPurpose?: string;
  payment_method?: string;
  [key: string]: unknown;
};

export type CheckPayParams = {
  order_id?: number | string;
  orderId?: string | number;
  qrcId?: string | null;
  [key: string]: unknown;
};

export type Order = {
  id?: number | string;
  order_id?: number | string;
  pay_status?: string;
  order_state?: string;
  state?: string;
  package?: any;
  tourists?: OrderTourist[];
  [key: string]: unknown;
};
