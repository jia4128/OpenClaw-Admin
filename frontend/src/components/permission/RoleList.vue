<template>
  <div class="role-list">
    <div class="role-header">
      <h3>角色管理</h3>
      <n-button type="primary" @click="handleCreateRole" size="small">
        新建角色
      </n-button>
    </div>

    <n-table :data="roles" :bordered="false" :single-line="false">
      <template #header>
        <n-thing v-for="role in roles" :key="role.id" class="role-item">
          <template #header>
            <div class="role-info">
              <n-tag :type="getRoleType(role.name)" size="large">
                {{ role.name }}
              </n-tag>
              <span class="role-description">{{ role.description }}</span>
            </div>
          </template>
          <template #description>
            <div class="role-permissions">
              <span class="permission-label">权限：</span>
              <n-tag
                v-for="perm in role.permissions"
                :key="perm"
                size="small"
                type="info"
              >
                {{ perm }}
              </n-tag>
            </div>
            <div class="role-stats">
              <span class="stat">用户数：{{ role.userCount }}</span>
              <span class="stat">创建时间：{{ formatDate(role.createdAt) }}</span>
            </div>
          </template>
          <template #extra>
            <n-space>
              <n-button size="small" @click="handleEditRole(role)">
                编辑
              </n-button>
              <n-button
                size="small"
                type="error"
                :disabled="role.name === 'admin'"
                @click="handleDeleteRole(role)"
              >
                删除
              </n-button>
            </n-space>
          </template>
        </n-thing>
      </template>
    </n-table>

    <!-- 角色编辑弹窗 -->
    <n-modal
      v-model:show="showModal"
      preset="card"
      :title="isEditing ? '编辑角色' : '新建角色'"
      style="width: 600px"
    >
      <n-form ref="formRef" :model="formData" :rules="rules">
        <n-form-item label="角色名称" path="name">
          <n-input v-model:value="formData.name" placeholder="请输入角色名称" />
        </n-form-item>
        <n-form-item label="角色描述" path="description">
          <n-input
            v-model:value="formData.description"
            type="textarea"
            placeholder="请输入角色描述"
          />
        </n-form-item>
        <n-form-item label="权限配置" path="permissions">
          <n-checkbox-group v-model:value="formData.permissions">
            <n-space vertical>
              <n-checkbox value="read" label="读取权限" />
              <n-checkbox value="write" label="写入权限" />
              <n-checkbox value="delete" label="删除权限" />
              <n-checkbox value="admin" label="管理权限" />
              <n-checkbox value="system" label="系统权限" />
            </n-space>
          </n-checkbox-group>
        </n-form-item>
      </n-form>
      <template #footer>
        <n-space justify="end">
          <n-button @click="showModal = false">取消</n-button>
          <n-button type="primary" @click="handleSubmit">确定</n-button>
        </n-space>
      </template>
    </n-modal>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import { NTable, NThing, NTag, NButton, NSpace, NModal, NForm, NFormItem, NInput, NCheckbox, NCheckboxGroup, useMessage, useDialog } from 'naive-ui'

interface Role {
  id: string
  name: string
  description: string
  permissions: string[]
  userCount: number
  createdAt: string
}

const props = withDefaults(defineProps<{
  roles?: Role[]
}>(), {
  roles: () => [
    {
      id: '1',
      name: 'admin',
      description: '系统管理员，拥有所有权限',
      permissions: ['read', 'write', 'delete', 'admin', 'system'],
      userCount: 3,
      createdAt: '2026-04-01'
    },
    {
      id: '2',
      name: 'operator',
      description: '操作员，拥有常规操作权限',
      permissions: ['read', 'write'],
      userCount: 12,
      createdAt: '2026-04-02'
    },
    {
      id: '3',
      name: 'readonly',
      description: '只读用户，仅可查看数据',
      permissions: ['read'],
      userCount: 25,
      createdAt: '2026-04-03'
    }
  ]
})

const emit = defineEmits<{
  (e: 'create', role: Partial<Role>): void
  (e: 'update', role: Role): void
  (e: 'delete', roleId: string): void
}>()

const message = useMessage()
const dialog = useDialog()

const showModal = ref(false)
const isEditing = ref(false)
const formRef = ref()

const formData = reactive({
  id: '',
  name: '',
  description: '',
  permissions: [] as string[]
})

const rules = {
  name: { required: true, message: '请输入角色名称', trigger: 'blur' },
  description: { required: true, message: '请输入角色描述', trigger: 'blur' },
  permissions: { required: true, message: '请至少选择一个权限', trigger: 'change' }
}

const getRoleType = (name: string) => {
  const typeMap: Record<string, 'success' | 'warning' | 'default'> = {
    admin: 'success',
    operator: 'warning',
    readonly: 'default'
  }
  return typeMap[name] || 'default'
}

const formatDate = (date: string) => {
  return new Date(date).toLocaleDateString('zh-CN')
}

const handleCreateRole = () => {
  isEditing.value = false
  formData.id = ''
  formData.name = ''
  formData.description = ''
  formData.permissions = []
  showModal.value = true
}

const handleEditRole = (role: Role) => {
  isEditing.value = true
  formData.id = role.id
  formData.name = role.name
  formData.description = role.description
  formData.permissions = [...role.permissions]
  showModal.value = true
}

const handleDeleteRole = (role: Role) => {
  dialog.warning({
    title: '删除角色',
    content: `确定要删除角色 "${role.name}" 吗？此操作不可逆。`,
    positiveText: '删除',
    negativeText: '取消',
    onPositiveClick: () => {
      emit('delete', role.id)
      message.success('角色已删除')
    }
  })
}

const handleSubmit = () => {
  formRef.value?.validate((errors: any) => {
    if (!errors) {
      if (isEditing.value) {
        emit('update', {
          ...formData,
          userCount: props.roles.find(r => r.id === formData.id)?.userCount || 0,
          createdAt: props.roles.find(r => r.id === formData.id)?.createdAt || ''
        } as Role)
        message.success('角色已更新')
      } else {
        emit('create', formData)
        message.success('角色已创建')
      }
      showModal.value = false
    }
  })
}
</script>

<style scoped>
.role-list {
  padding: 20px;
}

.role-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.role-header h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
}

.role-item {
  padding: 16px;
  border-bottom: 1px solid #f0f0f0;
}

.role-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.role-description {
  color: #666;
  font-size: 14px;
}

.role-permissions {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 8px;
}

.permission-label {
  color: #999;
  font-size: 13px;
}

.role-stats {
  display: flex;
  gap: 20px;
  margin-top: 8px;
  font-size: 13px;
  color: #999;
}

.stat {
  color: #999;
}
</style>
