<template>
  <el-menu mode="horizontal" :ellipsis="false" class="navbar">
    <el-menu-item index="home" @click="goHome">
      <el-icon><Link /></el-icon>
      <span class="logo-text">Link Collector</span>
    </el-menu-item>

    <div class="flex-grow"></div>

    <!-- 已登录：入口按当前使用者的权限渲染 -->
    <template v-if="authStore.isLoggedIn">
      <el-tooltip
        :disabled="authStore.canWrite"
        content="当前账号为只读权限，仅可查看，无法导入书签"
        placement="bottom"
      >
        <span class="menu-item-wrapper">
          <el-menu-item index="import" :disabled="!authStore.canWrite" @click="go('/import')">
            <el-icon><Upload /></el-icon>
            导入书签
            <el-tag v-if="!authStore.canWrite" type="info" size="small" class="readonly-tag">只读</el-tag>
          </el-menu-item>
        </span>
      </el-tooltip>

      <el-menu-item index="dead-links" @click="go('/dead-links')">
        <el-icon><Warning /></el-icon>
        死链检测
      </el-menu-item>

      <el-menu-item index="read-later" @click="go('/read-later')">
        <el-icon><Clock /></el-icon>
        稍后阅读
      </el-menu-item>

      <el-sub-menu index="user">
        <template #title>
          <el-icon><User /></el-icon>
          {{ authStore.user?.username }}
          <el-tag v-if="authStore.isReadOnly" type="info" size="small" class="readonly-tag">只读</el-tag>
        </template>
        <el-menu-item v-if="authStore.isReadOnly" index="readonly-hint" disabled>
          <el-icon><View /></el-icon>
          只读账号：仅可查看，不能改动
        </el-menu-item>
        <el-menu-item index="logout" @click="handleLogout">
          <el-icon><SwitchButton /></el-icon>
          退出登录
        </el-menu-item>
      </el-sub-menu>
    </template>

    <!-- 未登录 -->
    <template v-else>
      <el-menu-item index="login" @click="go('/login')">
        <el-icon><User /></el-icon>
        登录
      </el-menu-item>
      <el-menu-item index="register" @click="go('/register')">
        <el-icon><EditPen /></el-icon>
        注册
      </el-menu-item>
    </template>
  </el-menu>
</template>

<script setup>
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { ElMessage } from 'element-plus'

const router = useRouter()
const authStore = useAuthStore()

function go(path) {
  router.push(path)
}

function goHome() {
  router.push(authStore.isLoggedIn ? '/' : '/login')
}

function handleLogout() {
  authStore.logout()
  ElMessage.success('已退出登录')
  router.push('/login')
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

.menu-item-wrapper {
  display: flex;
  align-items: center;
}

.readonly-tag {
  margin-left: 6px;
}
</style>
