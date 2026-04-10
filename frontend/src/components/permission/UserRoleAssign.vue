<template>
  <div class="user-role-assign">
    <div class="assign-header">
      <h3>用户角色分配</h3>
      <n-input
        v-model:value="searchKeyword"
        placeholder="搜索用户名..."
        :clearable="true"
        style="width: 250px"
      >
        <template #prefix>
          <n-icon :component="Search" />
        </template>
      </n-input>
    </div>

    <n-table :data="filteredUsers" :bordered="false" :single-line="false">
      <thead>
        <tr>
          <th>用户</th>
          <th>当前角色</th>
          <th>角色变更</th>
          <th>操作</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="user in filteredUsers" :key="user.id">
          <td>
            <div class="user-info">
              <n-avatar :src="user.avatar" size="small" />
              <span>{{ user.name }}</span>
            </div>
          </td>
          <td>
            <n-tag :type="getRoleType(user.role)" size="small">
              {{ getRoleLabel(user.role) }}
            </n-tag>
          </td>
          <td>
            <n-select
              v-model:value="userTempRoles[user.id]"
              :options="roleOptions"
              placeholder="选择角色"
              size="small"
              @update:value="(val) => handleRoleChange(user, val)"
            />
          </td>
          <td>
            <n-space>
              <n-button
                size="small"
                type="primary"
                @click="handleSaveRole(user)"
                :disabled="!userTempRoles[user.id]"
              >
                保存
              </n-button>
              <n-button
                size="small"
                @click="handleCancelChange(user)"
                :disabled="!userTempRoles[user.id]"
              >
                取消
              </n-button>
            </n-space>
          </td>
        </tr>
      </tbody>
    </n-table>

    <n-pagination
      v-model:page="currentPage"
      v-model:page-size="pageSize"
      :item-count="users.length"
      :page-sizes="[10, 20, 50]"
      show-size-picker
      show-quick-jumper
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, reactive } from 'vue'
import { NTable, NInput, NAvatar, NTag, NSelect, NSpace, NButton, NPagination, NIcon, useMessage } from 'naive-ui'
import { Search } from '@vicons/ionicons5'

interface User {
  id: string
  name: string
  email: string
  role: 'admin' | 'operator' | 'readonly'
  avatar?: string
  department?: string
}

type Role = 'admin' | 'operator' | 'readonly'

const props = withDefaults(defineProps<{
  users?: User[]
  roles?: Array<{ value: Role; label: string }>
}>(), {
  users: () => [
    { id: '1', name: '张三', email: 'zhangsan@example.com', role: 'admin', avatar: '', department: '技术部' },
    { id: '2', name: '李四', email: 'lisi@example.com', role: 'operator', avatar: '', department: '产品部' },
    { id: '3', name: '王五', email: 'wangwu@example.com', role: 'readonly', avatar: '', department: '市场部' },
    { id: '4', name: '赵六', email: 'zhaoliu@example.com', role: 'operator', avatar: '', department: '技术部' },
    { id: '5', name: '钱七', email: 'qianqi@example.com', role: 'readonly', avatar: '', department: '运营部' }
  ],
  roles: () => [
    { value: 'admin', label: '管理员' },
    { value: 'operator', label: '操作员' },
    { value: 'readonly', label: '只读用户' }
  ]
})

const emit = defineEmits<{
  (e: 'role-change', userId: string, newRole: Role): void
}>()

const message = useMessage()

const searchKeyword = ref('')
const currentPage = ref(1)
const pageSize = ref(10)
const userTempRoles = reactive<Record<string, Role>>({})

const filteredUsers = computed(() => {
  if (!searchKeyword.value) return props.users
  return props.users.filter(user =>
    user.name.toLowerCase().includes(searchKeyword.value.toLowerCase()) ||
    user.email.toLowerCase().includes(searchKeyword.value.toLowerCase())
  )
})

const getRoleType = (role: Role) => {
  const typeMap: Record<Role, 'success' | 'warning' | 'default'> = {
    admin: 'success',
    operator: 'warning',
    readonly: 'default'
  }
  return typeMap[role] || 'default'
}

const getRoleLabel = (role: Role) => {
  const labelMap: Record<Role, string> = {
    admin: '管理员',
    operator: '操作员',
    readonly: '只读用户'
  }
  return labelMap[role] || role
}

const handleRoleChange = (user: User, newRole: Role | null) => {
  if (newRole) {
    userTempRoles[user.id] = newRole
  }
}

const handleSaveRole = (user: User) => {
  const newRole = userTempRoles[user.id]
  if (newRole && newRole !== user.role) {
    emit('role-change', user.id, newRole)
    message.success(`用户 ${user.name} 的角色已更新为 ${getRoleLabel(newRole)}`)
    delete userTempRoles[user.id]
  }
}

const handleCancelChange = (user: User) => {
  delete userTempRoles[user.id]
}
</script>

<style scoped>
.user-role-assign {
  padding: 20px;
}

.assign-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.assign-header h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 10px;
}

.user-info span {
  font-size: 14px;
}
</style>
