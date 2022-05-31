import { defineStore } from 'pinia'
import { login, getUserByName, refreshToken, getGroup } from '@/api/users'
import { setToken, removeToken } from '@/utils/cookies'
import router, { resetRouter } from '@/router/'
import { usePermissionStore } from './permission'
import type { Role } from '@/api/types'
import type { RouteConfig } from 'vue-router'
import { useMessageStore } from './message'

const auth = import.meta.env.VITE_AUTH === 'true'

export const useUserStore = defineStore('user', {
  state: () => {
    const roles: Role[] = []
    return {
      name: localStorage.getItem('username') || '',
      id: parseInt(localStorage.getItem('id') || '-1'),
      email: '',
      token: auth ? localStorage.getItem('access') || '' : 'admin',
      roles,
    }
  },
  actions: {
    async login(userInfo: { username: string; password: string }) {
      let { username, password } = userInfo
      username = username.trim()
      const { data } = await login({ username, password })
      Object.entries({
        access: data.access,
        refresh: data.refresh,
        username: username,
      }).map(([k, v]: [string, string]) => localStorage.setItem(k, v))
      this.token = data.access
      this.name = username
      useMessageStore().$reset()
    },
    resetToken() {
      removeToken()
      this.token = ''
      this.roles = []
    },
    async getUserInfo() {
      // TODO(bao) 2020/06/01: complete user info profile in backend or re-orgnize
      if (this.token === '') {
        throw Error('getUserInfo: token is undefined!')
      }
      const { data: user } = await getUserByName(this.name)
      if (!user) {
        throw Error('Verification failed, please Login again.')
      }
      const { groups } = user
      // roles must be a non-empty array
      if (!groups || groups.length <= 0) {
        throw Error('getUserInfo: roles must be a non-null array!')
      }
      const roles: Role[] = []
      for (const id of groups) {
        roles.push((await getGroup(id)).data.name)
      }
      this.roles = roles
      const { id } = user
      this.id = id
    },
    async ChangeRoles(role: string) {
      const permissionStore = usePermissionStore()
      // Dynamically modify permissions
      const token = role + '-token'
      this.token = token
      setToken(token)
      await this.getUserInfo()
      resetRouter()
      // Generate dynamic accessible routes based on roles
      permissionStore.generateRoutes(this.roles)
      // Add generated routes
      permissionStore.dynamicRoutes.forEach((route) =>
        router.addRoute(route as RouteConfig)
      )
    },
    async logOut() {
      ;['access', 'refresh', 'username'].forEach((k) =>
        localStorage.removeItem(k)
      )
      resetRouter()
      this.token = ''
      this.roles = []
      return Promise.resolve('Logout')
    },
    async refreshToken() {
      localStorage.removeItem('access')
      this.token = ''
      const response = await refreshToken({
        refresh: localStorage.getItem('refresh'),
      })
      localStorage.setItem('access', response.data.access)
      this.token = response.data.access
      return response
    },
    setNoAuthUserInfo() {
      if (auth) {
        throw new Error('should not invoke this method!')
      }
      this.name = 'no-auth-admin'
      this.roles = ['developer']
    },
  },
})
