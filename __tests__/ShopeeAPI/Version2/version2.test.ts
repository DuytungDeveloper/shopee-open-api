/* eslint-disable no-undef */
/* eslint-disable no-unused-vars */
import { isNativeError } from 'util/types'
import { ErrorMessage, OrderStatus } from '@utils/contains'
import { ShopeeApiV2 } from '@app/versions/version2'
import puppeteer from 'puppeteer'
import url from 'url'
jest.useRealTimers()

describe('Shopee V2 Account VN', () => {
  switch (process.env.MODE) {
    case 'DEV':
      describe('Test Environment', () => {
        const userLoginInfo = {
          account: 'SANDBOX.674ff2615f1fc3f52bef',
          pass: '24eeecb2f99b9c70'
        }
        const api = new ShopeeApiV2({
          isReal: false,
          shopId: 49965,
          partner_id: 1006066,
          partner_key: '0bda23006319db246fcf2c3323f18e25e0fed7e6a1b7590e7ab61666e38f7784',
          showMoreLog: true,
          redirect_uri: 'https://webhook.site/29db2f39-2447-4b36-9f99-f92a615723fe'
        })
        test('Check base URL', () => {
          expect(api.getBaseUrl(false)).toBe('https://partner.test-stable.shopeemobile.com')
        })
        test('Check base URL API', () => {
          expect(api.getBaseUrl()).toBe('https://partner.test-stable.shopeemobile.com/api/v2')
        })

        describe('Get Access Token', () => {
          const newTimeout = 99999999
          const data = api.buildAuthURL()
          test('Authorize URL', () => {
            expect(data).toMatch(/https:\/\/partner\.test-stable\.shopeemobile\.com\/api\/v2.*/gm)
          })

          test('Login and get access_token', async () => {
            jest.setTimeout(newTimeout)
            const browser = await puppeteer.launch({
              // headless: false,
              // devtools: true
            })
            let accessToken : any = null

            try {
              const waitUntil : any = ['load', 'domcontentloaded', 'networkidle0', 'networkidle2']
              const page = await browser.newPage()
              await page.goto(data, {
                waitUntil
              })

              await page.waitForSelector('div.region-select-item > div > div')

              await page.evaluate((_) => {
                console.log(_)
                document?.querySelector('div.region-select-item > div > div')?.dispatchEvent(new Event('click'))
                document?.querySelector('div.region-select-item > div > ul > li:nth-child(3)')?.dispatchEvent(new Event('click'))
              })

              await page.type('div.form-content > div > div.username-item.form-item > div > div > input', userLoginInfo.account)
              await page.type('div.form-content > div > div.form-item.password-item > div.shopee-input.password-input > div > input', userLoginInfo.pass)

              await page.click('button.shopee-button.login-btn.shopee-button--primary.shopee-button--normal.shopee-button--block.login-btn-active')

              await page.waitForNavigation({ waitUntil })

              await page.click('div.btn-content > button')

              await page.waitForNavigation({ waitUntil })

              // eslint-disable-next-line n/no-deprecated-api
              const queryObject :any = url.parse(page.url(), true).query

              accessToken = await api.getAccessToken(queryObject.code)
            } catch (e) {
              console.log('🚀 ~ file: version2.test.ts ~ line 82 ~ test ~ e', e)
            }

            await browser.close()
            expect(accessToken).not.toBeNull()
            expect(accessToken.body).not.toBeNull()
            expect(accessToken.body.access_token).not.toBeNull()
          }, newTimeout)

          test('Refresh Token Data', async () => {
            const rs : any = await api.refreshAccessToken()
            expect(rs).not.toBeNull()
            expect(rs).not.toBeInstanceOf(Error)
            expect(rs.body).not.toBeNull()
          })
        })

        describe('Get Data', () => {
          test('ShopInfo', async () => {
            const rs = await api.getShopInfo()
            expect(rs).not.toBeNull()
          })

          test('Get Orders Data', async () => {
            const rs = await api.getOrders(new Date('2022-06-15'), new Date('2022-06-30'), { retryTime: 0, searchOptions: { order_status: OrderStatus.COMPLETED } })
            expect(rs).not.toBeNull()
            expect(rs).not.toBeInstanceOf(Error)
          }, 99999999)

          test('Get All Orders Data', async () => {
            const rs = await api.getAllOrders()(new Date('2022-06-15'), new Date('2022-06-30'), { retryTime: 0, searchOptions: { order_status: OrderStatus.COMPLETED } })
            expect(rs).not.toBeNull()
            expect(rs).not.toBeInstanceOf(Error)

            for await (const data of rs) {
              expect(data).not.toBeInstanceOf(Error)
            }
          }, 99999999)
        })
      })

      break

    case 'PROD':
      describe('Real Environment', () => {
        const userLoginInfo = {
          account: 'ngocdiepdecor',
          pass: 'Vanchinh120689@'
        }
        const api = new ShopeeApiV2({
          isReal: true,
          shopId: 80823886,
          partner_id: 845884,
          partner_key: '494171547251506b4c434a7a7848757958596b4f636c65686f596d7869566658',
          showMoreLog: false,
          redirect_uri: 'https://partner.shopeemobile.com/api/v1/orders/detail'
          // redirect_uri: 'https://webhook.site/29db2f39-2447-4b36-9f99-f92a615723fe'
        })
        test('Check base URL API', () => {
          expect(api.getBaseUrl()).toBe('https://partner.shopeemobile.com/api/v2')
        })

        describe('Get Access Token', () => {
          const newTimeout = 99999999
          const data = api.buildAuthURL()
          test('Authorize URL', () => {
            expect(data).toMatch(/https:\/\/partner\.shopeemobile\.com\/api\/v2.*/gm)
          })

          test('Login and get access_token', async () => {
            jest.setTimeout(newTimeout)
            const browser = await puppeteer.launch({
              headless: false
              // devtools: true
            })
            let accessToken : any = null

            try {
              const waitUntil : any = ['load', 'domcontentloaded', 'networkidle0', 'networkidle2']
              const page = await browser.newPage()
              await page.goto(data, {
                waitUntil
              })

              await page.waitForSelector('div.region-select-item > div > div')

              await page.evaluate((_) => {
                document?.querySelector('div.region-select-item > div > div')?.dispatchEvent(new Event('click'))
                document?.querySelector('div.region-select-item > div > ul > li:nth-child(3)')?.dispatchEvent(new Event('click'))
              })

              await page.type('div.form-content > div > div.username-item.form-item > div > div > input', userLoginInfo.account)
              await page.type('div.form-content > div > div.form-item.password-item > div.shopee-input.password-input > div > input', userLoginInfo.pass)

              await page.click('button.shopee-button.login-btn.shopee-button--primary.shopee-button--normal.shopee-button--block.login-btn-active')

              await page.waitForNavigation({ waitUntil })

              await page.click('div.btn-content > button')

              await page.waitForNavigation({ waitUntil })

              // eslint-disable-next-line n/no-deprecated-api
              const queryObject :any = url.parse(page.url(), true).query

              accessToken = await api.getAccessToken(queryObject.code)
            } catch (e) {
              console.log('🚀 ~ file: version2.test.ts ~ line 82 ~ test ~ e', e)
            }

            await browser.close()
            expect(accessToken).not.toBeNull()
            expect(accessToken.body).not.toBeNull()
            expect(accessToken.body.access_token).not.toBeNull()
          }, newTimeout)

          test('Refresh Token Data', async () => {
            const rs : any = await api.refreshAccessToken()
            expect(rs).not.toBeNull()
            expect(rs).not.toBeInstanceOf(Error)
            expect(rs.body).not.toBeNull()
          })
        })

        describe('Get Data', () => {
          test('ShopInfo', async () => {
            const rs = await api.getShopInfo()
            expect(rs).not.toBeNull()
          })

          test('Get Orders Data', async () => {
            const rs = await api.getOrders(new Date('2022-06-15'), new Date('2022-06-30'), { retryTime: 0, searchOptions: { order_status: OrderStatus.COMPLETED } })
            expect(rs).not.toBeNull()
            expect(rs).not.toBeInstanceOf(Error)
          }, 99999999)

          test('Get All Orders Data', async () => {
            const rs = await api.getAllOrders()(new Date('2022-06-15'), new Date('2022-06-30'), { retryTime: 0, searchOptions: { order_status: OrderStatus.COMPLETED } })
            expect(rs).not.toBeNull()
            expect(rs).not.toBeInstanceOf(Error)

            for await (const data of rs) {
              expect(data).not.toBeInstanceOf(Error)
            }
          }, 99999999)
        })
      })
      break

    default:
      break
  }
})
