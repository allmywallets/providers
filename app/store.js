import Vue from 'vue'
import Vuex from 'vuex'
import database from './database'
import Configurator from './configurator'
import NotificationManager from './notification-manager'

Vue.use(Vuex)

const state = {
  balances: [],
  config: { profiles: [{ wallets: [] }] },
  notifications: []
}

const getters = {
  wallets: state => state.config.profiles[0].wallets,
  balances: state => state.balances
}

const mutations = {
  INIT_APPLICATION (state, { config, balances }) {
    state.config = config
    state.balances = balances
  },
  ADD_WALLET (state, wallet) {
    state.config.profiles[0].wallets.push(wallet)
  },
  UPDATE_CONFIG (state, { config }) {
    state.config = config
  },
  RELOAD_BALANCES (state, { balances }) {
    balances.forEach(updatedBalance => {
      const index = state.balances.findIndex(balance => updatedBalance.equals(balance))

      if (index === -1) {
        state.balances.push(updatedBalance)
      } else {
        state.balances.splice(index, 1, updatedBalance)
      }
    })
  },
  ADD_NOTIFICATION (state, { notification }) {
    if (notification.level === 'ERROR') {
      console.error(notification)
    }

    state.notifications.unshift(notification)
  },
  CLEAR_NOTIFICATION (state, { notification }) {
    state.notifications.splice(state.notifications.indexOf(notification), 1)
  },
  CLEAR_ALL_NOTIFICATIONS (state) {
    state.notifications = []
  }
}

const actions = {
  initApplication: async ({ commit }, { serviceWorker }) => {
    const config = await Configurator.getConfig()
    const balances = await database.findAllBalances()

    const registration = await serviceWorker.getRegistration()

    if (registration) {
      const subscription = await registration.pushManager.getSubscription()

      if (subscription) {
        await NotificationManager.enablePushNotifications(serviceWorker)
      }
    }

    commit('INIT_APPLICATION', { config: config, balances })
  },
  addWallet: ({ commit }) => { // Todo
    commit('ADD_WALLET')
  },
  updateConfig: async ({ commit }, { config }) => {
    await Configurator.setConfig(config) // Todo: reset all balances and re-init app

    commit('UPDATE_CONFIG', { config: config })
  },
  reloadBalances: async ({ commit }, { balanceIds }) => {
    const balances = await database.findBalances(balanceIds)

    commit('RELOAD_BALANCES', { balances })
  },
  addNotification: ({ commit }, { notification }) => {
    commit('ADD_NOTIFICATION', { notification })
  },
  clearAllNotifications: ({ commit }) => {
    commit('CLEAR_ALL_NOTIFICATIONS')
  }
}

export default new Vuex.Store({ state, getters, mutations, actions })