import moment from 'moment'
import { ErrorMessage, GetOrderListOptions, IShopeeAPI, OrderResponseOptionalField, OrderStatus, ResultData, ShopeeAPIConfig, TimeRangeField } from '@utils/contains'
import crypto from 'crypto'
import axios, { AxiosError, AxiosRequestConfig, AxiosResponse } from 'axios'
import { isNativeError } from 'util/types'
// eslint-disable-next-line no-unused-vars
import _async from 'async'
// eslint-disable-next-line camelcase
import { splitDate, tryFunctionTime } from '@utils/common'

export class ShopeeApiV2 implements IShopeeAPI {
  /** Config of this class */
  config: ShopeeAPIConfig

  /** Prefix of api */
  commonApiPath: string
  constructor (config: ShopeeAPIConfig) {
    if (config === null || config === undefined) {
      throw new Error('config required')
    }
    const defaultConfig = {
      /** Ex : api */
      apiPrefix: 'api',
      /** Ex : v2 */
      version: 'v2',
      /** Is use in production API or test API */
      isReal: true,
      /** Show More log to debug */
      showMoreLog: false
    }
    this.config = { ...defaultConfig, ...config }
    this.commonApiPath = `/${this.config.apiPrefix}/${this.config.version}`
  }

  /**
   * Get base URL of server
   * @param includeAPIPath with api prefix or not
   * @returns String
   */
  getBaseUrl = (includeAPIPath: boolean = true) => {
    return `https://partner${
      !this.config.isReal ? '.test-stable' : ''
    }.shopeemobile.com${
      includeAPIPath ? `/${this.config.apiPrefix}/${this.config.version}` : ''
    }`
  }

  /**
   * Build a Signature for API request
   * @param data This is a object with key and value
   * @param order Which key is map first or next to right with condition
   * @returns Info about Signature
   */
  buildSignature = (data: Record<string, any>, order?: string[]) => {
    let stringToCrypto = ''
    if (!data) return stringToCrypto
    if (!order) {
      order = Object.keys(data)
    }
    order.forEach((x) => {
      stringToCrypto += data[x]?.toString() ?? ''
    })
    const signature = crypto
      .createHmac('sha256', this.config.partner_key)
      .update(stringToCrypto)
      .digest('hex')

    if (data.timestamp) {
      return {
        sign: signature,
        timestamp: data.timestamp as number
      }
    }

    return signature
  }

  /**
   * Build a simple Signature without timestamp
   * @param apiPath API path
   * @param args everything after but not include timestamp
   * @returns Signature info
   */
  buildSignatureSimple = (apiPath = '', ...args: any[]) => {
    const timestamp = Math.round(Date.now() / 1000)
    const signature = crypto
      .createHmac('sha256', this.config.partner_key)
      .update(`${this.config.partner_id}${apiPath}${timestamp}${args.join('')}`)
      .digest('hex')
    return {
      signature,
      timestamp
    }
  }

  /**
   * Log info to console
   * @param args Everything
   */
  LOG = (...args:any[]) => {
    if (this.config.showMoreLog) {
      args.forEach(element => {
        console.log(element)
      })
    }
  }

  /**
   * Build a link to client can connect with Dev App
   * @param isCancel Is cancel connect with APP?
   * @returns Link to authenticate with client
   */
  buildAuthURL = (isCancel = false) => {
    const host = this.getBaseUrl(false)
    const path = `${this.commonApiPath}/shop/${isCancel ? 'cancel_auth_partner' : 'auth_partner'}`
    const redirectURL = this.config.redirect_uri
    const signatureData = this.buildSignatureSimple(path)
    const token = signatureData.signature
    const timestamp = signatureData.timestamp

    let authUrl = `${host}${path}`
    authUrl += `?partner_id=${this.config.partner_id}`
    authUrl += `&redirect=${redirectURL}`
    authUrl += `&sign=${token}`
    authUrl += `&timestamp=${timestamp}`
    return authUrl
  }

