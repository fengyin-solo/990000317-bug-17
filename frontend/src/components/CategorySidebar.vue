<template>
  <div class="category-sidebar">
    <el-card>
      <template #header>
        <div class="sidebar-header">
          <h3>分类</h3>
          <el-button text size="small" @click="showAddCategory">
            <el-icon><Plus /></el-icon>
          </el-button>
        </div>
      </template>

      <div class="category-list">
        <div
          class="category-item"
          :class="{ active: !linksStore.selectedCategory }"
          @click="linksStore.setCategory(null)"
        >
          <span class="category-name">全部链接</span>
          <span class="category-count">{{ linksStore.total }}</span>
        </div>

        <div
          v-for="cat in linksStore.categories"
          :key="cat.id"
          class="category-item"
          :class="{ active: linksStore.selectedCategory === cat.id }"
          @click="linksStore.setCategory(cat.id)"
        >
          <span class="category-color" :style="{ backgroundColor: cat.color }"></span>
          <span class="category-name">{{ cat.name }}</span>
          <span class="category-count">{{ cat.link_count }}</span>
          <el-dropdown trigger="click" @command="(cmd) => handleCategoryCommand(cmd, cat)" @click.stop>
            <el-button text size="small" class="category-more" @click.stop>
              <el-icon><MoreFilled /></el-icon>
            </el-button>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="edit">编辑</el-dropdown-item>
                <el-dropdown-item command="delete" divided>删除</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </div>
    </el-card>

    <el-dialog v-model="categoryDialogVisible" :title="editingCategory ? '编辑分类' : '添加分类'" width="360px">
      <el-form :model="categoryForm" label-width="60px">
        <el-form-item label="名称">
          <el-input v-model="categoryForm.name" placeholder="分类名称" />
        </el-form-item>
        <el-form-item label="颜色">
          <el-color-picker v-model="categoryForm.color" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="categoryDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="saveCategory">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { ElMessageBox, ElMessage } from 'element-plus'
import { useLinksStore } from '../stores/links'

const linksStore = useLinksStore()

const categoryDialogVisible = ref(false)
const editingCategory = ref(null)
const categoryForm = reactive({
  name: '',
  color: '#409EFF',
})

function showAddCategory() {
  editingCategory.value = null
  categoryForm.name = ''
  categoryForm.color = '#409EFF'
  categoryDialogVisible.value = true
}

function handleCategoryCommand(command, category) {
  if (command === 'edit') {
    editingCategory.value = category
    categoryForm.name = category.name
    categoryForm.color = category.color
    categoryDialogVisible.value = true
  } else if (command === 'delete') {
    handleDeleteCategory(category)
  }
}

async function saveCategory() {
  if (!categoryForm.name.trim()) {
    ElMessage.warning('请输入分类名称')
    return
  }

  try {
    if (editingCategory.value) {
      await linksStore.updateCategory(editingCategory.value.id, categoryForm)
      ElMessage.success('更新成功')
    } else {
      await linksStore.createCategory(categoryForm)
      ElMessage.success('创建成功')
    }
    categoryDialogVisible.value = false
  } catch (err) {
    ElMessage.error(err.response?.data?.error || '操作失败')
  }
}

async function handleDeleteCategory(category) {
  try {
    await ElMessageBox.confirm(`确定要删除分类 "${category.name}" 吗？该分类下的链接不会被删除。`, '确认删除', {
      type: 'warning',
    })
    await linksStore.deleteCategory(category.id)
    ElMessage.success('删除成功')
  } catch (err) {
    if (err !== 'cancel') {
      ElMessage.error(err.response?.data?.error || '删除失败')
    }
  }
}
</script>

<style scoped>
.category-sidebar {
  margin-bottom: 16px;
}

.sidebar-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.sidebar-header h3 {
  margin: 0;
  font-size: 15px;
}

.category-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.category-item {
  display: flex;
  align-items: center;
  padding: 8px 12px;
  border-radius: 6px;
  cursor: pointer;
  transition: background-color 0.2s;
  gap: 8px;
}

.category-item:hover {
  background-color: #f5f7fa;
}

.category-item.active {
  background-color: #ecf5ff;
  color: #409eff;
}

.category-color {
  width: 12px;
  height: 12px;
  border-radius: 3px;
  flex-shrink: 0;
}

.category-name {
  flex: 1;
  font-size: 14px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.category-count {
  font-size: 12px;
  color: #909399;
  background: #f0f2f5;
  padding: 2px 8px;
  border-radius: 10px;
}

.category-more {
  opacity: 0;
  transition: opacity 0.2s;
}

.category-item:hover .category-more {
  opacity: 1;
}
</style>
