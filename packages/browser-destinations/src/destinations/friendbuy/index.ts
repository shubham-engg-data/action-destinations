import type { BrowserDestinationDefinition } from '../../lib/browser-destinations'
import type { DestinationDefinition } from '@segment/actions-core'
import { browserDestination } from '../../runtime/shim'
import { defaultValues } from '@segment/actions-core'

import type { Settings } from './generated-types'
import type { FriendbuyAPI } from './types'
import trackCustomer, { trackCustomerDefaultSubscription, trackCustomerFields } from './trackCustomer'
import trackPurchase, { trackPurchaseDefaultSubscription, trackPurchaseFields } from './trackPurchase'
import trackSignUp, { trackSignUpDefaultSubscription, trackSignUpFields } from './trackSignUp'
import trackPage, { trackPageDefaultSubscription, trackPageFields } from './trackPage'
import trackCustomEvent from './trackCustomEvent'

declare global {
  interface Window {
    friendbuyAPI?: FriendbuyAPI
    friendbuyBaseHost?: string
  }
}

// Presets are shown in Segment configuration flow as "Pre-Built Subscriptions".
const presets: DestinationDefinition['presets'] = [
  {
    name: 'Track Customer',
    subscribe: trackCustomerDefaultSubscription,
    partnerAction: 'trackCustomer',
    mapping: defaultValues(trackCustomerFields)
  },
  {
    name: 'Track Purchase',
    subscribe: trackPurchaseDefaultSubscription,
    partnerAction: 'trackPurchase',
    mapping: defaultValues(trackPurchaseFields)
  },
  {
    name: 'Track Sign Up',
    subscribe: trackSignUpDefaultSubscription,
    partnerAction: 'trackSignUp',
    mapping: defaultValues(trackSignUpFields)
  },
  {
    name: 'Track Page',
    subscribe: trackPageDefaultSubscription,
    partnerAction: 'trackPage',
    mapping: defaultValues(trackPageFields)
  }
]

export const destination: BrowserDestinationDefinition<Settings, FriendbuyAPI> = {
  name: 'Friendbuy Web Device Mode (Actions)',
  slug: 'actions-friendbuy-web',
  mode: 'device',

  settings: {
    merchantId: {
      label: 'Friendbuy Merchant ID',
      description:
        'Find your Friendbuy Merchant ID by logging in to your [Friendbuy account](https://retailer.friendbuy.io/) and going to Developer Center > Friendbuy Code.',
      type: 'string',
      format: 'uuid',
      required: true
    }
  },

  initialize: async ({ settings /* , analytics */ }, dependencies) => {
    let friendbuyAPI: FriendbuyAPI
    window.friendbuyAPI = friendbuyAPI = window.friendbuyAPI || ([] as unknown as FriendbuyAPI)
    const friendbuyBaseHost = window.friendbuyBaseHost ?? 'fbot.me'

    friendbuyAPI.merchantId = settings.merchantId
    friendbuyAPI.push(['merchant', settings.merchantId])

    // The Friendbuy JavaScript can be loaded asynchronously.
    void dependencies.loadScript(`https://static.${friendbuyBaseHost}/friendbuy.js`),
      void dependencies.loadScript(`https://campaign.${friendbuyBaseHost}/${settings.merchantId}/campaigns.js`)

    return friendbuyAPI
  },

  presets,
  actions: {
    trackCustomer,
    trackPurchase,
    trackSignUp,
    trackPage,
    trackCustomEvent
  }
}

export default browserDestination(destination)