  /**
   * Get access token with callback code when client authentication done
   * @param code Code after client authentication with buildAuthURL
   * @returns Access token data
   */
  getAccessToken = async (code : string) => {
    const path = `/${this.config.apiPrefix}/${this.config.version}/auth/token/get`
    const timestamp = Math.round(Date.now() / 1000)
    const signData = this.buildSignature({
      partner_id: this.config.partner_id,
      path,
      timestamp
    })
    let params = {
      partner_id: this.config.partner_id
    }
    if (!(typeof signData === 'string')) {
      params = { ...params, ...signData }
    }

    const responseTokenData = await this.post(path, { code, shop_id: this.config.shopId, partner_id: this.config.partner_id }, {
      params,
      withApiPath: false
    })
    if (!isNativeError(responseTokenData)) {
      this.config.tokenData = {
        access_token: responseTokenData.body.access_token,
        refresh_token: responseTokenData.body.refresh_token,
        expire_in: responseTokenData.body.expire_in,
        expire_date: new Date((Math.round(Date.now() / 1000) + responseTokenData.body.expire_in - 500) * 1000)
      }
    }
    return responseTokenData
  }

  /**
   * Reset access token in this class if existed
   * @returns New access token
   */
  refreshAccessToken = async () => {
    const path = `/${this.config.apiPrefix}/${this.config.version}/auth/access_token/get`
    const timestamp = Math.round(Date.now() / 1000)
    const signData = this.buildSignature({
      partner_id: this.config.partner_id,
      path,
      timestamp
    })
    let params = {
      partner_id: this.config.partner_id
    }
    if (!(typeof signData === 'string')) {
      params = { ...params, ...signData }
    }

    const responseTokenData = await this.post(path, { refresh_token: this.config.tokenData?.refresh_token, shop_id: this.config.shopId, partner_id: this.config.partner_id }, {
      params,
      withApiPath: false
    })
    if (!isNativeError(responseTokenData)) {
      this.config.tokenData = {
        access_token: responseTokenData.body.access_token,
        refresh_token: responseTokenData.body.refresh_token,
        expire_in: responseTokenData.body.expire_in,
        expire_date: new Date((Math.round(Date.now() / 1000) + responseTokenData.body.expire_in - 500) * 1000)
      }
    }
    return responseTokenData
  }

  /**
   * Make a request to server
   * @param endpoint Endpoint of URL
   * @param data JSON data (Just a object)
   * @param method Allow method is support
   * @param options Option for request
   * @returns Promise
   */
  makeRequest = async (
    endpoint: string,
    data: any,
    method: 'POST' | 'GET' | 'PUT' | 'DELETE',
    options?:
      | Record<string, any>
      | {
          withApiPath?: boolean,
          params: {};
          signatureOptions: {
            data: Record<string, any>;
            order?: string[];
          };
        }
  ): Promise<{
    body: any;
    res: AxiosResponse;
} | ErrorMessage> => {
    const defaultOptions = {
      withApiPath: true,
      params: {},
      signatureOptions: {},
      callback: null
    }
    options = {
      ...defaultOptions,
      ...options
    }
    const cloneData = data === null || data === undefined ? {} : { ...data }
    const signatureData = this.buildSignature(
      options.signatureOptions.data,
      options.signatureOptions.order
    )
    cloneData.partner_id = this.config.partner_id
    if (signatureData !== '') {
      if (typeof signatureData === 'string') {
        cloneData.sign = signatureData
      } else {
        cloneData.timestamp = signatureData.timestamp
        cloneData.sign = signatureData.sign
      }
    }

    if (this.config.shopid) {
      cloneData.shop_id = this.config.shopid
    }
    data = { ...cloneData, ...data }
    const self = this
    const optionsRequest: AxiosRequestConfig<any> = {
      baseURL: this.getBaseUrl(false),
      url: (options.withApiPath ? this.commonApiPath : '') + endpoint,
      method: method.toUpperCase() || 'POST',
      params: method.toUpperCase() === 'GET' ? data ? { ...data, ...options.params } : options.params : {},
      data: method.toUpperCase() !== 'GET' ? data : {}
    }
    const promise = new Promise<{ body: any; res: AxiosResponse }>(function (
      resolve,
      reject
    ) {
      self.LOG('optionsRequest', optionsRequest)
      axios
        .request(optionsRequest)
        .then(function (res) {
          self.LOG(`STATUS: ${res.status}`)
          self.LOG(`HEADERS: ${JSON.stringify(res.headers)}`)
          self.LOG(`BODY: ${JSON.stringify(res.data)}`)
          return resolve({ body: res.data, res })
        })
        .catch((error) => {
          self.LOG(`ERROR : ${error}`)
          return reject(error)
        })
    })

    return promise
  }

