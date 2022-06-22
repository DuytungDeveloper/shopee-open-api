/* eslint-disable no-undef */
/* eslint-disable no-unused-vars */
import { isNativeError } from 'util/types'
import { ErrorMessage } from '@utils/contains'
import { ShopeeApiV2 } from '@app/versions/version2'
import puppeteer from 'puppeteer'
import url from 'url'
jest.useRealTimers()
describe('Shopee V2 Account VN', () => {
  describe('Real Environment', () => {
    const api = new ShopeeApiV2({
      isReal: true,
      shopId: 80823886,
      partner_id: 1006066,
      partner_key: '0bda23006319db246fcf2c3323f18e25e0fed7e6a1b7590e7ab61666e38f7784',
      showMoreLog: false
    })
    test('Check base URL API', () => {
      expect(api.getBaseUrl()).toBe('https://partner.shopeemobile.com/api/v2')
    })
  })

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
      // tokenData: {
      //   refresh_token: '6d5a736b5a6378556b7351696d476c4a',
      //   access_token: '6a6449525a746e774c4651474f455572',
      //   expire_in: 14329,
      //   expire_date: new Date()
      // }
    })
    test('Check base URL', () => {
      expect(api.getBaseUrl(false)).toBe('https://partner.test-stable.shopeemobile.com')
    })
    test('Check base URL API', () => {
      expect(api.getBaseUrl()).toBe('https://partner.test-stable.shopeemobile.com/api/v2')
    })

    // test('Get Shop Info', async () => {
    //   const data = await api.getShopInfo()
    //   expect(data.success).toBe(true)
    //   expect(data.data).not.toBe(null)
    //   expect(data.data.region).toBe('VN')
    // })

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

          console.log(page.url())

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
    })

    describe('Get ShopInfo', () => {
      test('Login and get access_token', async () => {
        const rs = await await api.getShopInfo()
        console.log('🚀 ~ file: version2.test.ts ~ line 117 ~ test ~ rs', rs)
        expect(rs).not.toBeNull()
      })
    })
  })
})
