import { Analytics, Context, JSONValue } from '@segment/analytics-next'
import friendbuyDestination from '../../index'
import trackPurchaseObject, { trackPurchaseDefaultSubscription, trackPurchaseFields } from '../index'

import { loadScript } from '../../../../runtime/load-script'
jest.mock('../../../../runtime/load-script')
beforeEach(async () => {
  // Prevent friendbuy.js and campaigns.js from being loaded.
  ;(loadScript as jest.Mock).mockResolvedValue(true)
})

describe('Friendbuy.trackPurchase', () => {
  const subscriptions = [
    {
      partnerAction: 'trackPurchase',
      name: trackPurchaseObject.title,
      enabled: true,
      subscribe: trackPurchaseDefaultSubscription,
      mapping: Object.fromEntries(Object.entries(trackPurchaseFields).map(([name, value]) => [name, value.default]))
    }
  ]

  test('all fields', async () => {
    const orderId = 'my order'
    const products = [
      { sku: 'sku1', name: 'shorts', price: 19.99, quantity: 2 },
      { price: 5.99 },
      {
        sku: 'sku3',
        name: 'tshirt',
        price: 24.99,
        description: 'Black T-Shirt',
        category: 'shirts',
        url: 'https://example.com/sku3',
        image_url: 'https://example.com/sku3/image.jpg'
      }
    ]

    const merchantId = '1993d0f1-8206-4336-8c88-64e170f2419e'
    const userId = 'john-doe-12345'
    const anonymousId = 'cbce64f6-a45a-4d9c-a63d-4c7b42773276'
    const currency = 'USD'
    const coupon = 'coupon-xyzzy'
    const giftCardCodes = ['card-a', 'card-b']
    const friendbuyAttributes = { referralCode: 'ref-plugh' }
    const email = 'john.doe@example.com'
    const name = 'John Doe'

    const [trackPurchase] = await friendbuyDestination({
      merchantId,
      subscriptions
    })
    // console.log('trackPurchase', JSON.stringify(trackPurchase, null, 2), trackPurchase)
    expect(trackPurchase).toBeDefined()

    await trackPurchase.load(Context.system(), {} as Analytics)

    // console.log(window.friendbuyAPI)
    jest.spyOn(window.friendbuyAPI as any, 'push')

    const expectedProducts = products.map((p) => {
      p = { quantity: 1, ...p }
      if (p.image_url) {
        p.imageUrl = p.image_url;
        delete p.image_url;
      }
      return p;
    })
    const amount = expectedProducts.reduce((acc, p) => acc + p.price * p.quantity, 0)

    {
      // all fields
      const context1 = new Context({
        type: 'track',
        event: 'Order Completed',
        userId,
        anonymousId,
        properties: {
          order_id: orderId,
          revenue: amount,
          subtotal: amount + 1,
          total: amount + 2,
          currency,
          coupon,
          giftCardCodes,
          products: products as JSONValue,
          email,
          name,
          friendbuyAttributes
        }
      })
      // console.log('context1', JSON.stringify(context1, null, 2))

      trackPurchase.track?.(context1)

      // console.log('trackPurchase request', JSON.stringify(window.friendbuyAPI.push.mock.calls[0], null, 2))
      expect(window.friendbuyAPI?.push).toHaveBeenNthCalledWith(1, [
        'track',
        'purchase',
        {
          id: orderId,
          amount: amount + 2, // amount defaults to total
          currency,
          couponCode: coupon,
          giftCardCodes,
          customer: { id: userId, anonymousId, email, name },
          products: expectedProducts,
          ...friendbuyAttributes
        },
        true
      ])
      expect(window.friendbuyAPI.push.mock.calls[0][0][2].products[1].quantity).toBe(1);
      expect(window.friendbuyAPI.push.mock.calls[0][0][2].products[2].imageUrl).toBe(products[2].image_url);
    }

    {
      // minimal event
      const context2 = new Context({
        type: 'track',
        event: 'Order Completed',
        properties: {
          order_id: orderId,
          total: amount,
          currency
        }
      })

      trackPurchase.track?.(context2)

      expect(window.friendbuyAPI?.push).toHaveBeenNthCalledWith(2, [
        'track',
        'purchase',
        {
          id: orderId,
          amount,
          currency
        },
        true
      ])
    }

    {
      // customer is dropped if no userId/customerId
      // giftCardCodes is dropped if list is empty
      const context3 = new Context({
        type: 'track',
        event: 'Order Completed',
        properties: {
          order_id: orderId,
          total: amount,
          currency,
          giftCardCodes: [],
          email,
          name
        }
      })

      trackPurchase.track?.(context3)

      expect(window.friendbuyAPI?.push).toHaveBeenNthCalledWith(3, [
        'track',
        'purchase',
        {
          id: orderId,
          amount,
          currency
        },
        true
      ])
    }
  })
})
