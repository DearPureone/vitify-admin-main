export {}

import 'vue-router'
import type { Role } from '@/api/types'

declare module 'vue-router' {
  interface RouteMeta {
    icon?: string // drawer item icon
    drawerGroup?: 'admin' | 'PUC' // groups will be separated by divider line
    title?: string // drawer item text
    subtitle?: string
    roles?: Role[] // authorized user groups
    dataCy?: string // for cypress location
    hidden?: boolean // hide this route if True
    breadcrumb?: 'hidden' | 'disabled'
  }
}