  /**
   * Make a post request
   * @param endpoint Endpoint of URL
   * @param data JSON data (Just a object)
   * @param method Allow method is support
   * @param options Option for request
   * @returns Promise
   */
  post = (endpoint: string, data : null | Record<string, any> = null, options?:Record<string, any>) => {
    return this.makeRequest(endpoint, data, 'POST', options)
  }

  /**
   * Make a get request
   * @param endpoint Endpoint of URL
   * @param data JSON data (Just a object)
   * @param method Allow method is support
   * @param options Option for request
   * @returns Promise
   */
  get = (endpoint: string, data = null, options?:Record<string, any>) => {
    return this.makeRequest(endpoint, data, 'GET', options)
  }

  /**
   * Get order data (This API is limit 15 day of dateFrom to dateTo)
   * @param dateFrom Date
   * @param dateTo Date
   * @param options option for the request
   * @returns List of order
   */
  public getOrders = async (dateFrom: Date, dateTo: Date, options?:GetOrderListOptions) : Promise<any[] | ErrorMessage> => {
    type tryFuncResponse = {
      body: any;
      res: AxiosResponse;
    }

    const optionsDefault:GetOrderListOptions = {
      retryTime: 2,
      searchOptions: {
        time_range_field: TimeRangeField.create_time,
        page_size: 20,
        cursor: '',
        order_status: OrderStatus.READY_TO_SHIP,
        response_optional_fields: OrderResponseOptionalField.order_status
      }
    }

    options = { ...optionsDefault, ...options, searchOptions: { ...optionsDefault.searchOptions, ...options?.searchOptions } }

    let lsOrder: any[] = []
    let more = true
    const search = {
      time_from: Math.floor(dateFrom.getTime() / 1000),
      time_to: Math.floor(dateTo.getTime() / 1000),
      ...options.searchOptions
    }
    do {
      const tryFunc = async () : Promise<tryFuncResponse | ErrorMessage> => {
        try {
          const pathApi = '/order/get_order_list'
          const path = `${this.commonApiPath}${pathApi}`
          const signatureOptions = {
            partner_id: this.config.partner_id,
            path,
            timestamp: Math.round(Date.now() / 1000),
            access_token: this.config.tokenData?.access_token,
            shop_id: this.config.shopId
          }
          const sign = this.buildSignature(signatureOptions)
          const response = await this.makeRequest(
            pathApi,
            {
              ...search,
              ...{
                partner_id: this.config.partner_id,
                shop_id: this.config.shopId,
                access_token: this.config.tokenData?.access_token,
                sign: typeof sign === 'string' ? sign : sign.sign,
                timestamp: signatureOptions.timestamp
              }
            },
            'GET'
          )
          if (isNativeError(response) || response instanceof AxiosError) {
            return response
          }
          if (response.body.error) {
            const error: ErrorMessage = new Error()
            error.code = response.body.error
            error.data = response.body
            if (response.body.message) {
              switch (response.body.message) {
                case 'partner and shop has no linked':

                  error.name = 'Shop của bạn chưa liên kết với hệ thống!'
                  error.message = `Vui lòng vào link này ${this.buildAuthURL()}"  và đăng nhập để hệ thống liên kết với Shop của bạn!`

                  break
                case 'no shopid':

                  error.name = 'Id của shop không tồn tại!'
                  error.message = 'Vui lòng kiểm tra lại thông tin của bạn!'

                  break

                default:
                  error.message = response.body.message
                  break
              }
            } else {
              error.message = response.body
            }
            return error
          }
          return response
        } catch (err) {
          return err as ErrorMessage
        }
      }
      const response = await tryFunctionTime<tryFuncResponse | ErrorMessage>(tryFunc, options?.retryTime ?? 2)
      if (isNativeError(response) || response instanceof AxiosError) {
        this.LOG(`Search : ${search}, Error :`, response)
        more = false
        continue
      }
      if (response.body === undefined || response.body === null) {
        more = false
      } else {
        more = response.body.response?.more ?? false
      }
      if (response.body.error) {
        const error :ErrorMessage = new Error()
        error.code = response.body.error
        error.data = response.body
        switch (response.body.message) {
          case 'partner and shop has no linked':
            error.name = 'Shop của bạn chưa liên kết với hệ thống!'
            error.message = `Vui lòng vào link này ${this.buildAuthURL()}"  và đăng nhập để hệ thống liên kết với Shop của bạn!`
            break
          case 'no shopid':
            error.name = 'Id của shop không tồn tại!'
            error.message = 'Vui lòng kiểm tra lại thông tin của bạn!'
            break
          default:

            break
        }
        return error
      }
      lsOrder = lsOrder.concat(response.body.response.order_list)
      search.cursor = response.body.response.next_cursor
      this.LOG(
      `getOrders : dateFrom : ${moment(dateFrom).format('dd/MM/yyyy')}, dateTo : ${moment(dateTo).format('dd/MM/yyyy')}, lsOrder : ${
        lsOrder.length
      }`
      )
    } while (more)
    return lsOrder
  }

