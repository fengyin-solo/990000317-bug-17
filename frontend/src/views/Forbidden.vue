<template>
  <div class="forbidden-container">
    <el-result icon="warning" title="权限不足" :sub-title="message">
      <template #extra>
        <el-button type="primary" @click="$router.push('/')">返回首页</el-button>
      </template>
    </el-result>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useAuthStore } from '../stores/auth'

const authStore = useAuthStore()

const message = computed(() =>
  authStore.isReadOnly
    ? '当前账号为只读账号，仅可查看链接，不能进行导入或修改操作。'
    : '当前账号无权访问该页面。'
)
</script>

<style scoped>
.forbidden-container {
  min-height: 60vh;
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
