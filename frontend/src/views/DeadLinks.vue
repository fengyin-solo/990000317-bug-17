<template>
  <div class="dead-links-container">
    <el-card>
      <template #header>
        <div class="card-header">
          <el-button @click="$router.push('/')" text>
            <el-icon><ArrowLeft /></el-icon>
            返回
          </el-button>
          <h2>死链检测</h2>
          <el-tooltip
            :disabled="authStore.canWrite"
            content="当前账号为只读权限，无法执行检测"
            placement="top"
          >
            <span>
              <el-button type="primary" :loading="checking" :disabled="!authStore.canWrite" @click="handleCheckAll">
                <el-icon><Refresh /></el-icon>
                检测所有链接
              </el-button>
            </span>
          </el-tooltip>
        </div>
      </template>

      <div v-if="checking" class="checking-progress">
        <el-icon class="is-loading" :size="24"><Loading /></el-icon>
        <p>正在检测链接，请稍候...</p>
        <el-progress :percentage="progress" :status="progress === 100 ? 'success' : ''" />
      </div>

      <el-result
        v-if="checkResult && !checking"
        icon="info"
        :title="checkResult.message"
        :sub-title="`共检测 ${checkResult.total} 个链接，${checkResult.alive} 个正常，${checkResult.dead} 个失效`"
      />

      <div v-if="deadLinks.length > 0" class="dead-links-list">
        <h3>失效链接列表</h3>
        <el-table :data="deadLinks" stripe>
          <el-table-column prop="title" label="标题" min-width="150" />
          <el-table-column prop="url" label="URL" min-width="250">
            <template #default="{ row }">
              <a :href="row.url" target="_blank" class="url-link">{{ row.url }}</a>
            </template>
          </el-table-column>
          <el-table-column prop="category_name" label="分类" width="120">
            <template #default="{ row }">
              <el-tag v-if="row.category_name" :color="row.category_color" effect="dark" size="small">
                {{ row.category_name }}
              </el-tag>
              <span v-else class="no-category">未分类</span>
            </template>
          </el-table-column>
          <el-table-column prop="last_checked" label="检测时间" width="180">
            <template #default="{ row }">
              {{ formatDate(row.last_checked) }}
            </template>
          </el-table-column>
          <el-table-column label="操作" width="100">
            <template #default="{ row }">
              <el-button type="danger" size="small" @click="handleDelete(row)">删除</el-button>
            </template>
          </el-table-column>
        </el-table>
      </div>

      <el-empty v-if="!checking && deadLinks.length === 0 && checkResult" description="没有失效的链接" />

      <el-empty v-if="!checking && !checkResult" description="点击上方按钮开始检测链接" />
    </el-card>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { ElMessageBox, ElMessage } from 'element-plus'
import { healthCheckApi, linksApi } from '../api'
import { useAuthStore } from '../stores/auth'

const authStore = useAuthStore()

const checking = ref(false)
const progress = ref(0)
const checkResult = ref(null)
const deadLinks = ref([])

onMounted(() => {
  fetchDeadLinks()
})

async function fetchDeadLinks() {
  try {
    const response = await healthCheckApi.getDeadLinks()
    deadLinks.value = response.data
  } catch (err) {
    console.error('Failed to fetch dead links:', err)
  }
}

async function handleCheckAll() {
  checking.value = true
  progress.value = 10

  try {
    const response = await healthCheckApi.checkAll()
    checkResult.value = response.data
    progress.value = 100
    await fetchDeadLinks()
    ElMessage.success('检测完成')
  } catch (err) {
    ElMessage.error(err.response?.data?.error || '检测失败，请重试')
  } finally {
    checking.value = false
  }
}

async function handleDelete(link) {
  try {
    await ElMessageBox.confirm(`确定要删除 "${link.title}" 吗？`, '确认删除', {
      type: 'warning',
    })
    await linksApi.deleteLink(link.id)
    await fetchDeadLinks()
    ElMessage.success('删除成功')
  } catch (err) {
    if (err !== 'cancel') {
      ElMessage.error(err.response?.data?.error || '删除失败')
    }
  }
}

function formatDate(dateStr) {
  if (!dateStr) return '-'
  const date = new Date(dateStr)
  return date.toLocaleString('zh-CN')
}
</script>

<style scoped>
.dead-links-container {
  max-width: 1100px;
  margin: 40px auto;
  padding: 0 20px;
}

.card-header {
  display: flex;
  align-items: center;
  gap: 12px;
}

.card-header h2 {
  margin: 0;
  flex: 1;
}

.checking-progress {
  text-align: center;
  padding: 40px 0;
}

.checking-progress p {
  margin: 16px 0;
  color: #606266;
}

.checking-progress .el-progress {
  max-width: 400px;
  margin: 0 auto;
}

.dead-links-list {
  margin-top: 24px;
}

.dead-links-list h3 {
  margin: 0 0 16px 0;
  color: #303133;
}

.url-link {
  color: #409eff;
  text-decoration: none;
  word-break: break-all;
  font-size: 13px;
}

.url-link:hover {
  text-decoration: underline;
}

.no-category {
  color: #909399;
  font-size: 13px;
}
</style>