  getAllOrders = () => {
    const localGetOrder = this.getOrders

    const result = async function * (dateFrom: Date, dateTo: Date, options?:GetOrderListOptions) {
      const listSplitDate = splitDate(dateFrom, dateTo, 15)
      for (let i = 0; i < listSplitDate.length; i++) {
        const dateData = listSplitDate[i]
        const rsData = await localGetOrder(dateData.from, dateData.to, options)

        if (!(rsData instanceof Error)) {
          for (let j = 0; j < rsData.length; j++) {
            const data = rsData[j]
            yield data
          }
        }
      }
    }
    return result
  }

  /**
   * Get shop info
   * @returns ShopInfo object
   */
  getShopInfo = async ():Promise<ResultData> => {
    let result: ResultData = {
      success: false
    }

    const path = `/${this.config.apiPrefix}/${this.config.version}/shop/get_shop_info`
    const timestamp = Math.round(Date.now() / 1000)
    const signData = this.buildSignature({
      partner_id: this.config.partner_id,
      path,
      timestamp,
      access_token: this.config.tokenData?.access_token,
      shop_id: this.config.shopId
    })
    let params = {
      partner_id: this.config.partner_id,
      shop_id: this.config.shopId,
      access_token: this.config.tokenData?.access_token
    }
    if (!(typeof signData === 'string')) {
      params = { ...params, ...signData }
    }

    const responseTokenData = await this.get(path, null, {
      params,
      withApiPath: false
    })
    this.LOG('getShopInfo Response Data : ', responseTokenData)
    if (!isNativeError(responseTokenData)) {
      if (responseTokenData.body) {
        result.success = true
        result.data = responseTokenData.body
      } else {
        result.data = result
      }
    } else {
      result = { ...result, ...responseTokenData } as any
    }

    return result
  }
}
