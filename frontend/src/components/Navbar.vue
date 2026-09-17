<template>
  <el-menu
    mode="horizontal"
    :ellipsis="false"
    class="navbar"
    :default-active="activeIndex"
    @select="handleSelect"
  >
    <el-menu-item index="/">
      <el-icon><Link /></el-icon>
      <span class="logo-text">Link Collector</span>
    </el-menu-item>

    <div class="flex-grow"></div>

    <template v-if="authStore.isLoggedIn">
      <!-- Importing writes data: owner only; hidden entirely for read-only users -->
      <el-menu-item v-if="canWrite" index="/import">
        <el-icon><Upload /></el-icon>
        导入书签
      </el-menu-item>

      <!-- Read pages available to everyone; read-only accounts are labeled -->
      <el-menu-item index="/dead-links">
        <el-icon><Warning /></el-icon>
        死链检测
        <el-tag
          v-if="!canWrite"
          size="small"
          type="info"
          effect="plain"
          class="perm-tag"
        >只读</el-tag>
      </el-menu-item>

      <el-menu-item index="/read-later">
        <el-icon><Clock /></el-icon>
        稍后阅读
        <el-tag
          v-if="!canWrite"
          size="small"
          type="info"
          effect="plain"
          class="perm-tag"
        >只读</el-tag>
      </el-menu-item>

      <el-sub-menu index="user">
        <template #title>
          <el-icon><User /></el-icon>
          <span class="username">{{ authStore.user?.username }}</span>
          <el-tag v-if="!canWrite" size="small" type="info" effect="plain" class="perm-tag">
            只读
          </el-tag>
        </template>
        <el-menu-item index="role-info" disabled>
          <el-icon><Lock /></el-icon>
          {{ canWrite ? '可管理账号（可读写）' : '只读账号（仅可查看）' }}
        </el-menu-item>
        <el-menu-item index="logout">
          <el-icon><SwitchButton /></el-icon>
          退出登录
        </el-menu-item>
      </el-sub-menu>
    </template>

    <template v-else>
      <el-menu-item index="/login">
        <el-icon><User /></el-icon>
        登录
      </el-menu-item>
      <el-menu-item index="/register">
        <el-icon><EditPen /></el-icon>
        注册
      </el-menu-item>
    </template>
  </el-menu>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { ElMessage } from 'element-plus'
import { useLinksStore } from '../stores/links'
import { useReadLaterStore } from '../stores/readLater'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const linksStore = useLinksStore()
const readLaterStore = useReadLaterStore()

// Permissions are recomputed from the current user on every render,
// including after refresh and after switching accounts.
const canWrite = computed(() => !authStore.isReadOnly)
const activeIndex = computed(() => route.path)

function handleSelect(index) {
  if (index === 'logout') {
    handleLogout()
  } else if (index.startsWith('/') && index !== route.path) {
    router.push(index)
  }
}

async function handleLogout() {
  // Drop cached page data first so the next account can never see content
  // left over from the previous one.
  linksStore.reset()
  readLaterStore.reset()
  authStore.logout()
  ElMessage.success('已退出登录')
  await router.push('/login')
}
</script>

<style scoped>
.navbar {
  margin-bottom: 0;
  border-bottom: 1px solid #e4e7ed;
}

.logo-text {
  font-weight: 600;
  font-size: 16px;
  margin-left: 6px;
}

.flex-grow {
  flex: 1;
}

.username {
  max-width: 140px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.perm-tag {
  margin-left: 6px;
}
</style>
