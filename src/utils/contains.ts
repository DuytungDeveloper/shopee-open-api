import { AxiosResponse } from 'axios'

// #region Enum
export enum StatusCode {
  // eslint-disable-next-line no-unused-vars
  SUCCESS = '200',
}
// #endregion

// #region Types
export type ResultData = {
  data?: any;
  code?: StatusCode;
  success: boolean;
  message?: string;
  errorMessage?: string;
};

export type ErrorMessage = Error & { code?: string | number; data?: any };

export type ShopeeAPIConfig = Record<string, any> & {
  /** Ex : api */
  apiPrefix?: string;
  /** Ex : v2 */
  version?: string;
  /** Is use in production API or test API */
  isReal: boolean;
  /** ShopId of user */
  shopId: number | string;

  /** Is a partner_id in developer shopee open api */
  partner_id: number | string;
  partner_key: string;

  /** Auth redirect URL */
  redirect_uri?: string;
  webhook_url?: string;
  /** Show More log to debug */
  showMoreLog?: boolean;
  tokenData?:{
    refresh_token: string,
    access_token: string,
    expire_in: number,
    expire_date:Date
  };
};
// #endregion

// #region Interfaces
export interface IShopeeAPI {
  // #region Property
  /** Ex : /api/v2/ */
  commonApiPath?: string;
  config:ShopeeAPIConfig;

  /**
   * * Get base url of a server Ex : https://partner.shopeemobile.com
   * * includeAPI_Path : true => Ex : https://partner.shopeemobile.com/api/v2
   */
  getBaseUrl: (includeAPI_Path?: boolean) => string;
  /**
   * Create a Signature for every request.
   * @param data  is a object includes info to create a Signature and
   * @param order  is how to get data fields in order. If order is empty so just join the data normal
   * @Return a Signature string
   */
  buildSignature: (
    data: Record<string, any>,
    order?: string[]
  ) =>
    | string
    | {
        sign: string;
        timestamp: number;
      };

  getShopInfo: () => Promise<ResultData>;
  makeRequest: (
    endpoint: string,
    data: any,
    method: 'POST' | 'GET' | 'PUT' | 'DELETE',
    options: Record<string, any>
  ) => Promise<{
    body: any;
    res: AxiosResponse;
} | ErrorMessage>;
  post: (
    endpoint: string,
    data: any,
    callback?: Function
  ) => void | Promise<any>;

  getAccessToken: (code: string) => any;

  getOrders: (dateFrom: Date, dateTo: Date) => Promise<any[] | ErrorMessage>;
  // getOrderDetail: (listOrderId: any[]) => Promise<any>;

  // getTransactions: (
  //   dateFrom: Date,
  //   dateTo: Date
  // ) => Promise<any[] | ErrorMessage>;

  // getProducts: (dateFrom: Date, dateTo: Date) => Promise<any[] | ErrorMessage>;
  // getProductDetail: (item_id: number | string) => Promise<any>;

  // updateProductPrice: (item_id: number | string, price: number) => Promise<any>;
  // updateProductVariantPrice: (
  //   item_id: number | string,
  //   variation_id: number | string,
  //   price: number
  // ) => Promise<any>;

  // updateProductStock: (item_id: number | string, stock: number) => Promise<any>;
  // updateProductVariantStock: (
  //   item_id: number | string,
  //   stock: number
  // ) => Promise<any>;

  // updateProductToStore: (listProduct: any[]) => Promise<
  //   | ErrorMessage
  //   | {
  //       success: number;
  //       totalProduct: any;
  //     }
  // >;

  // updateProductSKu: (
  //   productId: number | string,
  //   oldSku: string,
  //   newSku: string
  // ) => Promise<{
  //   success: boolean;
  //   error: null;
  // }>;
}
// #endregion
