import moment from 'moment'
import { ErrorMessage, IShopeeAPI, ResultData, ShopeeAPIConfig } from '@utils/contains'
import crypto from 'crypto'
import axios, { AxiosRequestConfig, AxiosResponse } from 'axios'
// eslint-disable-next-line n/no-deprecated-api
import { isNullOrUndefined } from 'util'
import { isNativeError } from 'util/types'
// eslint-disable-next-line no-unused-vars
import _async from 'async'
// eslint-disable-next-line camelcase
import { tryFunctionTime } from '@utils/common'

export class ShopeeApiV2 implements IShopeeAPI {
  config: ShopeeAPIConfig

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

  getBaseUrl = (includeAPIPath: boolean = true) => {
    return `https://partner${
      !this.config.isReal ? '.test-stable' : ''
    }.shopeemobile.com${
      includeAPIPath ? `/${this.config.apiPrefix}/${this.config.version}` : ''
    }`
  }

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

  LOG = (msg: string, ...args:any[]) => {
    if (this.config.showMoreLog) {
      console.log(msg, args)
    }
  }

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
      params: options.params,
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

  post = (endpoint: string, data : null | Record<string, any> = null, options?:Record<string, any>) => {
    return this.makeRequest(endpoint, data, 'POST', options)
  }

  get = (endpoint: string, data = null, options?:Record<string, any>) => {
    return this.makeRequest(endpoint, data, 'GET', options)
  }

  getOrders = async (dateFrom: Date, dateTo: Date, options?:{retryTime?: number}) : Promise<any[] | ErrorMessage> => {
    type tryFuncResponse = {
      body: any;
      res: AxiosResponse;
  }
    let lsOrder: any[] = []
    let more = true
    const search = {
      create_time_from: Math.floor(dateFrom.getTime() / 1000),
      create_time_to: Math.floor(dateTo.getTime() / 1000),
      pagination_entries_per_page: 100,
      pagination_offset: 0
    }
    do {
      const tryFunc = async () : Promise<tryFuncResponse | ErrorMessage> => {
        try {
          const response = await this.makeRequest(
            '/orders/basics',
            search,
            'POST'
          )
          if (isNativeError(response)) {
            return response
          }
          if (response.body.error) {
            const error: ErrorMessage = new Error()
            error.code = response.body.error
            error.data = response.body
            if (response.body.msg) {
              switch (response.body.msg) {
                case 'partner and shop has no linked':

                  error.name = 'Shop của bạn chưa liên kết với hệ thống!'
                  error.message = `Vui lòng vào link này ${this.buildAuthURL()}"  và đăng nhập để hệ thống liên kết với Shop của bạn!`

                  break
                case 'no shopid':

                  error.name = 'Id của shop không tồn tại!'
                  error.message = 'Vui lòng kiểm tra lại thông tin của bạn!'

                  break

                default:
                  error.message = response.body.msg
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
      const response = await tryFunctionTime<tryFuncResponse | ErrorMessage>(tryFunc, options?.retryTime || 2)
      if (isNativeError(response)) {
        this.LOG(`Search : ${search}, Error : ${response}`)
        continue
      }
      if (isNullOrUndefined(response.body)) {
        more = false
      } else {
        more = response.body.more
      }
      if (response.body.error) {
        const error :ErrorMessage = new Error()
        error.code = response.body.error
        error.data = response.body
        switch (response.body.msg) {
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
      lsOrder = lsOrder.concat(response.body.orders)
      search.pagination_offset++
      this.LOG(
      `getAllOrder : dateFrom : ${moment(dateFrom).format('dd/MM/yyyy')}, dateTo : ${moment(dateTo).format('dd/MM/yyyy')}, lsOrder : ${
        lsOrder.length
      }`
      )
    } while (more)
    return lsOrder
  }

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
